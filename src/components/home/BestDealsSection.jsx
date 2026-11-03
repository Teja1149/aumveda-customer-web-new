
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Star,
} from "lucide-react";

import { getProducts } from "../../services/productService";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";

import "../../styles/best-deals.css";

/* ============================================================
   AUMVEDA — BEST DEALS
   PERFORMANCE OPTIMIZED VERSION

   PRESERVED:
   - Existing FastAPI product service
   - CMS product support
   - 12 product limit
   - Discount sorting
   - 22px/second auto-scroll
   - Seamless infinite carousel
   - Previous / Next arrows
   - Cart and quantity controls
   - Wishlist
   - Buy Now
   - Authentication handling
   - Mobile native swipe

   OPTIMIZATIONS:
   - Product request deduplication
   - Short-lived in-memory product cache
   - Prioritized visible product images
   - Lazy loading for repeated image cards
   - Pause scrolling outside viewport
   - Reduced animation work in hidden tabs
   - Stable carousel measurement
   - Cleanup of animation frames
============================================================ */

const PRODUCT_LIMIT = 12;
const AUTO_SCROLL_SPEED = 22;

const PAUSE_AFTER_INTERACTION = 3200;
const ARROW_SCROLL_DURATION = 360;

const BUY_NOW_STORAGE_KEY = "aumveda_buy_now";

/*
  The cache is deliberately short-lived.

  This prevents repeated immediate homepage requests
  while still allowing refreshed product information
  after the cache expires.
*/

const PRODUCTS_CACHE_TTL = 60 * 1000;

let productsCache = null;
let productsCacheTime = 0;
let productsRequestPromise = null;

/* ============================================================
   01 — NUMBER HELPERS
============================================================ */

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

const priceFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return priceFormatter.format(toNumber(value));
}

/* ============================================================
   02 — NORMALIZE API RESPONSE
============================================================ */

function extractProducts(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data?.products)) {
    return response.data.products;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.products)) {
    return response.products;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

/* ============================================================
   03 — SHARED PRODUCT REQUEST CACHE

   Multiple Best Deals mounts can reuse one request.

   Failed requests are not cached.

   This cache is scoped to this module, so other homepage
   components only share it if they use this loader.
============================================================ */

async function loadProductsCached() {
  const now = Date.now();

  if (
    productsCache !== null &&
    now - productsCacheTime < PRODUCTS_CACHE_TTL
  ) {
    return productsCache;
  }

  if (productsRequestPromise) {
    return productsRequestPromise;
  }

  productsRequestPromise = getProducts()
    .then((response) => {
      const products = extractProducts(response);

      productsCache = products;
      productsCacheTime = Date.now();

      return products;
    })
    .finally(() => {
      productsRequestPromise = null;
    });

  return productsRequestPromise;
}

/* ============================================================
   04 — PRODUCT NORMALIZATION

   Supports the existing response fields and variants.
============================================================ */

function normalizeProduct(raw) {
  const variants = Array.isArray(raw?.product_variants)
    ? raw.product_variants
    : [];

  const variant =
    raw?.variant ||
    variants.find((entry) => entry?.is_default) ||
    variants.find(
      (entry) => entry?.attributes?.is_default
    ) ||
    variants.find(
      (entry) => entry?.is_active !== false
    ) ||
    variants[0] ||
    null;

  const images = Array.isArray(raw?.product_images)
    ? raw.product_images
    : [];

  const primaryImage =
    images.find((entry) => entry?.is_primary) ||
    images[0] ||
    null;

  const image =
    typeof raw?.image === "string"
      ? raw.image
      : raw?.image?.image_url ||
        raw?.image_url ||
        raw?.thumbnail_url ||
        primaryImage?.image_url ||
        "";

  const price = toNumber(
    raw?.price ?? variant?.price
  );

  const compareAtPrice = toNumber(
    raw?.compare_at_price ??
      variant?.compare_at_price
  );

  const stock =
    raw?.stock_quantity ??
    variant?.stock_quantity;

  const discount =
    price > 0 && compareAtPrice > price
      ? Math.round(
          ((compareAtPrice - price) /
            compareAtPrice) *
            100
        )
      : 0;

  return {
    ...raw,

    id: raw?.id,
    name: raw?.name || "AUMVEDA Product",
    slug: raw?.slug || "",

    image,
    variant,

    variant_id:
      raw?.variant_id ||
      variant?.id ||
      null,

    price,
    compare_at_price: compareAtPrice,

    stock_quantity: stock,

    in_stock:
      raw?.in_stock === false
        ? false
        : stock == null
          ? true
          : toNumber(stock) > 0,

    rating: toNumber(
      raw?.rating ?? raw?.average_rating
    ),

    review_count: toNumber(
      raw?.review_count
    ),

    discount_percentage: discount,

    short_description:
      raw?.short_description || "",

    description:
      raw?.description || "",
  };
}

/* ============================================================
   05 — DEAL CARD

   Existing JSX class names preserved to keep the
   premium CSS working without modification.
============================================================ */

function DealCard({
  product,
  duplicate,
  priorityImage,
  wished,
  cartQuantity,
  busy,
  onWishlist,
  onAddToCart,
  onIncrease,
  onDecrease,
  onBuyNow,
}) {
  const productPath = `/products/${encodeURIComponent(
    product.slug
  )}`;

  const outOfStock = !product.in_stock;

  return (
    <article
      className="best-deal-card"
      aria-hidden={duplicate ? "true" : undefined}
      inert={duplicate ? true : undefined}
    >
      {/* PRODUCT IMAGE AREA */}

      <div className="best-deal-card__visual">
        {product.discount_percentage > 0 && (
          <span className="best-deal-card__badge">
            Save {product.discount_percentage}%
          </span>
        )}

        {/* WISHLIST */}

        <button
          type="button"
          className={
            "best-deal-card__wishlist" +
            (wished ? " is-active" : "")
          }
          aria-label={
            wished
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          aria-pressed={wished}
          tabIndex={duplicate ? -1 : 0}
          onClick={() => onWishlist(product.id)}
        >
          <Heart
            size={15}
            fill={wished ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>

        {/* PRODUCT PHOTO */}

        <Link
          to={productPath}
          className="best-deal-card__image-link"
          tabIndex={duplicate ? -1 : 0}
          aria-label={`View ${product.name}`}
        >
          <div className="best-deal-card__image-shell">
            {product.image ? (
              <img
                src={product.image}
                alt={duplicate ? "" : product.name}
                loading={
                  priorityImage ? "eager" : "lazy"
                }
                fetchPriority={
                  priorityImage ? "high" : "auto"
                }
                decoding="async"
                draggable={false}
              />
            ) : (
              <span className="best-deal-card__no-image">
                <Package
                  size={30}
                  strokeWidth={1.4}
                  aria-hidden="true"
                />
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* PRODUCT INFORMATION */}

      <div className="best-deal-card__details">
        <h3>
          <Link
            to={productPath}
            tabIndex={duplicate ? -1 : 0}
          >
            {product.name}
          </Link>
        </h3>

        <p className="best-deal-card__description">
          {product.short_description ||
            product.description ||
            "Ayurvedic wellness essential"}
        </p>

        {/* PRICE AND RATING */}

        <div className="best-deal-card__meta">
          <div className="best-deal-card__price">
            <strong>
              ₹{formatPrice(product.price)}
            </strong>

            {product.compare_at_price >
              product.price && (
              <del>
                ₹
                {formatPrice(
                  product.compare_at_price
                )}
              </del>
            )}
          </div>

          <div className="best-deal-card__rating">
            {product.rating > 0 ? (
              <>
                <Star
                  size={11}
                  fill="currentColor"
                  aria-hidden="true"
                />

                <span>
                  {product.rating.toFixed(1)}
                </span>

                {product.review_count > 0 && (
                  <small>
                    ({product.review_count})
                  </small>
                )}
              </>
            ) : (
              <span className="best-deal-card__new">
                New
              </span>
            )}
          </div>
        </div>

        {/* CART / BUY NOW */}

        <div className="best-deal-card__actions">
          {cartQuantity > 0 ? (
            <div className="best-deal-card__stepper">
              <button
                type="button"
                className="best-deal-card__stepper-btn"
                disabled={busy}
                tabIndex={duplicate ? -1 : 0}
                onClick={() => onDecrease(product)}
                aria-label={`Decrease quantity of ${product.name}`}
              >
                <Minus size={13} />
              </button>

              <span className="best-deal-card__stepper-qty">
                {cartQuantity}
              </span>

              <button
                type="button"
                className="best-deal-card__stepper-btn"
                disabled={busy || outOfStock}
                tabIndex={duplicate ? -1 : 0}
                onClick={() => onIncrease(product)}
                aria-label={`Increase quantity of ${product.name}`}
              >
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="best-deal-card__cart"
              disabled={outOfStock || busy}
              tabIndex={duplicate ? -1 : 0}
              onClick={() => onAddToCart(product)}
            >
              <ShoppingBag
                size={12}
                aria-hidden="true"
              />

              <span>
                {outOfStock
                  ? "Sold Out"
                  : busy
                    ? "Adding..."
                    : "Add to Cart"}
              </span>
            </button>
          )}

          <button
            type="button"
            className="best-deal-card__buy"
            disabled={outOfStock || busy}
            tabIndex={duplicate ? -1 : 0}
            onClick={() => onBuyNow(product)}
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   06 — MAIN COMPONENT
============================================================ */

export default function BestDealsSection({ section }) {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const {
    addToCart,
    getCartItem,
    updateCartQuantity,
    removeFromCart,
  } = useCart();

  const {
    isWishlisted,
    toggleWishlist,
  } = useWishlist();

  /* ==========================================================
     STATE
  ========================================================== */

  const [fetchedProducts, setFetchedProducts] =
    useState(() => {
      if (
        productsCache !== null &&
        Date.now() - productsCacheTime <
          PRODUCTS_CACHE_TTL
      ) {
        return productsCache;
      }

      return [];
    });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  const [isVisible, setIsVisible] =
    useState(true);

  /* ==========================================================
     REFS
  ========================================================== */

  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const pointerRef = useRef(false);

  const pauseUntilRef = useRef(0);

  const loopWidthRef = useRef(0);
  const positionRef = useRef(0);

  const frameRef = useRef(null);
  const manualFrameRef = useRef(null);

  /* ==========================================================
     CMS PRODUCT SUPPORT
  ========================================================== */

  const suppliedProducts = section?.products;

  const hasCmsProducts =
    Array.isArray(suppliedProducts) &&
    suppliedProducts.length > 0;

  /* ==========================================================
     07 — FAST PRODUCT LOADING

     Cached products can appear immediately.

     Concurrent component mounts share the same
     in-flight request.

     No changes to productService.js are required.
  ========================================================== */

  useEffect(() => {
    if (hasCmsProducts) {
      setLoading(false);
      setError("");
      return undefined;
    }

    let mounted = true;

    const cacheIsFresh =
      productsCache !== null &&
      Date.now() - productsCacheTime <
        PRODUCTS_CACHE_TTL;

    if (cacheIsFresh) {
      setFetchedProducts(productsCache);
      setLoading(false);
      setError("");
      return undefined;
    }

    async function loadDeals() {
      setLoading(true);
      setError("");

      try {
        const products =
          await loadProductsCached();

        if (!mounted) return;

        setFetchedProducts(products);
      } catch (requestError) {
        if (!mounted) return;

        console.error(
          "Best Deals API request failed:",
          requestError
        );

        setError("Unable to load deals.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDeals();

    return () => {
      mounted = false;
    };
  }, [hasCmsProducts]);

  /* ==========================================================
     08 — REDUCED MOTION
  ========================================================== */

  useEffect(() => {
    const media = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    );

    if (!media) return undefined;

    function update() {
      setReducedMotion(media.matches);
    }

    update();

    media.addEventListener?.("change", update);

    return () => {
      media.removeEventListener?.(
        "change",
        update
      );
    };
  }, []);

  /* ==========================================================
     09 — VIEWPORT VISIBILITY

     The carousel stops scheduling continuous scroll
     updates while outside the visible page area.

     This reduces unnecessary rendering work.
  ========================================================== */

  useEffect(() => {
    const element = sectionRef.current;

    if (
      !element ||
      typeof IntersectionObserver === "undefined"
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "150px 0px",
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  /* ==========================================================
     10 — PREPARE PRODUCTS
  ========================================================== */

  const products = useMemo(() => {
    const source = hasCmsProducts
      ? suppliedProducts
      : fetchedProducts;

    const unique = new Map();

    for (const raw of source) {
      if (
        !raw?.id ||
        !raw?.slug ||
        (raw?.status &&
          raw.status !== "active")
      ) {
        continue;
      }

      const product = normalizeProduct(raw);

      if (product.price <= 0) {
        continue;
      }

      const key = String(product.id);

      if (!unique.has(key)) {
        unique.set(key, product);
      }
    }

    const sorted = [...unique.values()].sort(
      (a, b) =>
        b.discount_percentage -
        a.discount_percentage
    );

    const discounted = sorted.filter(
      (product) =>
        product.discount_percentage > 0
    );

    return (
      discounted.length
        ? discounted
        : sorted
    ).slice(0, PRODUCT_LIMIT);
  }, [
    hasCmsProducts,
    suppliedProducts,
    fetchedProducts,
  ]);

  const canScroll = products.length > 1;

  /* ==========================================================
     11 — INFINITE CAROUSEL DATA

     Keep three product sets for the existing
     seamless infinite scrolling implementation.

     Images use the browser's normal URL cache, so
     repeated instances don't require unique downloads
     when the image responses are cacheable.
  ========================================================== */

  const displayedProducts = useMemo(() => {
    if (!canScroll) return products;

    return [
      ...products,
      ...products,
      ...products,
    ];
  }, [products, canScroll]);

  /* ==========================================================
     12 — PAUSE CONTROL
  ========================================================== */

  const pauseAuto = useCallback(
    (duration = PAUSE_AFTER_INTERACTION) => {
      pauseUntilRef.current =
        performance.now() + duration;
    },
    []
  );

  /* ==========================================================
     13 — POSITION HELPERS
  ========================================================== */

  function normalizedPosition(value, width) {
    if (width <= 0) {
      return Math.max(0, value);
    }

    return (
      ((value % width) + width) % width
    );
  }

  function setPosition(value) {
    const track = trackRef.current;

    if (!track) return;

    const width = loopWidthRef.current;

    const next = normalizedPosition(
      value,
      width
    );

    positionRef.current = next;

    track.scrollLeft = next;
  }

  /* ==========================================================
     14 — MEASURE ONE PRODUCT SET

     Automatically adapts to CSS card widths,
     spacing and responsive layout changes.
  ========================================================== */

  const measureLoop = useCallback(() => {
    const track = trackRef.current;

    if (!track || !canScroll) {
      loopWidthRef.current = 0;
      return;
    }

    const first = track.children[0];

    const secondSet =
      track.children[products.length];

    if (!first || !secondSet) return;

    const distance =
      secondSet.offsetLeft -
      first.offsetLeft;

    if (distance <= 0) return;

    const oldDistance =
      loopWidthRef.current;

    loopWidthRef.current = distance;

    if (
      oldDistance > 0 &&
      oldDistance !== distance
    ) {
      positionRef.current =
        (positionRef.current / oldDistance) *
        distance;
    }

    setPosition(positionRef.current);
  }, [canScroll, products.length]);

  /* ==========================================================
     15 — CAROUSEL AUTO-SCROLL

     Preserves 22px/second.

     Runs only when:
     - There are multiple products
     - Loading has finished
     - Motion is allowed
     - Section is near the viewport

     Also pauses during manual interaction.
  ========================================================== */

  useEffect(() => {
    if (
      !canScroll ||
      loading ||
      reducedMotion ||
      !isVisible
    ) {
      return undefined;
    }

    const track = trackRef.current;

    if (!track) return undefined;

    let cancelled = false;
    let lastTimestamp = null;

    measureLoop();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measureLoop)
        : null;

    observer?.observe(track);

    if (track.firstElementChild) {
      observer?.observe(
        track.firstElementChild
      );
    }

    function animate(timestamp) {
      if (cancelled) return;

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const delta = Math.min(
        timestamp - lastTimestamp,
        50
      );

      lastTimestamp = timestamp;

      const paused =
        document.hidden ||
        hoverRef.current ||
        focusRef.current ||
        pointerRef.current ||
        manualFrameRef.current !== null ||
        timestamp < pauseUntilRef.current;

      if (
        !paused &&
        loopWidthRef.current > 0
      ) {
        setPosition(
          positionRef.current +
            (AUTO_SCROLL_SPEED * delta) / 1000
        );
      }

      frameRef.current =
        window.requestAnimationFrame(animate);
    }

    frameRef.current =
      window.requestAnimationFrame(animate);

    return () => {
      cancelled = true;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(
          frameRef.current
        );
      }

      frameRef.current = null;
      observer?.disconnect();
    };
  }, [
    canScroll,
    loading,
    reducedMotion,
    isVisible,
    measureLoop,
  ]);

  /* ==========================================================
     16 — MANUAL LEFT / RIGHT ARROWS
  ========================================================== */

  function move(direction) {
    const track = trackRef.current;

    if (!track || !canScroll) return;

    pauseAuto(3500);
    measureLoop();

    if (manualFrameRef.current !== null) {
      window.cancelAnimationFrame(
        manualFrameRef.current
      );

      manualFrameRef.current = null;
    }

    const first =
      track.querySelector(".best-deal-card");

    const styles =
      window.getComputedStyle(track);

    const gap =
      parseFloat(styles.columnGap) ||
      parseFloat(styles.gap) ||
      0;

    const step =
      (first?.getBoundingClientRect().width ||
        202) + gap;

    const start = positionRef.current;
    const distance = direction * step;

    if (reducedMotion) {
      setPosition(start + distance);
      return;
    }

    let startTime = null;

    function animateArrow(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min(
        (timestamp - startTime) /
          ARROW_SCROLL_DURATION,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setPosition(
        start + distance * eased
      );

      if (progress < 1) {
        manualFrameRef.current =
          window.requestAnimationFrame(
            animateArrow
          );
      } else {
        manualFrameRef.current = null;
      }
    }

    manualFrameRef.current =
      window.requestAnimationFrame(
        animateArrow
      );
  }

  /* ==========================================================
     17 — ANIMATION CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {
      if (manualFrameRef.current !== null) {
        window.cancelAnimationFrame(
          manualFrameRef.current
        );
      }
    };
  }, []);

  /* ==========================================================
     18 — WISHLIST
  ========================================================== */

  async function handleWishlist(productId) {
    pauseAuto();

    try {
      await toggleWishlist(productId);
    } catch (wishlistError) {
      console.error(
        "Best Deals wishlist failed:",
        wishlistError
      );
    }
  }

  /* ==========================================================
     19 — ADD TO CART
  ========================================================== */

  async function handleAddToCart(product) {
    pauseAuto();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!product.variant_id) {
      setError(
        "Selected product variant is unavailable."
      );
      return;
    }

    try {
      setBusyId(product.id);
      setError("");

      await addToCart(product, 1);
    } catch (cartError) {
      console.error(
        "Best Deals add to cart failed:",
        cartError
      );

      setError(
        cartError?.message ||
          "Unable to add this product to your cart."
      );
    } finally {
      setBusyId(null);
    }
  }

  /* ==========================================================
     20 — INCREASE QUANTITY
  ========================================================== */

  async function handleIncrease(product) {
    pauseAuto();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const cartItem =
      getCartItem?.(product);

    const currentQty = toNumber(
      cartItem?.quantity
    );

    const nextQty = currentQty + 1;

    try {
      setBusyId(product.id);
      setError("");

      if (
        typeof updateCartQuantity === "function"
      ) {
        await updateCartQuantity(
          product,
          nextQty
        );
      } else {
        await addToCart(product, 1);
      }
    } catch (cartError) {
      console.error(
        "Best Deals increase quantity failed:",
        cartError
      );

      setError(
        cartError?.message ||
          "Unable to update quantity."
      );
    } finally {
      setBusyId(null);
    }
  }

  /* ==========================================================
     21 — DECREASE QUANTITY
  ========================================================== */

  async function handleDecrease(product) {
    pauseAuto();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const cartItem =
      getCartItem?.(product);

    const currentQty = toNumber(
      cartItem?.quantity
    );

    if (currentQty <= 0) return;

    const nextQty = currentQty - 1;

    try {
      setBusyId(product.id);
      setError("");

      if (nextQty <= 0) {
        if (
          typeof removeFromCart === "function"
        ) {
          await removeFromCart(product);
        } else if (
          typeof updateCartQuantity ===
          "function"
        ) {
          await updateCartQuantity(
            product,
            0
          );
        }
      } else if (
        typeof updateCartQuantity === "function"
      ) {
        await updateCartQuantity(
          product,
          nextQty
        );
      }
    } catch (cartError) {
      console.error(
        "Best Deals decrease quantity failed:",
        cartError
      );

      setError(
        cartError?.message ||
          "Unable to update quantity."
      );
    } finally {
      setBusyId(null);
    }
  }

  /* ==========================================================
     22 — BUY NOW

     Existing sessionStorage and checkout navigation
     are preserved without modification.
  ========================================================== */

  function handleBuyNow(product) {
    pauseAuto();

    try {
      setError("");

      const payload = {
        product,
        quantity: 1,
      };

      sessionStorage.setItem(
        BUY_NOW_STORAGE_KEY,
        JSON.stringify(payload)
      );

      if (isAuthenticated) {
        navigate(
          "/checkout?mode=buy-now",
          {
            state: {
              buyNow: payload,
            },
          }
        );
      } else {
        navigate("/login", {
          state: {
            from: {
              pathname:
                "/checkout?mode=buy-now",
            },
          },
        });
      }
    } catch (buyError) {
      console.error(
        "Best Deals Buy Now failed:",
        buyError
      );

      setError(
        "Unable to start checkout."
      );
    }
  }

  /* ==========================================================
     23 — NATIVE SCROLL HANDLER
  ========================================================== */

  function handleScroll(event) {
    const actual =
      event.currentTarget.scrollLeft;

    positionRef.current = actual;

    if (pointerRef.current) {
      pauseAuto();
    }
  }

  /* ==========================================================
     24 — RENDER
  ========================================================== */

  return (
    <section
      ref={sectionRef}
      className="best-deals"
      id="best-deals"
      aria-labelledby="best-deals-title"
    >
      <div className="best-deals__container">

        {/* SECTION HEADER */}

        <header className="best-deals__header">
          <div className="best-deals__heading">
            <span className="best-deals__eyebrow">
              ✣ BEST DEALS
            </span>

            <h2 id="best-deals-title">
              {section?.title ||
                "Best Deals of the Week"}
            </h2>

            <p>
              {section?.subtitle ||
                "Top offers on your favourite wellness essentials"}
            </p>
          </div>

          <Link
            to="/products"
            className="best-deals__view-all"
          >
            View All
            <ArrowRight
              size={14}
              aria-hidden="true"
            />
          </Link>
        </header>

        {/* ERROR */}

        {error && (
          <p
            className="best-deals__error"
            role="status"
          >
            {error}
          </p>
        )}

        {/* CAROUSEL */}

        <div
          className="best-deals__carousel"
          onMouseEnter={() => {
            hoverRef.current = true;
          }}
          onMouseLeave={() => {
            hoverRef.current = false;
          }}
          onFocusCapture={() => {
            focusRef.current = true;
          }}
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(
                event.relatedTarget
              )
            ) {
              focusRef.current = false;
            }
          }}
        >

          {/* PREVIOUS */}

          {canScroll && (
            <button
              type="button"
              className="best-deals__arrow best-deals__arrow--left"
              onClick={() => move(-1)}
              aria-label="Previous deals"
            >
              <ChevronLeft size={17} />
            </button>
          )}

          {/* PRODUCT TRACK */}

          <div
            ref={trackRef}
            className="best-deals__track"
            onScroll={handleScroll}
            onWheel={() => pauseAuto()}
            onPointerDown={() => {
              pointerRef.current = true;
              pauseAuto();
            }}
            onPointerUp={() => {
              pointerRef.current = false;
              pauseAuto();
            }}
            onPointerCancel={() => {
              pointerRef.current = false;
              pauseAuto();
            }}
            onPointerLeave={() => {
              pointerRef.current = false;
            }}
            onTouchStart={() => {
              pointerRef.current = true;
              pauseAuto();
            }}
            onTouchEnd={() => {
              pointerRef.current = false;
              pauseAuto();
            }}
          >

            {/* LOADING STATE */}

            {loading &&
              fetchedProducts.length === 0 &&
              !hasCmsProducts && (
                <div className="best-deals__message">
                  Loading best deals...
                </div>
              )}

            {/* EMPTY STATE */}

            {!loading &&
              products.length === 0 && (
                <div className="best-deals__message">
                  No current deals available.
                </div>
              )}

            {/* PRODUCT CARDS */}

            {displayedProducts.map(
              (product, index) => {
                const cartItem =
                  getCartItem?.(product);

                const duplicate =
                  canScroll &&
                  index >= products.length;

                return (
                  <DealCard
                    key={`${product.id}-${index}`}
                    product={product}
                    duplicate={duplicate}
                    priorityImage={
                      index < 4 &&
                      !duplicate
                    }
                    wished={isWishlisted(
                      product.id
                    )}
                    cartQuantity={toNumber(
                      cartItem?.quantity
                    )}
                    busy={
                      busyId === product.id
                    }
                    onWishlist={
                      handleWishlist
                    }
                    onAddToCart={
                      handleAddToCart
                    }
                    onIncrease={
                      handleIncrease
                    }
                    onDecrease={
                      handleDecrease
                    }
                    onBuyNow={
                      handleBuyNow
                    }
                  />
                );
              }
            )}
          </div>

          {/* NEXT */}

          {canScroll && (
            <button
              type="button"
              className="best-deals__arrow best-deals__arrow--right"
              onClick={() => move(1)}
              aria-label="Next deals"
            >
              <ChevronRight size={17} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
