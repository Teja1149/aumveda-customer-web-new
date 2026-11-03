
import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    ArrowLeft,
    Heart,
    ImageOff,
    Minus,
    PackageCheck,
    Plus,
    ShoppingBag,
    Sparkles,
    Star
} from "lucide-react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import {
    getProductBySlug,
    getProducts,
    recordRecentlyViewedProduct
} from "../services/productService";

import {
    useAuth
} from "../context/AuthContext";

import {
    useCart
} from "../context/CartContext";

import {
    useWishlist
} from "../context/WishlistContext";

import ProductGrid from "../components/products/ProductGrid";

import "../styles/product-details.css";


/* ============================================================
   AUMVEDA — PRODUCT DETAILS

   FEATURES:
   - Product details
   - Multiple product images
   - Product variants
   - Stock validation
   - Add to cart
   - Cart quantity controls
   - Buy Now
   - Wishlist
   - Related products
   - Authenticated Recently Viewed tracking

   Existing styling and route conventions preserved.
============================================================ */

const BUY_NOW_STORAGE_KEY = "aumveda_buy_now";


/* ============================================================
   FORMAT PRICE
============================================================ */

function formatPrice(value) {
    if (value === null || value === undefined) {
        return "—";
    }

    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0
    }).format(Number(value));
}


/* ============================================================
   PRODUCT DETAILS COMPONENT
============================================================ */

function ProductDetails() {

    const { slug } = useParams();

    const navigate = useNavigate();


    /* ========================================================
       AUTHENTICATION
    ======================================================== */

    const { isAuthenticated } = useAuth();


    /* ========================================================
       CART
    ======================================================== */

    const {
        items,
        addToCart,
        updateCartItem,
        removeFromCart
    } = useCart();


    /* ========================================================
       WISHLIST
    ======================================================== */

    const {
        isWishlisted,
        toggleWishlist
    } = useWishlist();


    /* ========================================================
       PRODUCT STATE
    ======================================================== */

    const [product, setProduct] = useState(null);

    const [relatedProducts, setRelatedProducts] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [productImages, setProductImages] = useState([]);

    const [variants, setVariants] = useState([]);

    const [selectedImage, setSelectedImage] = useState(null);

    const [selectedVariant, setSelectedVariant] = useState(null);

    const [cartActionLoading, setCartActionLoading] = useState(false);

    const [buyNowLoading, setBuyNowLoading] = useState(false);


    /* ========================================================
       RECENTLY VIEWED TRACKING STATE

       Prevent repeated POST requests for the same product
       within the same mounted product-details session.

       Tracking is best-effort and never blocks the page.
    ======================================================== */

    const recordedProductRef = useRef(null);


    /* ========================================================
       LOAD PRODUCT DETAILS
    ======================================================== */

    useEffect(() => {

        if (!slug) {
            setLoading(false);
            setError("Product not found.");
            return;
        }

        let cancelled = false;

        async function loadProduct() {

            try {

                setLoading(true);
                setError("");

                const productData = await getProductBySlug(slug);

                if (cancelled) {
                    return;
                }

                if (!productData) {
                    throw new Error("Product not found");
                }

                setProduct(productData);


                /* =============================================
                   PRODUCT IMAGE GALLERY
                ============================================= */

                const images = [
                    ...(productData.product_images || [])
                ].sort((first, second) => {

                    if (first.is_primary && !second.is_primary) {
                        return -1;
                    }

                    if (!first.is_primary && second.is_primary) {
                        return 1;
                    }

                    return (
                        Number(first.sort_order ?? 9999) -
                        Number(second.sort_order ?? 9999)
                    );

                });

                setProductImages(images);

                setSelectedImage(images[0] || null);


                /* =============================================
                   PRODUCT VARIANTS
                ============================================= */

                const activeVariants = (
                    productData.product_variants || []
                ).filter(
                    variant => variant.is_active !== false
                );

                setVariants(activeVariants);

                const defaultVariant =
                    activeVariants.find(variant =>
                        variant.is_default === true ||
                        variant.attributes?.is_default === true
                    ) ||
                    activeVariants[0] ||
                    null;

                setSelectedVariant(defaultVariant);


                /* =============================================
                   RELATED PRODUCTS
                ============================================= */

                try {

                    const allProducts = await getProducts();

                    if (cancelled) {
                        return;
                    }

                    const related = (
                        Array.isArray(allProducts)
                            ? allProducts
                            : []
                    )
                        .filter(item =>
                            item.id !== productData.id &&
                            item.category_id === productData.category_id
                        )
                        .slice(0, 4);

                    setRelatedProducts(related);

                } catch (relatedError) {

                    console.error(
                        "Related products loading failed:",
                        relatedError
                    );

                    if (!cancelled) {
                        setRelatedProducts([]);
                    }

                }

            } catch (loadError) {

                if (cancelled) {
                    return;
                }

                console.error(
                    "Product details loading failed:",
                    loadError
                );

                setProduct(null);
                setProductImages([]);
                setVariants([]);
                setSelectedImage(null);
                setSelectedVariant(null);
                setRelatedProducts([]);

                setError("Unable to load this product.");

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        }

        loadProduct();

        return () => {
            cancelled = true;
        };

    }, [slug]);


    /* ========================================================
       RECORD RECENTLY VIEWED PRODUCT

       API:
       POST /api/v1/recently-viewed/{product_id}

       IMPORTANT:
       - Only authenticated customers
       - Only successfully loaded products
       - Never track stale product data after navigation
       - No customer ID sent from frontend
       - Tracking failures do not affect product browsing
    ======================================================== */

    useEffect(() => {

        if (
            !isAuthenticated ||
            loading ||
            error ||
            !product?.id ||
            !slug ||
            product.slug !== slug
        ) {
            return;
        }

        const productId = String(product.id);

        if (recordedProductRef.current === productId) {
            return;
        }

        recordedProductRef.current = productId;

        let cancelled = false;

        async function recordView() {

            try {

                await recordRecentlyViewedProduct(productId);

                if (!cancelled) {
                    console.info(
                        "[AUMVEDA] Recently viewed product recorded:",
                        productId
                    );
                }

            } catch (trackingError) {

                if (!cancelled) {

                    console.warn(
                        "[AUMVEDA] Recently viewed tracking failed:",
                        trackingError
                    );

                }

                // Allow a later visit to retry after failure.
                if (recordedProductRef.current === productId) {
                    recordedProductRef.current = null;
                }

            }

        }

        recordView();

        return () => {
            cancelled = true;
        };

    }, [
        isAuthenticated,
        loading,
        error,
        product?.id,
        product?.slug,
        slug
    ]);


    /* ========================================================
       CURRENT PRODUCT IMAGE
    ======================================================== */

    const mainImage =
        selectedImage?.image_url ||
        product?.image ||
        product?.image_url ||
        null;

    const hasMultipleImages = productImages.length > 1;


    /* ========================================================
       PRODUCT PRICE
    ======================================================== */

    const currentPrice = Number(
        selectedVariant?.price ??
        product?.price ??
        0
    );

    const comparePrice = Number(
        selectedVariant?.compare_at_price ??
        product?.compare_at_price ??
        0
    );

    const discount =
        comparePrice > currentPrice && currentPrice > 0
            ? Math.round(
                ((comparePrice - currentPrice) / comparePrice) * 100
            )
            : 0;


    /* ========================================================
       STOCK
    ======================================================== */

    const stockQuantity = Number(
        selectedVariant?.stock_quantity ?? 0
    );

    const inStock = stockQuantity > 0;


    /* ========================================================
       ACTIONABLE PRODUCT

       Reuses the existing cart / checkout data structure.
    ======================================================== */

    const actionableProduct = product
        ? {
            ...product,
            image: mainImage,
            price: currentPrice,
            compare_at_price: comparePrice,
            variant: selectedVariant
        }
        : null;


    /* ========================================================
       FIND EXISTING CART ITEM
    ======================================================== */

    const cartItem =
        product && selectedVariant
            ? (
                items.find(item => {

                    const itemProductId =
                        item?.product?.id ??
                        item?.product_id ??
                        null;

                    const itemVariantId =
                        item?.variant?.id ??
                        item?.variant_id ??
                        null;

                    return (
                        String(itemProductId) === String(product.id) &&
                        String(itemVariantId) === String(selectedVariant.id)
                    );

                }) || null
            )
            : null;

    const productIsInCart = Boolean(cartItem);

    const cartQuantity = Number(cartItem?.quantity || 0);

    const maximumStockReached =
        stockQuantity > 0 &&
        cartQuantity >= stockQuantity;


    /* ========================================================
       WISHLIST STATUS
    ======================================================== */

    const productIsWishlisted = product
        ? isWishlisted(product.id)
        : false;


    /* ========================================================
       WISHLIST ACTION
    ======================================================== */

    function handleWishlist() {

        if (!product) {
            return;
        }

        toggleWishlist(product.id);

    }


    /* ========================================================
       VARIANT SELECTION
    ======================================================== */

    function handleVariantChange(variant) {

        if (cartActionLoading || buyNowLoading) {
            return;
        }

        setSelectedVariant(variant);

    }


    /* ========================================================
       ADD TO CART
    ======================================================== */

    async function handleAddToCart() {

        if (
            !product ||
            !selectedVariant ||
            !actionableProduct ||
            !inStock ||
            cartActionLoading
        ) {
            return;
        }

        if (!isAuthenticated) {

            navigate("/login", {
                state: {
                    from: {
                        pathname: `/products/${product.slug}`
                    }
                }
            });

            return;
        }

        try {

            setCartActionLoading(true);

            await addToCart(actionableProduct, 1);

        } catch (cartError) {

            console.error(
                "Add to cart failed:",
                cartError
            );

        } finally {

            setCartActionLoading(false);

        }

    }


    /* ========================================================
       DECREASE CART QUANTITY
    ======================================================== */

    async function handleDecreaseQuantity() {

        if (!cartItem || cartActionLoading) {
            return;
        }

        try {

            setCartActionLoading(true);

            if (cartQuantity <= 1) {

                await removeFromCart(cartItem.id);
                return;

            }

            await updateCartItem(
                cartItem.id,
                cartQuantity - 1
            );

        } catch (cartError) {

            console.error(
                "Decrease quantity failed:",
                cartError
            );

        } finally {

            setCartActionLoading(false);

        }

    }


    /* ========================================================
       INCREASE CART QUANTITY
    ======================================================== */

    async function handleIncreaseQuantity() {

        if (
            !cartItem ||
            cartActionLoading ||
            maximumStockReached
        ) {
            return;
        }

        try {

            setCartActionLoading(true);

            await updateCartItem(
                cartItem.id,
                cartQuantity + 1
            );

        } catch (cartError) {

            console.error(
                "Increase quantity failed:",
                cartError
            );

        } finally {

            setCartActionLoading(false);

        }

    }


    /* ========================================================
       BUY NOW

       Preserves the existing sessionStorage checkout flow.
    ======================================================== */

    function handleBuyNow() {

        if (
            !product ||
            !selectedVariant ||
            !actionableProduct ||
            !inStock ||
            buyNowLoading
        ) {
            return;
        }

        try {

            setBuyNowLoading(true);

            const buyNowQuantity = productIsInCart
                ? cartQuantity
                : 1;

            const buyNowPayload = {
                product: actionableProduct,
                quantity: buyNowQuantity
            };

            sessionStorage.setItem(
                BUY_NOW_STORAGE_KEY,
                JSON.stringify(buyNowPayload)
            );

            if (isAuthenticated) {

                navigate("/checkout?mode=buy-now", {
                    state: {
                        buyNow: buyNowPayload
                    }
                });

                return;
            }

            navigate("/login", {
                state: {
                    from: {
                        pathname: "/checkout?mode=buy-now"
                    }
                }
            });

        } catch (buyError) {

            console.error(
                "Buy Now failed:",
                buyError
            );

            setBuyNowLoading(false);

        }

    }


    /* ========================================================
       LOADING STATE
    ======================================================== */

    if (loading) {

        return (
            <main className="product-details-page">
                <div className="product-details-loading">

                    <div className="product-details-spinner" />

                    <p>Loading product...</p>

                </div>
            </main>
        );

    }


    /* ========================================================
       ERROR STATE
    ======================================================== */

    if (error || !product) {

        return (
            <main className="product-details-page">
                <div className="product-details-error">

                    <PackageCheck size={44} />

                    <h1>Product unavailable</h1>

                    <p>
                        {error || "This product could not be found."}
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/products")}
                    >
                        <ArrowLeft size={16} />
                        Back to Products
                    </button>

                </div>
            </main>
        );

    }


    /* ========================================================
       PRODUCT DETAILS PAGE
    ======================================================== */

    return (

        <main className="product-details-page">

            <div className="product-details-container">

                {/* =================================================
                    BACK TO PRODUCTS
                ================================================= */}

                <button
                    type="button"
                    className="product-details-back"
                    onClick={() => navigate("/products")}
                >
                    <ArrowLeft size={15} />
                    Products
                </button>


                {/* =================================================
                    PRODUCT MAIN SECTION
                ================================================= */}

                <section className="product-details-main">

                    {/* =============================================
                        PRODUCT IMAGE GALLERY
                    ============================================= */}

                    <div
                        className={`
                            product-details-gallery
                            ${
                                hasMultipleImages
                                    ? ""
                                    : "product-details-gallery--single"
                            }
                        `}
                    >

                        {hasMultipleImages && (

                            <div className="product-details-thumbnails">

                                {productImages.map(image => (

                                    <button
                                        key={image.id}
                                        type="button"
                                        className={`
                                            product-details-thumbnail
                                            ${
                                                selectedImage?.id === image.id
                                                    ? "is-active"
                                                    : ""
                                            }
                                        `}
                                        onClick={() =>
                                            setSelectedImage(image)
                                        }
                                    >

                                        <img
                                            src={image.image_url}
                                            alt={
                                                image.alt_text ||
                                                product.name
                                            }
                                        />

                                    </button>

                                ))}

                            </div>

                        )}


                        {/* MAIN IMAGE */}

                        <div className="product-details-main-image">

                            {discount > 0 && (

                                <span className="product-details-discount">
                                    {discount}% OFF
                                </span>

                            )}


                            {/* WISHLIST */}

                            <button
                                type="button"
                                className={`
                                    product-details-wishlist
                                    ${
                                        productIsWishlisted
                                            ? "is-active"
                                            : ""
                                    }
                                `}
                                onClick={handleWishlist}
                                aria-label={
                                    productIsWishlisted
                                        ? "Remove from wishlist"
                                        : "Add to wishlist"
                                }
                            >

                                <Heart
                                    size={20}
                                    fill={
                                        productIsWishlisted
                                            ? "currentColor"
                                            : "none"
                                    }
                                />

                            </button>


                            {/* PRODUCT IMAGE */}

                            {mainImage ? (

                                <img
                                    src={mainImage}
                                    alt={product.name}
                                />

                            ) : (

                                <div className="product-details-no-image">
                                    <ImageOff size={42} />

                                    <span>
                                        Image unavailable
                                    </span>
                                </div>

                            )}

                        </div>

                    </div>


                    {/* =============================================
                        PRODUCT INFORMATION
                    ============================================= */}

                    <div className="product-details-info">

                        <div className="product-details-eyebrow">
                            <Sparkles size={12} />
                            FEATURED PRODUCT
                        </div>

                        <h1>{product.name}</h1>


                        {/* RATING */}

                        <div className="product-details-rating">

                            <div>
                                <Star
                                    size={15}
                                    fill="currentColor"
                                />

                                <strong>
                                    {Number(
                                        product.average_rating ??
                                        product.rating ??
                                        0
                                    ).toFixed(1)}
                                </strong>
                            </div>

                            <span>
                                {product.review_count || 0}

                                {Number(product.review_count || 0) === 1
                                    ? " review"
                                    : " reviews"}
                            </span>

                        </div>


                        {/* SHORT DESCRIPTION */}

                        {(
                            product.short_description ||
                            product.description
                        ) && (

                            <p className="product-details-short-description">
                                {
                                    product.short_description ||
                                    product.description
                                }
                            </p>

                        )}


                        {/* PRICE */}

                        <div className="product-details-price">

                            <strong>
                                ₹{formatPrice(currentPrice)}
                            </strong>

                            {comparePrice > currentPrice && (

                                <del>
                                    ₹{formatPrice(comparePrice)}
                                </del>

                            )}

                            {discount > 0 && (

                                <span>
                                    Save {discount}%
                                </span>

                            )}

                        </div>


                        {/* =========================================
                            PRODUCT VARIANTS
                        ========================================= */}

                        {variants.length > 0 && (

                            <div className="product-details-option">

                                <div className="product-details-option-header">

                                    <span>
                                        Choose an option
                                    </span>

                                    <strong>
                                        {
                                            selectedVariant?.name ||
                                            "Select"
                                        }
                                    </strong>

                                </div>


                                <div className="product-details-variants">

                                    {variants.map(variant => {

                                        const variantStock = Number(
                                            variant.stock_quantity || 0
                                        );

                                        return (

                                            <button
                                                key={variant.id}
                                                type="button"
                                                className={`
                                                    product-details-variant
                                                    ${
                                                        selectedVariant?.id ===
                                                        variant.id
                                                            ? "is-active"
                                                            : ""
                                                    }
                                                `}
                                                disabled={
                                                    variantStock <= 0
                                                }
                                                onClick={() =>
                                                    handleVariantChange(
                                                        variant
                                                    )
                                                }
                                            >
                                                {variant.name}
                                            </button>

                                        );

                                    })}

                                </div>

                            </div>

                        )}


                        {/* =========================================
                            STOCK STATUS
                        ========================================= */}

                        <div className="product-details-stock">

                            <span
                                className={
                                    inStock
                                        ? "in-stock"
                                        : "out-of-stock"
                                }
                            >
                                <span />

                                {
                                    inStock
                                        ? stockQuantity <= 10
                                            ? `Only ${stockQuantity} left`
                                            : "In Stock"
                                        : "Out of Stock"
                                }

                            </span>

                        </div>


                        {/* =========================================
                            PURCHASE ACTIONS
                        ========================================= */}

                        <div className="product-details-purchase">

                            {!productIsInCart ? (

                                <button
                                    type="button"
                                    className="product-details-cart"
                                    onClick={handleAddToCart}
                                    disabled={
                                        !inStock ||
                                        !selectedVariant ||
                                        cartActionLoading
                                    }
                                >
                                    <ShoppingBag size={17} />

                                    {
                                        cartActionLoading
                                            ? "Adding..."
                                            : "Add to Cart"
                                    }
                                </button>

                            ) : (

                                <div className="product-details-quantity">

                                    <button
                                        type="button"
                                        onClick={handleDecreaseQuantity}
                                        disabled={cartActionLoading}
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={15} />
                                    </button>

                                    <span>
                                        {
                                            cartActionLoading
                                                ? "..."
                                                : cartQuantity
                                        }
                                    </span>

                                    <button
                                        type="button"
                                        onClick={handleIncreaseQuantity}
                                        disabled={
                                            cartActionLoading ||
                                            maximumStockReached
                                        }
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={15} />
                                    </button>

                                </div>

                            )}


                            <button
                                type="button"
                                className="product-details-buy-now"
                                onClick={handleBuyNow}
                                disabled={
                                    !inStock ||
                                    !selectedVariant ||
                                    buyNowLoading
                                }
                            >
                                {
                                    buyNowLoading
                                        ? "Opening..."
                                        : "Buy Now"
                                }
                            </button>

                        </div>


                        {/* =========================================
                            SHOP BENEFITS
                        ========================================= */}

                        <div className="product-details-shop-info">

                            <div>
                                <ShoppingBag size={17} />

                                <span>
                                    <strong>Easy shopping</strong>
                                    Quick cart controls
                                </span>
                            </div>

                            <div>
                                <Heart size={17} />

                                <span>
                                    <strong>Wishlist</strong>
                                    Save for later
                                </span>
                            </div>

                            <div>
                                <PackageCheck size={17} />

                                <span>
                                    <strong>Stock status</strong>
                                    Updated by option
                                </span>
                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    PRODUCT DETAILS CONTENT
                ================================================= */}

                {(
                    product.description ||
                    product.ingredients ||
                    product.benefits ||
                    product.directions ||
                    product.warnings
                ) && (

                    <section className="product-details-description">

                        <div className="product-details-description-header">

                            <p>PRODUCT INFORMATION</p>

                            <h2>About this product</h2>

                        </div>


                        <div className="product-details-information-grid">

                            {product.description && (

                                <article>
                                    <h3>Description</h3>

                                    <p>
                                        {product.description}
                                    </p>
                                </article>

                            )}


                            {product.ingredients && (

                                <article>
                                    <h3>Ingredients</h3>

                                    <p>
                                        {product.ingredients}
                                    </p>
                                </article>

                            )}


                            {product.benefits && (

                                <article>
                                    <h3>Benefits</h3>

                                    <p>
                                        {product.benefits}
                                    </p>
                                </article>

                            )}


                            {product.directions && (

                                <article>
                                    <h3>Directions</h3>

                                    <p>
                                        {product.directions}
                                    </p>
                                </article>

                            )}


                            {product.warnings && (

                                <article>
                                    <h3>Important information</h3>

                                    <p>
                                        {product.warnings}
                                    </p>
                                </article>

                            )}

                        </div>

                    </section>

                )}


                {/* =================================================
                    RELATED PRODUCTS
                ================================================= */}

                {relatedProducts.length > 0 && (

                    <section className="product-details-related">

                        <div className="product-details-related-header">

                            <div>
                                <p>YOU MAY ALSO LIKE</p>

                                <h2>More to explore</h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/products")}
                            >
                                View All Products
                            </button>

                        </div>


                        <ProductGrid
                            products={relatedProducts}
                        />

                    </section>

                )}

            </div>

        </main>

    );

}

export default ProductDetails;
