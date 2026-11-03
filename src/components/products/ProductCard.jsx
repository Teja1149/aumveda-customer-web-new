
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Image as ImageIcon,
} from "lucide-react";

import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";

import "../../styles/product-card.css";

const BUY_NOW_STORAGE_KEY = "aumveda_buy_now";
const IMAGE_INTERVAL = 1100;

const previewedProducts = new Set();

const priceFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "—";
  }

  return priceFormatter.format(Number(value));
}

function getProductImages(product) {
  if (!product) return [];

  const images = new Map();

  function addImage(value, options = {}) {
    if (!value) return;

    const url =
      typeof value === "string"
        ? value
        : value.image_url ||
          value.url ||
          value.src ||
          value.public_url ||
          value.image ||
          "";

    if (typeof url !== "string" || !url.trim()) {
      return;
    }

    const cleanUrl = url.trim();

    const primary = Boolean(
      options.primary ||
        (typeof value === "object" &&
          (value.is_primary || value.is_default))
    );

    const rawOrder =
      typeof value === "object"
        ? value.sort_order ??
          value.display_order ??
          value.position ??
          options.order
        : options.order;

    const numberOrder = Number(rawOrder);

    const order =
      rawOrder != null && Number.isFinite(numberOrder)
        ? numberOrder
        : 9999;

    const existing = images.get(cleanUrl);

    if (existing) {
      existing.primary = existing.primary || primary;
      existing.order = Math.min(existing.order, order);
      return;
    }

    images.set(cleanUrl, {
      url: cleanUrl,
      primary,
      order,
      insertion: images.size,
    });
  }

  const collections = [
    product.product_images,
    product.images,
    product.gallery_images,
  ];

  collections.forEach((collection) => {
    if (!Array.isArray(collection)) return;

    collection.forEach((item, index) => {
      addImage(item, { order: index });
    });
  });

  const hasGallery = images.size > 0;

  addImage(product.image, {
    primary: !hasGallery,
  });

  addImage(product.image_url, {
    primary: !hasGallery && !product.image,
  });

  addImage(product.thumbnail_url, {
    primary:
      !hasGallery &&
      !product.image &&
      !product.image_url,
  });

  return [...images.values()]
    .sort(
      (a, b) =>
        Number(b.primary) - Number(a.primary) ||
        a.order - b.order ||
        a.insertion - b.insertion
    )
    .map((item) => item.url);
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const {
    addToCart,
    getCartItem,
    updateCartItem,
    removeFromCart,
  } = useCart();

  const {
    isWishlisted,
    toggleWishlist,
  } = useWishlist();

  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  const [imageIndex, setImageIndex] = useState(0);
  const [imageDirection, setImageDirection] = useState(1);
  const [brokenImages, setBrokenImages] = useState([]);

  const [hoveredSide, setHoveredSide] = useState(null);

  const timerRef = useRef(null);
  const imageIndexRef = useRef(0);
  const previewStartedRef = useRef(false);
  const pointerInsideRef = useRef(false);

  const previewKey = String(
    product?.id || product?.slug || ""
  );

  const images = useMemo(
    () => getProductImages(product),
    [product]
  );

  const imageSignature = images.join("\u0001");

  const validImages = useMemo(
    () =>
      images.filter(
        (url) => !brokenImages.includes(url)
      ),
    [images, brokenImages]
  );

  const imageCount = validImages.length;

  const safeIndex =
    imageCount > 0 ? imageIndex % imageCount : 0;

  const activeImage = validImages[safeIndex] || "";

  const isInWishlist = isWishlisted(product.id);

  const cartItem = getCartItem(product);

  const cartQuantity = Number(
    cartItem?.quantity || 0
  );

  const stock = Number(
    cartItem?.variant?.stock_quantity ??
      product?.variant?.stock_quantity ??
      product?.stock_quantity ??
      0
  );

  const maxStockReached =
    stock > 0 && cartQuantity >= stock;

  const outOfStock = product?.in_stock === false;

  const price = Number(
    product?.price ??
      product?.variant?.price ??
      0
  );

  const compareAt = Number(
    product?.compare_at_price ??
      product?.variant?.compare_at_price ??
      0
  );

  const discount =
    price > 0 && compareAt > price
      ? Math.round(
          ((compareAt - price) / compareAt) * 100
        )
      : 0;

  const rating = Number(
    product?.rating ??
      product?.average_rating ??
      0
  );

  function stopPreview() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function setGalleryIndex(nextIndex, direction = 1) {
    if (imageCount === 0) return;

    const normalized =
      ((nextIndex % imageCount) + imageCount) %
      imageCount;

    imageIndexRef.current = normalized;

    setImageDirection(direction);
    setImageIndex(normalized);
  }

  function resetPreview() {
    stopPreview();

    pointerInsideRef.current = false;

    setHoveredSide(null);

    imageIndexRef.current = 0;
    setImageIndex(0);
  }

  function startPreview(event) {
    if (
      event?.pointerType &&
      event.pointerType !== "mouse"
    ) {
      return;
    }

    pointerInsideRef.current = true;

    if (
      imageCount < 2 ||
      !previewKey ||
      previewStartedRef.current ||
      previewedProducts.has(previewKey) ||
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    previewStartedRef.current = true;
    previewedProducts.add(previewKey);

    stopPreview();

    imageIndexRef.current = 0;
    setImageIndex(0);

    timerRef.current = window.setInterval(() => {
      if (
        !pointerInsideRef.current ||
        document.hidden
      ) {
        stopPreview();
        return;
      }

      const next = imageIndexRef.current + 1;

      if (next >= imageCount) {
        stopPreview();
        return;
      }

      setGalleryIndex(next, 1);

      if (next === imageCount - 1) {
        stopPreview();
      }
    }, IMAGE_INTERVAL);
  }

  function navigateImage(direction) {
    stopPreview();

    if (imageCount < 2) return;

    setGalleryIndex(
      imageIndexRef.current + direction,
      direction
    );
  }

  function handleImageError(url) {
    if (!url) return;

    setBrokenImages((current) =>
      current.includes(url)
        ? current
        : [...current, url]
    );

    stopPreview();

    imageIndexRef.current = 0;
    setImageIndex(0);
  }

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    previewStartedRef.current = false;
    imageIndexRef.current = 0;
    pointerInsideRef.current = false;

    setImageIndex(0);
    setBrokenImages([]);
    setHoveredSide(null);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [previewKey, imageSignature]);

  function openProduct() {
    if (!product?.slug) return;

    navigate(
      `/products/${encodeURIComponent(product.slug)}`
    );
  }

  function handleProductKeyDown(event) {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openProduct();
    }
  }

  async function handleWishlist(event) {
    event.stopPropagation();

    try {
      await toggleWishlist(product.id);
    } catch (error) {
      console.error(
        "Wishlist update failed:",
        error
      );
    }
  }

  async function handleAddToCart(event) {
    event.stopPropagation();

    if (outOfStock || cartLoading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      setCartLoading(true);

      await addToCart(product, 1);
    } catch (error) {
      console.error(
        "Add to cart failed:",
        error
      );
    } finally {
      setCartLoading(false);
    }
  }

  async function handleDecrease(event) {
    event.stopPropagation();

    if (!cartItem || cartLoading) return;

    try {
      setCartLoading(true);

      if (cartQuantity <= 1) {
        await removeFromCart(cartItem.id);
      } else {
        await updateCartItem(
          cartItem.id,
          cartQuantity - 1
        );
      }
    } catch (error) {
      console.error(
        "Decrease quantity failed:",
        error
      );
    } finally {
      setCartLoading(false);
    }
  }

  async function handleIncrease(event) {
    event.stopPropagation();

    if (
      !cartItem ||
      cartLoading ||
      maxStockReached
    ) {
      return;
    }

    try {
      setCartLoading(true);

      await updateCartItem(
        cartItem.id,
        cartQuantity + 1
      );
    } catch (error) {
      console.error(
        "Increase quantity failed:",
        error
      );
    } finally {
      setCartLoading(false);
    }
  }

  function handleBuyNow(event) {
    event.stopPropagation();

    if (outOfStock || buyLoading) return;

    try {
      setBuyLoading(true);

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
          state: {
            buyNow: payload,
          },
        });
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
    } catch (error) {
      console.error(
        "Buy Now failed:",
        error
      );

      setBuyLoading(false);
    }
  }

  return (
    <motion.article
      className="product-card"
      initial={{
        opacity: 0,
        y: 12,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.1,
      }}
      transition={{
        duration: 0.32,
      }}
    >
      {/* PRODUCT IMAGE */}

      <div
        className="product-card__image-box product-card__clickable"
        role="link"
        tabIndex={0}
        onClick={openProduct}
        onKeyDown={handleProductKeyDown}
        onPointerEnter={startPreview}
        onPointerLeave={resetPreview}
        aria-label={`View ${product.name}`}
      >
        {discount > 0 && (
          <span className="product-card__discount">
            Save {discount}%
          </span>
        )}

        <div className="product-card__image-stage">
          {activeImage ? (
            <img
              key={`${previewKey}-${activeImage}-${safeIndex}`}
              src={activeImage}
              alt={`${product.name} - image ${
                safeIndex + 1
              }`}
              className={
                "product-card__image product-card__image--slide " +
                (imageDirection < 0
                  ? "product-card__image--from-left"
                  : "product-card__image--from-right")
              }
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() =>
                handleImageError(activeImage)
              }
            />
          ) : (
            <span className="product-card__image-fallback">
              <ImageIcon size={28} />
            </span>
          )}
        </div>

        {/* GALLERY NAVIGATION */}

        {imageCount > 1 && (
          <>
            <button
              type="button"
              className="product-card__image-zone product-card__image-zone--left"
              aria-label="Previous product image"
              tabIndex={-1}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") {
                  setHoveredSide("left");
                  navigateImage(-1);
                }
              }}
              onPointerLeave={() =>
                setHoveredSide(null)
              }
              onClick={(event) => {
                event.stopPropagation();
                navigateImage(-1);
              }}
            >
              <span
                className={
                  "product-card__gallery-arrow" +
                  (hoveredSide === "left"
                    ? " is-visible"
                    : "")
                }
              >
                <ChevronLeft size={17} />
              </span>
            </button>

            <button
              type="button"
              className="product-card__image-zone product-card__image-zone--right"
              aria-label="Next product image"
              tabIndex={-1}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") {
                  setHoveredSide("right");
                  navigateImage(1);
                }
              }}
              onPointerLeave={() =>
                setHoveredSide(null)
              }
              onClick={(event) => {
                event.stopPropagation();
                navigateImage(1);
              }}
            >
              <span
                className={
                  "product-card__gallery-arrow" +
                  (hoveredSide === "right"
                    ? " is-visible"
                    : "")
                }
              >
                <ChevronRight size={17} />
              </span>
            </button>

            <div className="product-card__gallery-indicator">
              {validImages
                .slice(0, 6)
                .map((url, index) => (
                  <span
                    key={`${url}-${index}`}
                    className={
                      "product-card__gallery-dot" +
                      (index === safeIndex
                        ? " is-active"
                        : "")
                    }
                  />
                ))}

              {imageCount > 6 && (
                <small>
                  +{imageCount - 6}
                </small>
              )}
            </div>

            <span className="product-card__image-counter">
              {safeIndex + 1}/{imageCount}
            </span>
          </>
        )}

        {/* WISHLIST */}

        <button
          type="button"
          className={
            "product-card__wishlist" +
            (isInWishlist
              ? " is-active"
              : "")
          }
          onClick={handleWishlist}
          aria-label={
            isInWishlist
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          title={
            isInWishlist
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
        >
          <Heart
            size={18}
            fill={
              isInWishlist
                ? "currentColor"
                : "none"
            }
          />
        </button>
      </div>

      {/* PRODUCT CONTENT */}

      <div className="product-card__content">
        <div className="product-card__title-row">
          <h3
            className="product-card__title-link"
            role="link"
            tabIndex={0}
            onClick={openProduct}
            onKeyDown={handleProductKeyDown}
          >
            {product.name}
          </h3>
        </div>

        <p className="product-card__description">
          {product.short_description ||
            product.description ||
            "Explore AUMVEDA wellness essentials."}
        </p>

        {/* RATING LEFT + PRICE RIGHT */}

        <div className="product-card__rating-price-row">
          <div className="product-card__rating">
            <Star
              size={13}
              fill="currentColor"
            />

            <span>
              {Number.isFinite(rating)
                ? rating.toFixed(1)
                : "0.0"}
            </span>

            <small>
              ({product.review_count || 0})
            </small>
          </div>

          <div className="product-card__price-row">
            <div className="product-card__prices">
              <strong>
                ₹{formatPrice(price)}
              </strong>

              {compareAt > price && (
                <del>
                  ₹{formatPrice(compareAt)}
                </del>
              )}
            </div>
          </div>
        </div>

        {/* CART AND BUY NOW */}

        <div className="product-card__actions">
          {cartItem && cartQuantity > 0 ? (
            <div className="product-card__quantity-control">
              <button
                type="button"
                onClick={handleDecrease}
                disabled={cartLoading}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>

              <strong>
                {cartQuantity}
              </strong>

              <button
                type="button"
                onClick={handleIncrease}
                disabled={
                  cartLoading ||
                  maxStockReached
                }
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={
                "product-card__cart" +
                (outOfStock
                  ? " is-disabled"
                  : "")
              }
              onClick={handleAddToCart}
              disabled={
                outOfStock ||
                cartLoading
              }
            >
              <ShoppingBag size={15} />

              {outOfStock
                ? "Out of Stock"
                : cartLoading
                  ? "Adding..."
                  : "Add to Cart"}
            </button>
          )}

          <button
            type="button"
            className="product-card__buy-now"
            onClick={handleBuyNow}
            disabled={
              outOfStock ||
              buyLoading
            }
          >
            {buyLoading
              ? "Opening..."
              : "Buy Now"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
