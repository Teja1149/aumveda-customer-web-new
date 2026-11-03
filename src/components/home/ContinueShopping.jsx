
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  Clock3,
  ImageOff,
  PackageCheck,
  ShoppingBag,
  Star,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";

import { useAuth } from "../../context/AuthContext";

import {
  getRecentlyViewedProducts,
  getProductBySlug,
  getProducts,
} from "../../services/productService";

import {
  getCustomerOrders,
  getCustomerOrderDetails,
} from "../../services/orderService";

import "../../styles/continue-shopping.css";

/* ============================================================
   AUMVEDA — CONTINUE YOUR WELLNESS JOURNEY

   CUSTOMER WEB HOMEPAGE

   FEATURES:
   - Recently Viewed
   - Buy Again
   - Previous-login filtering
   - Customer-specific history
   - Current product images
   - Current product prices
   - Previously purchased variant matching
   - Stock availability
   - Responsive existing CSS
   - Existing checkout flow preserved

   NO CHANGES REQUIRED TO:
   - Backend
   - Supabase tables
   - Product Details
   - CSS
============================================================ */

const MAX_RECENT = 8;
const MAX_BUY_AGAIN = 8;
const MAX_ORDERS_TO_CHECK = 12;

/* ============================================================
   PRICE FORMATTER
============================================================ */

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Price unavailable";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? priceFormatter.format(amount)
    : "Price unavailable";
}

/* ============================================================
   DATE HELPERS
============================================================ */

function getTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

function wasBeforeLogin(value, loginTimestamp) {
  const timestamp = getTimestamp(value);

  return (
    timestamp !== null &&
    loginTimestamp !== null &&
    timestamp < loginTimestamp
  );
}

/* ============================================================
   API RESPONSE NORMALIZATION

   Handles:
   - Raw API product objects
   - { status: "success", data: {...} }
   - Already-normalized product objects
============================================================ */

function unwrapProductResponse(response) {
  if (!response || typeof response !== "object") {
    return null;
  }

  if (
    response.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data)
  ) {
    return response.data;
  }

  return response;
}

/* ============================================================
   IMAGE NORMALIZATION

   Prefer:
   1. Explicit primary image
   2. Lowest sort_order
   3. Existing normalized image
============================================================ */

function getPrimaryImage(product) {
  const images = Array.isArray(product?.product_images)
    ? product.product_images.filter(
        (image) =>
          image &&
          typeof image.image_url === "string" &&
          image.image_url.trim()
      )
    : [];

  if (images.length > 0) {
    const primary = images.find(
      (image) => image.is_primary === true
    );

    if (primary?.image_url) {
      return primary.image_url;
    }

    const sorted = [...images].sort(
      (a, b) =>
        Number(a.sort_order ?? 9999) -
        Number(b.sort_order ?? 9999)
    );

    return sorted[0]?.image_url || null;
  }

  if (
    typeof product?.image === "string" &&
    product.image.trim()
  ) {
    return product.image;
  }

  if (
    typeof product?.image_url === "string" &&
    product.image_url.trim()
  ) {
    return product.image_url;
  }

  return null;
}

/* ============================================================
   VARIANT NORMALIZATION

   Current Supabase structure:
   product_variants.attributes.is_default
============================================================ */

function normalizeVariant(variant) {
  if (!variant || typeof variant !== "object") {
    return null;
  }

  const attributes =
    variant.attributes &&
    typeof variant.attributes === "object"
      ? variant.attributes
      : {};

  return {
    ...variant,
    is_default:
      variant.is_default === true ||
      attributes.is_default === true,
  };
}

/* ============================================================
   SELECT PRODUCT VARIANT

   For Buy Again:
   Prefer the previously purchased variant ID.

   Otherwise:
   Prefer the default variant.

   Finally:
   Use the first active variant.
============================================================ */

function getProductVariant(
  product,
  preferredVariantId = null
) {
  const rawVariants = Array.isArray(
    product?.product_variants
  )
    ? product.product_variants
    : [];

  const variants = rawVariants
    .map(normalizeVariant)
    .filter(
      (variant) =>
        variant &&
        variant.is_active !== false
    );

  if (variants.length > 0) {
    if (preferredVariantId) {
      const purchasedVariant = variants.find(
        (variant) =>
          String(variant.id) ===
          String(preferredVariantId)
      );

      if (purchasedVariant) {
        return purchasedVariant;
      }
    }

    return (
      variants.find(
        (variant) => variant.is_default === true
      ) ||
      variants[0]
    );
  }

  return normalizeVariant(product?.variant);
}

/* ============================================================
   PRODUCT NORMALIZATION

   Supports BOTH the Recently Viewed API and raw Product
   Details API.

   This fixes:
   - Missing Buy Again images
   - Missing Buy Again prices
   - Missing compare-at prices
   - Incorrect default variant selection
============================================================ */

function normalizeProduct(
  productResponse,
  {
    preferredVariantId = null,
    purchasedVariantName = "",
    previouslyOrdered = false,
  } = {}
) {
  const product = unwrapProductResponse(
    productResponse
  );

  if (
    !product ||
    !product.id ||
    !product.slug
  ) {
    return null;
  }

  if (
    product.status &&
    product.status !== "active"
  ) {
    return null;
  }

  const selectedVariant = getProductVariant(
    product,
    preferredVariantId
  );

  const image = getPrimaryImage(product);

  const currentPrice =
    selectedVariant?.price ??
    product.price ??
    null;

  const comparePrice =
    selectedVariant?.compare_at_price ??
    product.compare_at_price ??
    null;

  const stockQuantity =
    selectedVariant?.stock_quantity ??
    product.stock_quantity ??
    null;

  const purchasedVariantAvailable =
    !preferredVariantId ||
    (
      selectedVariant?.id &&
      String(selectedVariant.id) ===
        String(preferredVariantId)
    );

  return {
    ...product,

    id: product.id,
    name: product.name,
    slug: product.slug,

    image,

    price: currentPrice,
    compare_at_price: comparePrice,

    rating:
      product.average_rating ??
      product.rating ??
      0,

    review_count:
      product.review_count ?? 0,

    variant: selectedVariant,

    stock_quantity: stockQuantity,

    purchasedVariant:
      purchasedVariantName ||
      selectedVariant?.name ||
      "",

    preferredVariantId,

    purchasedVariantAvailable:
      Boolean(purchasedVariantAvailable),

    previouslyOrdered,

    viewed_at: product.viewed_at || null,
  };
}

/* ============================================================
   PRODUCT CARD

   Uses existing premium horizontal CSS.
============================================================ */

function ProductTile({
  product,
  navigate,
  type,
}) {
  const currentPrice =
    product.price === null ||
    product.price === undefined
      ? null
      : Number(product.price);

  const comparePrice =
    product.compare_at_price === null ||
    product.compare_at_price === undefined
      ? null
      : Number(product.compare_at_price);

  const hasPrice =
    currentPrice !== null &&
    Number.isFinite(currentPrice);

  const hasDiscount =
    hasPrice &&
    currentPrice > 0 &&
    comparePrice !== null &&
    Number.isFinite(comparePrice) &&
    comparePrice > currentPrice;

  const rating = Number(
    product.rating || 0
  );

  const stockKnown =
    product.stock_quantity !== null &&
    product.stock_quantity !== undefined;

  const outOfStock =
    stockKnown &&
    Number(product.stock_quantity) <= 0;

  const productPath =
    `/products/${encodeURIComponent(
      product.slug
    )}`;

  function openProduct() {
    navigate(productPath);
  }

  return (
    <article className="aum-journey-card">

      {/* PRODUCT IMAGE */}

      <button
        type="button"
        className="aum-journey-card__image"
        onClick={openProduct}
        aria-label={`View ${product.name}`}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="aum-journey-card__placeholder">
            <ImageOff size={27} />
          </span>
        )}

        {hasDiscount && (
          <span className="aum-journey-card__discount">
            {Math.round(
              (
                (comparePrice - currentPrice) /
                comparePrice
              ) * 100
            )}
            % OFF
          </span>
        )}
      </button>

      {/* PRODUCT INFORMATION */}

      <div className="aum-journey-card__content">

        <span className="aum-journey-card__eyebrow">
          {type === "recent"
            ? "RECENTLY EXPLORED"
            : "PREVIOUSLY ORDERED"}
        </span>

        <h3 title={product.name}>
          {product.name}
        </h3>

        {type === "again" &&
          product.purchasedVariant && (
            <p
              className="aum-journey-card__variant"
              title={
                `Previously: ${product.purchasedVariant}`
              }
            >
              Previously: {product.purchasedVariant}
            </p>
          )}

        {/* PRICE / RATING */}

        <div className="aum-journey-card__meta">

          <div className="aum-journey-card__price">
            <strong>
              {hasPrice
                ? formatPrice(currentPrice)
                : "Price unavailable"}
            </strong>

            {hasDiscount && (
              <del>
                {formatPrice(comparePrice)}
              </del>
            )}
          </div>

          {rating > 0 && (
            <span className="aum-journey-card__rating">
              <Star
                size={11}
                fill="currentColor"
              />

              {rating.toFixed(1)}
            </span>
          )}

        </div>

        {/* PRODUCT ACTION */}

        <button
          type="button"
          className="aum-journey-card__action"
          onClick={openProduct}
          title={
            outOfStock
              ? "View product availability"
              : type === "again"
                ? "Open product to purchase again"
                : "Continue viewing this product"
          }
        >
          {outOfStock
            ? "View Product"
            : type === "again"
              ? "Buy Again"
              : "Continue Shopping"}

          <ArrowRight size={13} />
        </button>

      </div>
    </article>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function ContinueShopping() {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const [
    recentProducts,
    setRecentProducts,
  ] = useState([]);

  const [
    buyAgainProducts,
    setBuyAgainProducts,
  ] = useState([]);

  const [
    selectedTab,
    setSelectedTab,
  ] = useState("recent");

  const [loading, setLoading] =
    useState(true);

  /* ==========================================================
     LOAD CUSTOMER'S PERSONALIZED SHOPPING DATA
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setRecentProducts([]);
      setBuyAgainProducts([]);
      setLoading(false);

      return undefined;
    }

    async function loadJourney() {
      setLoading(true);

      setRecentProducts([]);
      setBuyAgainProducts([]);

      try {
        /* ========================================
           AUTHENTICATED CUSTOMER
        ======================================== */

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (
          cancelled ||
          authError ||
          !user
        ) {
          return;
        }

        /* ========================================
           CURRENT LOGIN TIMESTAMP

           Previously viewed records must be from
           before the current login.

           No browser-wide shared history is used.
        ======================================== */

        const loginTimestamp = getTimestamp(
          user.last_sign_in_at
        );

        if (loginTimestamp === null) {
          return;
        }

        /* ========================================
           LOAD RECENT PRODUCTS + ORDERS
        ======================================== */

        const [
          recentResult,
          ordersResult,
        ] = await Promise.allSettled([
          getRecentlyViewedProducts(),
          getCustomerOrders(),
        ]);

        if (cancelled) {
          return;
        }

        /* ========================================
           RECENTLY VIEWED PRODUCTS
        ======================================== */

        if (
          recentResult.status === "fulfilled"
        ) {
          const records = Array.isArray(
            recentResult.value
          )
            ? recentResult.value
            : [];

          const seenProducts = new Set();

          const recent = records
            .filter((item) =>
              wasBeforeLogin(
                item.viewed_at,
                loginTimestamp
              )
            )
            .map((item) =>
              normalizeProduct(item)
            )
            .filter((item) => {
              if (!item) {
                return false;
              }

              const key = String(item.id);

              if (seenProducts.has(key)) {
                return false;
              }

              seenProducts.add(key);
              return true;
            })
            .slice(0, MAX_RECENT);

          if (!cancelled) {
            setRecentProducts(recent);
          }
        } else {
          console.warn(
            "[AUMVEDA] Recently Viewed unavailable:",
            recentResult.reason
          );
        }

        /* ========================================
           BUY AGAIN

           Use only delivered orders from before
           the current login session.
        ======================================== */

        if (
          ordersResult.status === "fulfilled"
        ) {
          const allOrders = Array.isArray(
            ordersResult.value
          )
            ? ordersResult.value
            : [];

          const deliveredOrders = allOrders
            .filter((order) => {
              return (
                String(
                  order.status || ""
                ).toLowerCase() === "delivered" &&
                wasBeforeLogin(
                  order.created_at,
                  loginTimestamp
                )
              );
            })
            .sort(
              (a, b) =>
                (
                  getTimestamp(b.created_at) || 0
                ) -
                (
                  getTimestamp(a.created_at) || 0
                )
            )
            .slice(
              0,
              MAX_ORDERS_TO_CHECK
            );

          if (deliveredOrders.length > 0) {

            /* ====================================
               LOAD ORDER DETAILS
            ==================================== */

            const orderDetailsResults =
              await Promise.allSettled(
                deliveredOrders.map(
                  (order) =>
                    getCustomerOrderDetails(
                      order.id
                    )
                )
              );

            if (cancelled) {
              return;
            }

            /* ====================================
               EXTRACT UNIQUE PURCHASED PRODUCTS

               Preserve historical variant ID.
            ==================================== */

            const purchasedItems = [];

            const seenProductVariants =
              new Set();

            orderDetailsResults.forEach(
              (result) => {
                if (
                  result.status !== "fulfilled"
                ) {
                  return;
                }

                const details =
                  result.value?.data ||
                  result.value;

                const items =
                  Array.isArray(details?.items)
                    ? details.items
                    : [];

                items.forEach((item) => {
                  if (!item.product_id) {
                    return;
                  }

                  const itemStatus = String(
                    item.status || ""
                  ).toLowerCase();

                  if (
                    [
                      "cancelled",
                      "canceled",
                      "refunded",
                      "returned",
                    ].includes(itemStatus)
                  ) {
                    return;
                  }

                  const key = [
                    String(item.product_id),
                    String(
                      item.variant_id || ""
                    ),
                  ].join(":");

                  if (
                    seenProductVariants.has(key)
                  ) {
                    return;
                  }

                  seenProductVariants.add(key);

                  purchasedItems.push({
                    product_id:
                      item.product_id,

                    variant_id:
                      item.variant_id || null,

                    product_name:
                      item.product_name || "",

                    variant_name:
                      item.variant_name || "",
                  });
                });
              }
            );

            /* ====================================
               GET PRODUCT SLUGS

               Order items contain product IDs,
               but existing product-detail API
               uses product slugs.
            ==================================== */

            if (
              purchasedItems.length > 0
            ) {
              const catalogResponse =
                await getProducts();

              if (cancelled) {
                return;
              }

              const catalog =
                Array.isArray(catalogResponse)
                  ? catalogResponse
                  : [];

              const productsById = new Map(
                catalog.map((product) => [
                  String(product.id),
                  product,
                ])
              );

              /* ==================================
                 PRODUCT CANDIDATES
              ================================== */

              const candidates = purchasedItems
                .map((item) => {
                  const catalogProduct =
                    productsById.get(
                      String(item.product_id)
                    );

                  if (
                    !catalogProduct?.slug
                  ) {
                    return null;
                  }

                  return {
                    ...item,
                    slug:
                      catalogProduct.slug,
                  };
                })
                .filter(Boolean)
                .slice(
                  0,
                  MAX_BUY_AGAIN
                );

              /* ==================================
                 FETCH CURRENT FULL PRODUCT DETAILS

                 This is essential because the
                 raw details response includes
                 product_images and
                 product_variants.
              ================================== */

              const currentProductResults =
                await Promise.allSettled(
                  candidates.map(
                    (item) =>
                      getProductBySlug(
                        item.slug
                      )
                  )
                );

              if (cancelled) {
                return;
              }

              /* ==================================
                 NORMALIZE FULL PRODUCT DETAILS

                 Match the historical variant ID.
              ================================== */

              const buyAgain =
                currentProductResults
                  .map((result, index) => {
                    if (
                      result.status !==
                      "fulfilled"
                    ) {
                      return null;
                    }

                    const purchasedItem =
                      candidates[index];

                    return normalizeProduct(
                      result.value,
                      {
                        preferredVariantId:
                          purchasedItem.variant_id,

                        purchasedVariantName:
                          purchasedItem.variant_name,

                        previouslyOrdered: true,
                      }
                    );
                  })
                  .filter(Boolean);

              if (!cancelled) {
                setBuyAgainProducts(
                  buyAgain
                );
              }
            }
          }
        } else {
          console.warn(
            "[AUMVEDA] Previous orders unavailable:",
            ordersResult.reason
          );
        }
      } catch (error) {
        console.error(
          "[AUMVEDA] Continue Shopping failed:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadJourney();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  /* ==========================================================
     AVAILABLE TABS

     Only show tabs with valid products.
  ========================================================== */

  const tabs = useMemo(() => {
    const available = [];

    if (recentProducts.length > 0) {
      available.push({
        id: "recent",
        label: "Recently Viewed",
        count: recentProducts.length,
      });
    }

    if (buyAgainProducts.length > 0) {
      available.push({
        id: "again",
        label: "Buy Again",
        count: buyAgainProducts.length,
      });
    }

    return available;
  }, [
    recentProducts,
    buyAgainProducts,
  ]);

  /* ==========================================================
     ACTIVE TAB
  ========================================================== */

  const activeTab = tabs.some(
    (tab) =>
      tab.id === selectedTab
  )
    ? selectedTab
    : tabs[0]?.id;

  const displayedProducts =
    activeTab === "again"
      ? buyAgainProducts
      : recentProducts;

  /* ==========================================================
     HIDE WHEN THERE IS NO ELIGIBLE DATA

     No blank section for:
     - Guests
     - First-time customers
     - No previous activity
  ========================================================== */

  if (
    !isAuthenticated ||
    loading ||
    tabs.length === 0
  ) {
    return null;
  }

  /* ==========================================================
     HOMEPAGE SECTION
  ========================================================== */

  return (
    <section
      className="aum-journey"
      aria-labelledby="aum-journey-heading"
    >

      {/* HEADER */}

      <div className="aum-journey__header">

        <div className="aum-journey__title">

          <span className="aum-journey__eyebrow">
            <ShoppingBag size={13} />

            YOUR PERSONALIZED SHOPPING
          </span>

          <h2 id="aum-journey-heading">
            Continue Your Wellness Journey
          </h2>

          <p>
            Pick up where you left off, or discover
            your favorites again.
          </p>

        </div>

        <button
          type="button"
          className="aum-journey__view-all"
          onClick={() =>
            navigate("/products")
          }
        >
          Explore Products

          <ArrowRight size={15} />
        </button>

      </div>

      {/* TABS */}

      <div
        className="aum-journey__tabs"
        role="tablist"
        aria-label="Personalized shopping"
      >

        {tabs.map((tab) => (

          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`aum-journey-tab-${tab.id}`}
            aria-selected={
              activeTab === tab.id
            }
            aria-controls="aum-journey-panel"
            className={
              "aum-journey__tab" +
              (
                activeTab === tab.id
                  ? " is-active"
                  : ""
              )
            }
            onClick={() =>
              setSelectedTab(tab.id)
            }
          >

            {tab.id === "recent" ? (
              <Clock3 size={15} />
            ) : (
              <PackageCheck size={15} />
            )}

            {tab.label}

            <span>
              {tab.count}
            </span>

          </button>

        ))}

      </div>

      {/* PRODUCT CARDS */}

      <div
        id="aum-journey-panel"
        className="aum-journey__products"
        role="tabpanel"
        aria-labelledby={
          `aum-journey-tab-${activeTab}`
        }
      >

        {displayedProducts.map(
          (product) => (

            <ProductTile
              key={
                `${activeTab}-${product.id}-${product.variant?.id || ""}`
              }
              product={product}
              navigate={navigate}
              type={activeTab}
            />

          )
        )}

      </div>

      {/* FOOTER */}

      <div className="aum-journey__footer">
        <span>
          {activeTab === "again"
            ? "Current product prices and availability apply."
            : "Your previous discoveries, ready to explore."}
        </span>
      </div>

    </section>
  );
}
