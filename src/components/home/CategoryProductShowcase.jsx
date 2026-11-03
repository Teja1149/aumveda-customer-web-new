
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Leaf,
  PackageCheck,
} from "lucide-react";

import ProductCard from "../products/ProductCard";
import { getProducts } from "../../services/productService";

import "../../styles/category-product-showcase.css";

/* ============================================================
   AUMVEDA — CATEGORY PRODUCT SHOWCASE

   - Reference-aligned editorial / product layout
   - Real FastAPI product data
   - Reuses existing ProductCard
   - Automatic collection rotation: 3 seconds
   - Pause on hover, focus, touch, interaction
   - Manual collection tabs
   - Product gallery arrows and touch swipe
   - Reduced-motion support
   - Responsive centered homepage layout

   ProductCard retains its own:
   - Product details
   - Wishlist
   - Pricing and reviews
   - Add to Cart and quantity controls
   - Buy Now / checkout
============================================================ */

const AUTO_SWITCH_INTERVAL = 3000;
const MANUAL_PAUSE_DURATION = 8000;

const COLLECTIONS = [
  {
    id: "hair",
    label: "Hair Care",
    eyebrow: "HAIR & SCALP CARE",
    title: "Nourish Your Hair, Naturally.",
    description:
      "Discover our collection of hair oils, shampoos and daily hair care essentials.",
    theme: "hair",
    search: "hair",
    keywords: [
      "hair",
      "bhringraj",
      "shikakai",
      "kesh",
      "scalp",
    ],
    highlights: [
      "Traditional hair care essentials",
      "Oils, shampoos and cleansers",
      "Daily hair care favourites",
    ],
  },
  {
    id: "skin",
    label: "Skin Care",
    eyebrow: "SKIN CARE",
    title: "Care That Feels Natural.",
    description:
      "Explore skincare favourites for your everyday beauty and self-care routine.",
    theme: "skin",
    search: "skin",
    keywords: [
      "skin",
      "face",
      "serum",
      "cleanser",
      "moisturizer",
      "moisturiser",
      "sunscreen",
      "aloe vera",
      "sandalwood",
      "soap",
    ],
    highlights: [
      "Face and body care essentials",
      "Cleansers and skincare favourites",
      "Everyday self-care products",
    ],
  },
  {
    id: "wellness",
    label: "Daily Wellness",
    eyebrow: "DAILY WELLNESS",
    title: "Your Everyday Essentials.",
    description:
      "Find products for everyday wellness and traditional self-care routines.",
    theme: "wellness",
    search: "wellness",
    keywords: [
      "ashwagandha",
      "brahmi",
      "capsule",
      "tablet",
      "supplement",
      "immunity",
      "nutrition",
      "digest",
      "wellness",
      "churna",
    ],
    highlights: [
      "Daily wellness favourites",
      "Traditional herbal ingredients",
      "Essentials for your daily routine",
    ],
  },
];

/* ============================================================
   PRODUCT HELPERS
============================================================ */

function extractProducts(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data?.data?.products,
    response?.data?.products,
    response?.data?.data,
    response?.data,
    response?.products,
  ];

  return candidates.find(Array.isArray) || [];
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : 0;
}

function normalizeProduct(product) {
  if (!product?.id || !product?.slug) {
    return null;
  }

  const variants = Array.isArray(product.product_variants)
    ? product.product_variants
    : [];

  const variant =
    product.variant ||
    variants.find((item) => item?.is_default === true) ||
    variants.find(
      (item) => item?.attributes?.is_default === true
    ) ||
    variants.find((item) => item?.is_active !== false) ||
    variants[0] ||
    null;

  const images = Array.isArray(product.product_images)
    ? product.product_images
    : [];

  const primaryImage =
    images.find((item) => item?.is_primary) ||
    images[0] ||
    null;

  const image =
    (typeof product.image === "string"
      ? product.image
      : product.image?.image_url) ||
    product.image_url ||
    product.thumbnail_url ||
    primaryImage?.image_url ||
    "";

  const price = numberValue(
    product.price ?? variant?.price
  );

  const comparePrice = numberValue(
    product.compare_at_price ??
      variant?.compare_at_price
  );

  const stockQuantity =
    variant?.stock_quantity ??
    product.stock_quantity ??
    null;

  return {
    ...product,
    variant,
    variant_id:
      product.variant_id ||
      variant?.id ||
      null,
    image,
    price,
    compare_at_price: comparePrice,
    rating: numberValue(
      product.rating ?? product.average_rating
    ),
    review_count: numberValue(product.review_count),
    stock_quantity: stockQuantity,
    in_stock:
      product.in_stock === false
        ? false
        : stockQuantity == null
          ? true
          : numberValue(stockQuantity) > 0,
    short_description:
      product.short_description ||
      product.description ||
      "",
  };
}

function getSearchableText(product) {
  return [
    product.name,
    product.slug,
    product.category_name,
    product.category?.name,
    product.category?.slug,
    product.subcategory_name,
    product.subcategory?.name,
    product.subcategory?.slug,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function getMatchingProducts(products, collection) {
  return products.filter((product) => {
    const text = getSearchableText(product);

    return collection.keywords.some((keyword) =>
      text.includes(keyword)
    );
  });
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function CategoryProductShowcase() {
  const [products, setProducts] = useState([]);
  const [activeCollectionId, setActiveCollectionId] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  const trackRef = useRef(null);
  const activeCollectionIdRef = useRef(null);

  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const touchingRef = useRef(false);
  const manualPauseUntilRef = useRef(0);

  /* ==========================================================
     FETCH REAL PRODUCTS
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await getProducts();

        if (!mounted) return;

        const normalized = extractProducts(response)
          .map(normalizeProduct)
          .filter(
            (product) =>
              product &&
              product.price > 0 &&
              (
                product.status == null ||
                product.status === "active"
              )
          );

        const unique = Array.from(
          new Map(
            normalized.map((product) => [
              String(product.id),
              product,
            ])
          ).values()
        );

        setProducts(unique);
      } catch (requestError) {
        console.error(
          "Category showcase loading failed:",
          requestError
        );

        if (mounted) {
          setError("Unable to load collections right now.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     REDUCED MOTION
  ========================================================== */

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia
    ) {
      return undefined;
    }

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () => setReducedMotion(media.matches);

    update();

    media.addEventListener?.("change", update);

    return () => {
      media.removeEventListener?.("change", update);
    };
  }, []);

  /* ==========================================================
     MATCH PRODUCTS TO COLLECTIONS
  ========================================================== */

  const collections = useMemo(() => {
    const matched = COLLECTIONS.map((collection) => ({
      ...collection,
      products: getMatchingProducts(
        products,
        collection
      ),
    })).filter(
      (collection) => collection.products.length > 0
    );

    if (matched.length > 0) {
      return matched;
    }

    if (products.length > 0) {
      return [
        {
          id: "all",
          label: "Shop All",
          eyebrow: "THE COLLECTION EDIT",
          title: "Explore More to Love.",
          description:
            "Discover more natural care products from our collection.",
          theme: "hair",
          search: "",
          highlights: [
            "Explore the AUMVEDA range",
            "Find daily care essentials",
            "Discover more wellness products",
          ],
          products,
        },
      ];
    }

    return [];
  }, [products]);

  const activeCollection =
    collections.find(
      (collection) =>
        collection.id === activeCollectionId
    ) ||
    collections[0] ||
    null;

  const activeIndex = Math.max(
    collections.findIndex(
      (collection) =>
        collection.id === activeCollection?.id
    ),
    0
  );

  useEffect(() => {
    activeCollectionIdRef.current =
      activeCollection?.id || null;
  }, [activeCollection?.id]);

  const collectionUrl = activeCollection?.search
    ? `/products?search=${encodeURIComponent(
        activeCollection.search
      )}`
    : "/products";

  /* ==========================================================
     PAUSE AFTER MANUAL INTERACTION
  ========================================================== */

  const pauseAfterInteraction = useCallback(() => {
    manualPauseUntilRef.current =
      performance.now() + MANUAL_PAUSE_DURATION;
  }, []);

  /* ==========================================================
     AUTOMATIC CATEGORY ROTATION

     Switch between collections every 3 seconds.
     Pause while user interacts with the section.
  ========================================================== */

  useEffect(() => {
    if (
      loading ||
      reducedMotion ||
      collections.length <= 1
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (document.hidden) return;

      if (
        hoveredRef.current ||
        focusedRef.current ||
        touchingRef.current
      ) {
        return;
      }

      if (
        performance.now() <
        manualPauseUntilRef.current
      ) {
        return;
      }

      const currentIndex = collections.findIndex(
        (collection) =>
          collection.id === activeCollectionIdRef.current
      );

      const nextIndex =
        (Math.max(currentIndex, 0) + 1) %
        collections.length;

      const nextCollection = collections[nextIndex];

      activeCollectionIdRef.current =
        nextCollection.id;

      setActiveCollectionId(nextCollection.id);
    }, AUTO_SWITCH_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [collections, loading, reducedMotion]);

  /* ==========================================================
     MANUAL CATEGORY SELECTION
  ========================================================== */

  function selectCollection(collectionId) {
    activeCollectionIdRef.current = collectionId;
    setActiveCollectionId(collectionId);
    pauseAfterInteraction();
  }

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.scrollLeft = 0;
    }
  }, [activeCollection?.id]);

  /* ==========================================================
     MANUAL PRODUCT GALLERY SCROLLING
  ========================================================== */

  function scrollGallery(direction) {
    const track = trackRef.current;

    if (!track) return;

    const card = track.querySelector(
      ".category-showcase__product-shell"
    );

    if (!card) return;

    const styles = window.getComputedStyle(track);

    const gap =
      parseFloat(styles.columnGap) ||
      parseFloat(styles.gap) ||
      10;

    const distance =
      card.getBoundingClientRect().width + gap;

    pauseAfterInteraction();

    track.scrollBy({
      left: distance * direction,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  /* ==========================================================
     EMPTY / ERROR STATE
  ========================================================== */

  if (!loading && !activeCollection) {
    return error ? (
      <section
        className="category-showcase"
        aria-label="Shop curated collections"
      >
        <div
          className="category-showcase__message"
          role="alert"
        >
          {error}
        </div>
      </section>
    ) : null;
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <section
      className={
        "category-showcase " +
        `category-showcase--${activeCollection?.theme || "hair"}`
      }
      aria-label="Shop curated collections"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onFocusCapture={() => {
        focusedRef.current = true;
      }}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          focusedRef.current = false;
        }
      }}
      onTouchStart={() => {
        touchingRef.current = true;
        pauseAfterInteraction();
      }}
      onTouchEnd={() => {
        touchingRef.current = false;
        pauseAfterInteraction();
      }}
      onTouchCancel={() => {
        touchingRef.current = false;
      }}
    >
      <div className="category-showcase__container">
        <div className="category-showcase__layout">

          {/* ===============================================
              LEFT — EDITORIAL PANEL
          =============================================== */}

          <div
            className={
              "category-showcase__editorial " +
              `category-showcase__editorial--${activeCollection?.theme || "hair"}`
            }
          >
            <div className="category-showcase__editorial-top">
              <span>
                {activeCollection?.eyebrow ||
                  "THE COLLECTION EDIT"}
              </span>

              <span className="category-showcase__edition">
                {String(activeIndex + 1).padStart(2, "0")}
                {" / "}
                {String(
                  collections.length || 1
                ).padStart(2, "0")}
              </span>
            </div>

            <div
              className="category-showcase__editorial-main"
              key={activeCollection?.id || "loading"}
            >
              <h2>
                {activeCollection?.title ||
                  "Explore the Collection."}
              </h2>

              <p>
                {activeCollection?.description ||
                  "Discover more from our store."}
              </p>

              <div className="category-showcase__highlights">
                {(activeCollection?.highlights || []).map(
                  (highlight) => (
                    <div
                      className="category-showcase__highlight"
                      key={highlight}
                    >
                      <span
                        className="category-showcase__highlight-icon"
                        aria-hidden="true"
                      >
                        <Check size={12} />
                      </span>

                      <span>{highlight}</span>
                    </div>
                  )
                )}
              </div>

              <div className="category-showcase__collection-stats">
                <span>
                  <PackageCheck
                    size={14}
                    aria-hidden="true"
                  />
                  {activeCollection?.products.length || 0}
                  {" "}products
                </span>

                <span>
                  <Leaf
                    size={14}
                    aria-hidden="true"
                  />
                  Curated collection
                </span>
              </div>
            </div>

            <Link
              to={collectionUrl}
              className="category-showcase__editorial-cta"
              onClick={pauseAfterInteraction}
            >
              <span>EXPLORE COLLECTION</span>

              <ArrowUpRight
                size={16}
                aria-hidden="true"
              />
            </Link>
          </div>

          {/* ===============================================
              RIGHT — PRODUCT GALLERY
          =============================================== */}

          <div className="category-showcase__gallery">

            <div className="category-showcase__gallery-header">
              <div
                className="category-showcase__tabs"
                aria-label="Product collections"
              >
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    type="button"
                    className={
                      "category-showcase__tab " +
                      (
                        activeCollection?.id === collection.id
                          ? "category-showcase__tab--active"
                          : ""
                      )
                    }
                    aria-pressed={
                      activeCollection?.id === collection.id
                    }
                    onClick={() =>
                      selectCollection(collection.id)
                    }
                  >
                    {collection.label}
                  </button>
                ))}

                {loading && (
                  <span className="category-showcase__loading-label">
                    Loading collections...
                  </span>
                )}
              </div>

              <div className="category-showcase__controls">
                <button
                  type="button"
                  aria-label="Previous products"
                  disabled={
                    loading ||
                    !activeCollection?.products.length
                  }
                  onClick={() => scrollGallery(-1)}
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  aria-label="Next products"
                  disabled={
                    loading ||
                    !activeCollection?.products.length
                  }
                  onClick={() => scrollGallery(1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div
              ref={trackRef}
              className="category-showcase__track"
              onWheel={pauseAfterInteraction}
              onPointerDown={pauseAfterInteraction}
            >
              {loading &&
                Array.from({ length: 4 }).map(
                  (_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className={
                        "category-showcase__product-shell " +
                        "category-showcase__product-shell--loading"
                      }
                      aria-hidden="true"
                    >
                      <div className="category-showcase__skeleton-image" />
                      <div className="category-showcase__skeleton-line" />
                      <div className="category-showcase__skeleton-line category-showcase__skeleton-line--short" />
                    </div>
                  )
                )}

              {!loading &&
                activeCollection?.products.map((product) => (
                  <div
                    key={product.id}
                    className="category-showcase__product-shell"
                    onClickCapture={pauseAfterInteraction}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
            </div>

            <div className="category-showcase__gallery-footer">
              <span>
                {loading
                  ? "Loading products..."
                  : `${
                      activeCollection?.products.length || 0
                    } products in this collection`}
              </span>

              <Link
                to={collectionUrl}
                onClick={pauseAfterInteraction}
              >
                View Collection
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
