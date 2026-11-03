
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { getProducts } from "../../services/productService";

import "../../styles/wellness-promo-banner.css";

/* ============================================================
   AUMVEDA — PREMIUM EDITORIAL TRIO
   STEP 13A.5.3

   LEFT: Automatic product image slider
   CENTER: Premium editorial shopping campaign
   RIGHT: Featured product spotlight

   Desktop: Three aligned panels
   Mobile: Compact stacked panels

   Existing product API reused.
   No new backend endpoints.
============================================================ */

const MAX_SLIDES = 4;
const SLIDE_INTERVAL = 3500;

/* ============================================================
   HELPERS
============================================================ */

function extractProducts(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.products)) return response.products;

    if (Array.isArray(response?.data?.products)) {
        return response.data.products;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    return [];
}

function getProductImage(product) {
    const candidates = [
        product?.image,
        product?.image_url,
        product?.thumbnail_url,
        product?.primary_image
    ];

    return candidates.find(
        value =>
            typeof value === "string" &&
            value.trim().length > 0
    ) || "";
}

function productLink(product) {
    if (!product?.slug) {
        return "/products";
    }

    return `/products/${encodeURIComponent(product.slug)}`;
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function WellnessPromoBanner() {
    const [slides, setSlides] = useState([]);
    const [featuredProduct, setFeaturedProduct] = useState(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [paused, setPaused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [failedImages, setFailedImages] = useState({});

    /* ========================================================
       LOAD REAL PRODUCTS
    ======================================================== */

    useEffect(() => {
        let active = true;

        async function loadProducts() {
            try {
                const response = await getProducts();

                if (!active) return;

                const eligible = extractProducts(response).filter(
                    product =>
                        product &&
                        product.id != null &&
                        typeof product.slug === "string" &&
                        product.slug.trim() &&
                        getProductImage(product)
                );

                const unique = Array.from(
                    new Map(
                        eligible.map(product => [
                            String(product.id),
                            product
                        ])
                    ).values()
                );

                /*
                   Prefer later catalog products so
                   the trio isn't identical to the
                   homepage's earliest product cards.
                */

                const selection =
                    unique.length >= 9
                        ? unique.slice(4)
                        : unique;

                const nextSlides =
                    selection.slice(0, MAX_SLIDES);

                const featured =
                    selection.find(product =>
                        !nextSlides.some(slide =>
                            String(slide.id) === String(product.id)
                        )
                    ) ||
                    unique.find(product =>
                        !nextSlides.some(slide =>
                            String(slide.id) === String(product.id)
                        )
                    ) ||
                    nextSlides[0] ||
                    null;

                setSlides(nextSlides);
                setFeaturedProduct(featured);
                setActiveSlide(0);
                setFailedImages({});

            } catch (error) {
                console.error(
                    "AUMVEDA promotional products failed:",
                    error
                );

                if (active) {
                    setSlides([]);
                    setFeaturedProduct(null);
                }
            }
        }

        loadProducts();

        return () => {
            active = false;
        };
    }, []);

    /* ========================================================
       REDUCED MOTION
    ======================================================== */

    useEffect(() => {
        if (!window.matchMedia) return undefined;

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

    /* ========================================================
       AUTO SWITCH — EVERY 3.5 SECONDS

       Pause when:
       - Customer hovers on the slider
       - Focus is inside the slider
       - Browser tab is hidden
       - Reduced motion is enabled
    ======================================================== */

    useEffect(() => {
        if (
            slides.length < 2 ||
            paused ||
            reducedMotion
        ) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            if (document.hidden) return;

            setActiveSlide(
                current => (current + 1) % slides.length
            );
        }, SLIDE_INTERVAL);

        return () => {
            window.clearInterval(timer);
        };
    }, [
        slides.length,
        paused,
        reducedMotion
    ]);

    /* ========================================================
       IMAGE FALLBACK
    ======================================================== */

    function handleImageFailure(productId) {
        setFailedImages(previous => {
            if (previous[productId]) {
                return previous;
            }

            return {
                ...previous,
                [productId]: true
            };
        });
    }

    const currentProduct =
        slides[activeSlide] || null;

    const featuredImage =
        getProductImage(featuredProduct);

    const featuredFailed =
        featuredProduct
            ? Boolean(failedImages[featuredProduct.id])
            : false;

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <section
            className="wellness-promo"
            aria-label="Discover more products"
        >
            <div className="wellness-promo__container">

                <div className="wellness-promo__grid">

                    {/* ========================================
                        LEFT — PRODUCT IMAGE SLIDER
                    ======================================== */}

                    <div
                        className="wellness-promo__slider-panel"

                        onMouseEnter={() => {
                            setPaused(true);
                        }}

                        onMouseLeave={() => {
                            setPaused(false);
                        }}

                        onFocusCapture={() => {
                            setPaused(true);
                        }}

                        onBlurCapture={event => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget
                                )
                            ) {
                                setPaused(false);
                            }
                        }}
                    >

                        <div className="wellness-promo__slider-header">

                            <span>
                                LATEST PICKS
                            </span>

                            <span className="wellness-promo__counter">
                                {slides.length > 0
                                    ? `${String(activeSlide + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`
                                    : "00 / 00"
                                }
                            </span>

                        </div>

                        <div className="wellness-promo__slider-stage">

                            {slides.length > 0 ? (
                                slides.map((product, index) => {
                                    const isActive =
                                        activeSlide === index;

                                    const image =
                                        getProductImage(product);

                                    const failed =
                                        failedImages[product.id];

                                    return (
                                        <Link
                                            key={product.id}
                                            to={productLink(product)}

                                            className={
                                                "wellness-promo__slide" +
                                                (
                                                    isActive
                                                        ? " wellness-promo__slide--active"
                                                        : ""
                                                )
                                            }

                                            aria-label={
                                                `View ${product.name}`
                                            }

                                            aria-hidden={!isActive}

                                            tabIndex={
                                                isActive ? 0 : -1
                                            }
                                        >
                                            {!failed ? (
                                                <img
                                                    src={image}

                                                    alt={
                                                        isActive
                                                            ? product.name
                                                            : ""
                                                    }

                                                    loading={
                                                        index === 0
                                                            ? "eager"
                                                            : "lazy"
                                                    }

                                                    decoding="async"

                                                    onError={() =>
                                                        handleImageFailure(
                                                            product.id
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <div className="wellness-promo__image-placeholder">
                                                    <span>
                                                        {product.name}
                                                    </span>
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })
                            ) : (
                                <div
                                    className={
                                        "wellness-promo__image-placeholder " +
                                        "wellness-promo__image-placeholder--empty"
                                    }
                                >
                                    Explore Our Collection
                                </div>
                            )}

                        </div>

                        <div className="wellness-promo__slider-footer">

                            <Link
                                to={productLink(currentProduct)}
                                className="wellness-promo__slider-product-name"
                            >
                                {currentProduct?.name ||
                                    "Discover Your Next Favourite"}
                            </Link>

                            <div className="wellness-promo__slider-progress">

                                {slides.length > 1 &&
                                    slides.map((product, index) => (
                                        <button
                                            key={product.id}
                                            type="button"

                                            aria-label={
                                                `Show product ${index + 1}`
                                            }

                                            aria-current={
                                                index === activeSlide
                                                    ? "true"
                                                    : undefined
                                            }

                                            className={
                                                "wellness-promo__progress-item" +
                                                (
                                                    index === activeSlide
                                                        ? " wellness-promo__progress-item--active"
                                                        : ""
                                                )
                                            }

                                            onClick={() => {
                                                setActiveSlide(index);
                                            }}
                                        />
                                    ))
                                }

                            </div>

                        </div>

                    </div>


                    {/* ========================================
                        CENTER — EDITORIAL CAMPAIGN
                    ======================================== */}

                    <div className="wellness-promo__editorial">

                        <span className="wellness-promo__eyebrow">
                            THE LATEST EDIT
                        </span>

                        <div className="wellness-promo__editorial-content">

                            <h2>
                                Discover Your
                                <span>
                                    Next Favourite.
                                </span>
                            </h2>

                            <p>
                                Explore our latest store picks.
                            </p>

                        </div>

                        <Link
                            to="/products"
                            className="wellness-promo__editorial-button"
                        >
                            <span>
                                SHOP COLLECTION
                            </span>

                            <ArrowRight
                                size={18}
                                strokeWidth={1.8}
                                aria-hidden="true"
                            />
                        </Link>

                    </div>


                    {/* ========================================
                        RIGHT — FEATURED PRODUCT
                    ======================================== */}

                    <Link
                        to={productLink(featuredProduct)}

                        className="wellness-promo__featured"

                        aria-label={
                            featuredProduct?.name
                                ? `View ${featuredProduct.name}`
                                : "Explore featured products"
                        }
                    >
                        <span className="wellness-promo__featured-label">
                            THE FEATURED PICK
                        </span>

                        <div className="wellness-promo__featured-visual">

                            {featuredImage && !featuredFailed ? (
                                <img
                                    src={featuredImage}

                                    alt={
                                        featuredProduct?.name || ""
                                    }

                                    loading="lazy"
                                    decoding="async"

                                    onError={() =>
                                        handleImageFailure(
                                            featuredProduct.id
                                        )
                                    }
                                />
                            ) : (
                                <div className="wellness-promo__featured-placeholder">
                                    <span>
                                        {featuredProduct?.name ||
                                            "Featured Selection"}
                                    </span>
                                </div>
                            )}

                        </div>

                        <div className="wellness-promo__featured-bottom">

                            <h3>
                                {featuredProduct?.name ||
                                    "A Standout Selection"}
                            </h3>

                            <div className="wellness-promo__featured-action">

                                <span>
                                    VIEW PRODUCT
                                </span>

                                <span className="wellness-promo__featured-arrow">
                                    <ArrowUpRight
                                        size={17}
                                        strokeWidth={1.8}
                                        aria-hidden="true"
                                    />
                                </span>

                            </div>

                        </div>

                    </Link>

                </div>

            </div>
        </section>
    );
}

export default WellnessPromoBanner;
