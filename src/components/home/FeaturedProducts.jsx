
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
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

import "../../styles/featured-products.css";

const MAX_FEATURED_PRODUCTS = 12;
const AUTO_SCROLL_SPEED = 24;
const PAUSE_DURATION = 3000;
const BUY_NOW_STORAGE_KEY = "aumveda_buy_now";

function numeric(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(numeric(value));
}

function extractProducts(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data?.products,
    response?.data?.data?.products,
    response?.data?.data,
    response?.data,
    response?.products,
  ];

  return candidates.find(Array.isArray) || [];
}

function normalizeProduct(raw) {
  if (!raw) return null;

  const variants = Array.isArray(raw.product_variants)
    ? raw.product_variants
    : [];

  const variant =
    raw.variant ||
    variants.find((v) => v?.is_default === true) ||
    variants.find((v) => v?.attributes?.is_default === true) ||
    variants.find((v) => v?.is_active !== false) ||
    variants[0] ||
    null;

  const images = Array.isArray(raw.product_images)
    ? raw.product_images
    : [];

  const primaryImage =
    images.find((item) => item?.is_primary) ||
    images[0] ||
    null;

  const image =
    (typeof raw.image === "string"
      ? raw.image
      : raw.image?.image_url) ||
    raw.image_url ||
    raw.thumbnail_url ||
    primaryImage?.image_url ||
    "";

  const price = numeric(raw.price ?? variant?.price);

  const compareAtPrice = numeric(
    raw.compare_at_price ?? variant?.compare_at_price
  );

  const stock =
    raw.stock_quantity ?? variant?.stock_quantity;

  const discount =
    price > 0 && compareAtPrice > price
      ? Math.round(
          ((compareAtPrice - price) / compareAtPrice) * 100
        )
      : 0;

  return {
    ...raw,
    id: raw.id,
    name: raw.name || "AUMVEDA Product",
    slug: raw.slug || "",
    image,
    variant,
    variant_id: raw.variant_id || variant?.id || null,
    price,
    compare_at_price: compareAtPrice,
    stock_quantity: stock,
    in_stock:
      raw.in_stock === false
        ? false
        : stock == null
          ? true
          : numeric(stock) > 0,
    rating: numeric(raw.rating ?? raw.average_rating),
    review_count: numeric(raw.review_count),
    discount_percentage: discount,
    short_description: raw.short_description || "",
    description: raw.description || "",
  };
}

function FeaturedProductCard({
  product,
  duplicate = false,
  onInteraction,
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { isWishlisted, toggleWishlist } = useWishlist();

  const {
    addToCart,
    getCartItem,
    updateCartItem,
    removeFromCart,
  } = useCart();

  const [cartBusy, setCartBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const productUrl = `/products/${encodeURIComponent(
    product.slug
  )}`;

  const wished = isWishlisted(product.id);
  const cartItem = getCartItem(product);
  const cartQuantity = numeric(cartItem?.quantity);

  const stockValue =
    cartItem?.variant?.stock_quantity ??
    product.stock_quantity;

  const maxStockReached =
    stockValue != null &&
    cartQuantity >= numeric(stockValue);

  const outOfStock = !product.in_stock;
  const busy = cartBusy || buyBusy;

  async function handleWishlist(event) {
    event.preventDefault();
    event.stopPropagation();
    onInteraction();

    try {
      setActionError("");
      await toggleWishlist(product.id);
    } catch (error) {
      console.error("Featured wishlist error:", error);
      setActionError("Unable to update wishlist.");
    }
  }

  async function handleAddToCart() {
    if (busy || outOfStock) return;

    onInteraction();
    setActionError("");

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!product.variant_id) {
      setActionError("Product variant is unavailable.");
      return;
    }

    try {
      setCartBusy(true);
      await addToCart(product, 1);
    } catch (error) {
      console.error("Featured add to cart error:", error);
      setActionError(
        error?.message || "Unable to add this product."
      );
    } finally {
      setCartBusy(false);
    }
  }

  async function handleDecrease() {
    if (!cartItem || busy) return;

    onInteraction();
    setActionError("");

    try {
      setCartBusy(true);

      if (cartQuantity <= 1) {
        await removeFromCart(cartItem.id);
      } else {
        await updateCartItem(
          cartItem.id,
          cartQuantity - 1
        );
      }
    } catch (error) {
      console.error("Featured decrease error:", error);
      setActionError(
        error?.message || "Unable to update quantity."
      );
    } finally {
      setCartBusy(false);
    }
  }

  async function handleIncrease() {
    if (!cartItem || busy || maxStockReached) return;

    onInteraction();
    setActionError("");

    try {
      setCartBusy(true);

      await updateCartItem(
        cartItem.id,
        cartQuantity + 1
      );
    } catch (error) {
      console.error("Featured increase error:", error);
      setActionError(
        error?.message || "Unable to update quantity."
      );
    } finally {
      setCartBusy(false);
    }
  }

  function handleBuyNow() {
    if (outOfStock || busy) return;

    onInteraction();
    setActionError("");

    try {
      setBuyBusy(true);

      const payload = {
        product,
        quantity: 1,
      };

      sessionStorage.setItem(
        BUY_NOW_STORAGE_KEY,
        JSON.stringify(payload)
      );

      if (isAuthenticated) {
        navigate("/checkout?mode=buy-now", {
          state: { buyNow: payload },
        });
      } else {
        navigate("/login", {
          state: {
            from: {
              pathname: "/checkout?mode=buy-now",
            },
          },
        });
      }
    } catch (error) {
      console.error("Featured Buy Now error:", error);
      setActionError("Unable to start checkout.");
      setBuyBusy(false);
    }
  }

  return (
    <article
      className="featured-card"
      aria-hidden={duplicate ? "true" : undefined}
      inert={duplicate ? true : undefined}
    >
      <div className="featured-card__visual">
        {product.discount_percentage > 0 && (
          <span className="featured-card__discount">
            {product.discount_percentage}% OFF
          </span>
        )}

        <button
          type="button"
          className={
            "featured-card__wishlist" +
            (wished
              ? " featured-card__wishlist--active"
              : "")
          }
          aria-label={
            wished
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          aria-pressed={wished}
          tabIndex={duplicate ? -1 : 0}
          onClick={handleWishlist}
        >
          <Heart
            size={15}
            fill={wished ? "currentColor" : "none"}
          />
        </button>

        <Link
          to={productUrl}
          className="featured-card__image"
          tabIndex={duplicate ? -1 : 0}
          aria-label={`View ${product.name}`}
          onClick={onInteraction}
        >
          {product.image ? (
            <img
              src={product.image}
              alt={duplicate ? "" : product.name}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <span className="featured-card__fallback">
              <Package size={30} />
            </span>
          )}
        </Link>
      </div>

      <div className="featured-card__body">
        <h3>
          <Link
            to={productUrl}
            tabIndex={duplicate ? -1 : 0}
            onClick={onInteraction}
          >
            {product.name}
          </Link>
        </h3>

        <p
          className="featured-card__description"
          title={
            product.short_description ||
            product.description ||
            ""
          }
        >
          {product.short_description ||
            product.description ||
            "Explore natural wellness essentials."}
        </p>

        {/* Rating above price — reference design */}

        <div
          className="featured-card__rating"
          aria-label={
            product.rating > 0
              ? `Rated ${product.rating.toFixed(1)} out of 5`
              : "Not yet rated"
          }
        >
          {product.rating > 0 ? (
            <>
              <Star size={12} fill="currentColor" />
              <span>{product.rating.toFixed(1)}</span>

              {product.review_count > 0 && (
                <small>({product.review_count})</small>
              )}
            </>
          ) : (
            <span className="featured-card__rating-empty">
              New
            </span>
          )}
        </div>

        <div className="featured-card__pricing">
          <strong>
            ₹{formatPrice(product.price)}
          </strong>

          {product.compare_at_price > product.price && (
            <del>
              ₹{formatPrice(product.compare_at_price)}
            </del>
          )}
        </div>

        {/* Existing shopping functionality */}

        <div className="featured-card__actions">
          {cartItem && cartQuantity > 0 ? (
            <div
              className="featured-card__quantity"
              aria-label={`${product.name} quantity`}
            >
              <button
                type="button"
                tabIndex={duplicate ? -1 : 0}
                disabled={busy}
                onClick={handleDecrease}
                aria-label={`Decrease ${product.name} quantity`}
              >
                <Minus size={13} />
              </button>

              <strong aria-live="polite">
                {cartQuantity}
              </strong>

              <button
                type="button"
                tabIndex={duplicate ? -1 : 0}
                disabled={busy || maxStockReached}
                onClick={handleIncrease}
                aria-label={`Increase ${product.name} quantity`}
              >
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="featured-card__cart"
              tabIndex={duplicate ? -1 : 0}
              disabled={busy || outOfStock}
              onClick={handleAddToCart}
            >
              <ShoppingBag size={12} />
              <span>
                {outOfStock
                  ? "Sold Out"
                  : cartBusy
                    ? "Adding..."
                    : "Add to Cart"}
              </span>
            </button>
          )}

          <button
            type="button"
            className="featured-card__buy-now"
            tabIndex={duplicate ? -1 : 0}
            disabled={busy || outOfStock}
            onClick={handleBuyNow}
          >
            {buyBusy ? "Opening..." : "Buy Now"}
          </button>
        </div>

        {actionError && (
          <p
            className="featured-card__error"
            role="alert"
          >
            {actionError}
          </p>
        )}
      </div>
    </article>
  );
}

export default function FeaturedProducts({
  section,
  products: suppliedProducts,
}) {
  const [fetchedProducts, setFetchedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  const trackRef = useRef(null);
  const loopWidthRef = useRef(0);
  const positionRef = useRef(0);
  const frameRef = useRef(null);
  const manualFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const touchRef = useRef(false);
  const pauseUntilRef = useRef(0);

  const hasSuppliedProducts =
    Array.isArray(suppliedProducts) &&
    suppliedProducts.length > 0;

  useEffect(() => {
    if (hasSuppliedProducts) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function loadFeatured() {
      setLoading(true);
      setError("");

      try {
        const response = await getProducts();

        if (active) {
          setFetchedProducts(extractProducts(response));
        }
      } catch (requestError) {
        console.error(
          "Featured products loading failed:",
          requestError
        );

        if (active) {
          setError("Unable to load featured products.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFeatured();

    return () => {
      active = false;
    };
  }, [hasSuppliedProducts]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () => {
      setReducedMotion(media.matches);
    };

    update();

    media.addEventListener?.("change", update);

    return () => {
      media.removeEventListener?.("change", update);
    };
  }, []);

  const products = useMemo(() => {
    const source = hasSuppliedProducts
      ? suppliedProducts
      : fetchedProducts;

    const unique = new Map();

    for (const raw of source) {
      if (
        !raw?.id ||
        !raw?.slug ||
        !raw?.name ||
        (raw.status && raw.status !== "active")
      ) {
        continue;
      }

      const product = normalizeProduct(raw);

      if (!product || product.price <= 0) {
        continue;
      }

      const key = String(product.id);

      if (!unique.has(key)) {
        unique.set(key, product);
      }
    }

    let selected = [...unique.values()];

    if (!hasSuppliedProducts) {
      const marked = selected.filter(
        (product) =>
          product.is_featured === true ||
          product.featured === true
      );

      if (marked.length > 0) {
        const markedIds = new Set(
          marked.map((product) => String(product.id))
        );

        selected = [
          ...marked,
          ...selected.filter(
            (product) =>
              !markedIds.has(String(product.id))
          ),
        ];
      }
    }

    return selected.slice(0, MAX_FEATURED_PRODUCTS);
  }, [
    hasSuppliedProducts,
    suppliedProducts,
    fetchedProducts,
  ]);

  const canAutoScroll = products.length > 1;

  const displayedProducts = useMemo(() => {
    if (!canAutoScroll) {
      return products;
    }

    return [
      ...products,
      ...products,
      ...products,
    ];
  }, [products, canAutoScroll]);

  const pauseAuto = useCallback(
    (duration = PAUSE_DURATION) => {
      pauseUntilRef.current =
        performance.now() + duration;
    },
    []
  );

  const normalizeScroll = useCallback(
    (value, width) => {
      if (width <= 0) {
        return Math.max(0, value);
      }

      return ((value % width) + width) % width;
    },
    []
  );

  const setScrollPosition = useCallback(
    (value) => {
      const track = trackRef.current;
      if (!track) return;

      const width = loopWidthRef.current;
      const next = normalizeScroll(value, width);

      positionRef.current = next;
      track.scrollLeft = next;
    },
    [normalizeScroll]
  );

  const measureTrack = useCallback(() => {
    const track = trackRef.current;

    if (!track || products.length < 2) {
      return;
    }

    const first = track.children[0];
    const secondSet = track.children[products.length];

    if (!first || !secondSet) return;

    const distance =
      secondSet.offsetLeft - first.offsetLeft;

    if (distance <= 0) return;

    const previousWidth = loopWidthRef.current;

    loopWidthRef.current = distance;

    if (
      previousWidth > 0 &&
      previousWidth !== distance
    ) {
      positionRef.current =
        (positionRef.current / previousWidth) *
        distance;
    }

    setScrollPosition(positionRef.current);
  }, [products.length, setScrollPosition]);

  useEffect(() => {
    if (
      !canAutoScroll ||
      reducedMotion ||
      loading
    ) {
      return undefined;
    }

    const track = trackRef.current;
    if (!track) return undefined;

    measureTrack();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measureTrack)
        : null;

    observer?.observe(track);

    if (track.firstElementChild) {
      observer?.observe(track.firstElementChild);
    }

    let cancelled = false;

    lastTimeRef.current = null;

    function animate(timestamp) {
      if (cancelled) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const delta = Math.min(
        timestamp - lastTimeRef.current,
        50
      );

      lastTimeRef.current = timestamp;

      const paused =
        document.hidden ||
        hoverRef.current ||
        focusRef.current ||
        touchRef.current ||
        manualFrameRef.current !== null ||
        timestamp < pauseUntilRef.current;

      if (!paused && loopWidthRef.current > 0) {
        setScrollPosition(
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
      lastTimeRef.current = null;

      observer?.disconnect();
    };
  }, [
    canAutoScroll,
    reducedMotion,
    loading,
    measureTrack,
    setScrollPosition,
  ]);

  function moveOne(direction) {
    const track = trackRef.current;

    if (!track || !canAutoScroll) return;

    pauseAuto(3500);
    measureTrack();

    if (manualFrameRef.current !== null) {
      window.cancelAnimationFrame(
        manualFrameRef.current
      );

      manualFrameRef.current = null;
    }

    const first = track.querySelector(".featured-card");
    const styles = window.getComputedStyle(track);

    const gap =
      parseFloat(styles.columnGap) ||
      parseFloat(styles.gap) ||
      0;

    const step =
      (first?.getBoundingClientRect().width || 178) +
      gap;

    const start = positionRef.current;
    const distance = step * direction;

    if (reducedMotion) {
      setScrollPosition(start + distance);
      return;
    }

    let startedAt = null;

    function animate(timestamp) {
      if (startedAt === null) {
        startedAt = timestamp;
      }

      const progress = Math.min(
        (timestamp - startedAt) / 380,
        1
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      setScrollPosition(
        start + distance * eased
      );

      if (progress < 1) {
        manualFrameRef.current =
          window.requestAnimationFrame(animate);
      } else {
        manualFrameRef.current = null;
      }
    }

    manualFrameRef.current =
      window.requestAnimationFrame(animate);
  }

  useEffect(() => {
    return () => {
      if (manualFrameRef.current !== null) {
        window.cancelAnimationFrame(
          manualFrameRef.current
        );
      }
    };
  }, []);

  return (
    <section
      className="featured-products"
      id="featured-products"
      aria-labelledby="featured-products-title"
    >
      <div className="featured-products__container">
        <header className="featured-products__header">
          <div className="featured-products__heading">
            <span className="featured-products__eyebrow">
              FEATURED PRODUCTS
            </span>

            <h2 id="featured-products-title">
              {section?.title ||
                "Handpicked for Your Journey"}
            </h2>

            <p>
              {section?.subtitle ||
                "Handpicked for your wellness journey"}
            </p>
          </div>

          <Link
            to="/products"
            className="featured-products__view-all"
          >
            View All
            <ArrowRight size={15} />
          </Link>
        </header>

        {error && (
          <p
            className="featured-products__error"
            role="status"
          >
            {error}
          </p>
        )}

        <div
          className="featured-products__carousel"
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
          {canAutoScroll && (
            <button
              type="button"
              className="featured-products__arrow featured-products__arrow--left"
              aria-label="Previous featured products"
              onClick={() => moveOne(-1)}
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div
            ref={trackRef}
            className="featured-products__row"
            onScroll={(event) => {
              positionRef.current =
                event.currentTarget.scrollLeft;
            }}
            onWheel={() => pauseAuto()}
            onTouchStart={() => {
              touchRef.current = true;
              pauseAuto();
            }}
            onTouchEnd={() => {
              touchRef.current = false;
              pauseAuto();
            }}
            onPointerDown={() => {
              touchRef.current = true;
              pauseAuto();
            }}
            onPointerUp={() => {
              touchRef.current = false;
              pauseAuto();
            }}
            onPointerCancel={() => {
              touchRef.current = false;
              pauseAuto();
            }}
          >
            {loading &&
              Array.from({ length: 6 }).map(
                (_, index) => (
                  <div
                    className="featured-card featured-card--loading"
                    key={`loading-${index}`}
                    aria-hidden="true"
                  >
                    <div className="featured-card__skeleton-image" />
                    <div className="featured-card__skeleton-line" />
                    <div className="featured-card__skeleton-line featured-card__skeleton-line--short" />
                  </div>
                )
              )}

            {!loading && products.length === 0 && (
              <div className="featured-products__empty">
                <p>
                  {error ||
                    "Featured products are currently unavailable."}
                </p>

                <Link to="/products">
                  Browse Products
                </Link>
              </div>
            )}

            {!loading &&
              displayedProducts.map((product, index) => (
                <FeaturedProductCard
                  key={`${product.id}-${index}`}
                  product={product}
                  duplicate={
                    canAutoScroll &&
                    index >= products.length
                  }
                  onInteraction={pauseAuto}
                />
              ))}
          </div>

          {canAutoScroll && (
            <button
              type="button"
              className="featured-products__arrow featured-products__arrow--right"
              aria-label="Next featured products"
              onClick={() => moveOne(1)}
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
