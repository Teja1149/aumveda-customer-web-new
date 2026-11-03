
import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    ArrowLeft,
    ArrowRight,
    Heart,
    Trash2
} from "lucide-react";

import {
    Link
} from "react-router-dom";

import {
    useWishlist
} from "../context/WishlistContext";

import {
    getProducts
} from "../services/productService";

import ProductGrid
    from "../components/products/ProductGrid";

import "../styles/wishlist.css";

/* ============================================================
   AUMVEDA CUSTOMER WEB
   STEP 17F — PREMIUM COMPACT WISHLIST

   - Existing WishlistContext
   - Existing backend product service
   - Existing shared ProductGrid
   - Compact responsive presentation
   - Professional product-focused copy
   - No new dependencies
============================================================ */

/* ============================================================
   PRODUCT RESPONSE NORMALIZATION
============================================================ */

function extractProducts(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.products)) {
        return response.products;
    }

    if (Array.isArray(response?.data?.products)) {
        return response.data.products;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    return [];
}

/* ============================================================
   WISHLIST
============================================================ */

function Wishlist() {

    const {
        wishlistIds,
        clearWishlist
    } = useWishlist();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [clearing, setClearing] = useState(false);
    const [clearError, setClearError] = useState("");

    /* ========================================================
       NORMALIZE SAVED IDS
    ======================================================== */

    const savedIds = useMemo(() => {
        const ids = Array.isArray(wishlistIds)
            ? wishlistIds
            : wishlistIds instanceof Set
                ? Array.from(wishlistIds)
                : [];

        return new Set(
            ids
                .filter(id =>
                    id !== null &&
                    id !== undefined
                )
                .map(id => String(id))
        );
    }, [wishlistIds]);

    const savedCount = savedIds.size;

    /* ========================================================
       LOAD PRODUCTS
    ======================================================== */

    useEffect(() => {
        let cancelled = false;

        async function loadWishlistProducts() {
            try {
                setLoading(true);
                setError("");

                const response = await getProducts();

                if (cancelled) return;

                setProducts(
                    extractProducts(response)
                );

            } catch (loadError) {
                if (cancelled) return;

                console.error(
                    "Wishlist products loading failed:",
                    loadError
                );

                setError(
                    "We couldn't load your saved products."
                );

            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadWishlistProducts();

        return () => {
            cancelled = true;
        };
    }, []);

    /* ========================================================
       FILTER SAVED PRODUCTS
    ======================================================== */

    const wishlistProducts = useMemo(() => {
        const uniqueIds = new Set();

        return products.filter(product => {
            if (
                !product ||
                product.id === null ||
                product.id === undefined
            ) {
                return false;
            }

            const id = String(product.id);

            if (
                !savedIds.has(id) ||
                uniqueIds.has(id)
            ) {
                return false;
            }

            uniqueIds.add(id);

            return true;
        });

    }, [products, savedIds]);

    /* ========================================================
       CLEAR WISHLIST
    ======================================================== */

    async function handleClearWishlist() {
        if (savedCount === 0 || clearing) {
            return;
        }

        const confirmed = window.confirm(
            "Remove all products from your wishlist?"
        );

        if (!confirmed) return;

        try {
            setClearing(true);
            setClearError("");

            await clearWishlist();

        } catch (clearWishlistError) {
            console.error(
                "Clear wishlist failed:",
                clearWishlistError
            );

            setClearError(
                "Unable to clear your wishlist. Please try again."
            );

        } finally {
            setClearing(false);
        }
    }

    /* ========================================================
       LOADING
    ======================================================== */

    if (loading) {
        return (
            <main className="wishlist-page">

                <section
                    className="wishlist-state"
                    aria-live="polite"
                >
                    <div
                        className="wishlist-loader"
                        aria-hidden="true"
                    />

                    <h2>
                        Loading Wishlist
                    </h2>

                    <p>
                        Getting your saved products ready.
                    </p>
                </section>

            </main>
        );
    }

    /* ========================================================
       ERROR
    ======================================================== */

    if (error) {
        return (
            <main className="wishlist-page">

                <section className="wishlist-state">

                    <div className="wishlist-empty__icon">
                        <Heart
                            size={28}
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                    </div>

                    <h2>
                        Wishlist Unavailable
                    </h2>

                    <p role="alert">
                        {error}
                    </p>

                    <Link
                        to="/products"
                        className="wishlist-primary-button"
                    >
                        Browse Products

                        <ArrowRight
                            size={15}
                            aria-hidden="true"
                        />
                    </Link>

                </section>

            </main>
        );
    }

    /* ========================================================
       EMPTY
    ======================================================== */

    if (savedCount === 0) {
        return (
            <main className="wishlist-page">

                <section className="wishlist-empty">

                    <div className="wishlist-empty__icon">
                        <Heart
                            size={30}
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                    </div>

                    <span className="wishlist-empty__eyebrow">
                        MY WISHLIST
                    </span>

                    <h1>
                        Your Wishlist Is Empty
                    </h1>

                    <p>
                        Save the products you like and find
                        them here whenever you're ready to shop.
                    </p>

                    <Link
                        to="/products"
                        className="wishlist-primary-button"
                    >
                        Explore Products

                        <ArrowRight
                            size={15}
                            aria-hidden="true"
                        />
                    </Link>

                </section>

            </main>
        );
    }

    /* ========================================================
       SAVED PRODUCTS NOT PRESENT IN CATALOG
    ======================================================== */

    if (wishlistProducts.length === 0) {
        return (
            <main className="wishlist-page">

                <section className="wishlist-empty">

                    <div className="wishlist-empty__icon">
                        <Heart
                            size={30}
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                    </div>

                    <span className="wishlist-empty__eyebrow">
                        MY WISHLIST
                    </span>

                    <h1>
                        No Saved Products Available
                    </h1>

                    <p>
                        Your saved products aren't currently
                        available in the catalog.
                    </p>

                    <Link
                        to="/products"
                        className="wishlist-primary-button"
                    >
                        Browse Products

                        <ArrowRight
                            size={15}
                            aria-hidden="true"
                        />
                    </Link>

                </section>

            </main>
        );
    }

    /* ========================================================
       MAIN PAGE
    ======================================================== */

    return (
        <main className="wishlist-page">

            {/* PAGE HEADER */}

            <header className="wishlist-header">

                <div className="wishlist-header__content">

                    <span className="wishlist-eyebrow">
                        SAVED PRODUCTS
                    </span>

                    <h1>
                        My Wishlist
                    </h1>

                    <p>
                        All your favourite products,
                        saved in one convenient place.
                    </p>

                </div>

                <div className="wishlist-header__actions">

                    <div className="wishlist-count">

                        <Heart
                            size={16}
                            aria-hidden="true"
                        />

                        <span>
                            {savedCount}
                            {savedCount === 1
                                ? " Item"
                                : " Items"}
                        </span>

                    </div>

                    <button
                        type="button"
                        className="wishlist-clear"
                        onClick={handleClearWishlist}
                        disabled={clearing}
                    >
                        <Trash2
                            size={14}
                            aria-hidden="true"
                        />

                        {clearing
                            ? "Clearing..."
                            : "Clear Wishlist"}
                    </button>

                </div>

            </header>

            {clearError && (
                <p
                    className="wishlist-action-error"
                    role="alert"
                >
                    {clearError}
                </p>
            )}

            {/* SAVED PRODUCT CARDS */}

            <section
                className="wishlist-products"
                aria-label="Saved products"
            >
                <ProductGrid
                    products={wishlistProducts}
                />
            </section>

            {/* CONTINUE SHOPPING */}

            <div className="wishlist-footer">

                <Link
                    to="/products"
                    className="wishlist-back"
                >
                    <ArrowLeft
                        size={16}
                        aria-hidden="true"
                    />

                    Continue Shopping
                </Link>

            </div>

        </main>
    );
}

export default Wishlist;
