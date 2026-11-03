import {
    ArrowRight,
    BadgePercent,
    Headphones,
    Heart,
    PackageCheck,
    Search,
    ShoppingBag,
    Star
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    Link
} from "react-router-dom";

import ExploreWellness
    from "./ExploreWellness";

import ProductGrid
    from "../products/ProductGrid";

import {
    getProducts
} from "../../services/productService";

import "../../styles/home-storefront.css";


const DEAL_LIMIT =
    6;


const FEATURED_LIMIT =
    6;


const TOP_RATED_LIMIT =
    6;


/* ============================================================
   DISCOUNT
============================================================ */

function getDiscount(product) {

    const price =
        Number(
            product?.price ||
            0
        );


    const comparePrice =
        Number(
            product?.compare_at_price ||
            0
        );


    if (
        !price ||
        !comparePrice ||
        comparePrice <= price
    ) {

        return 0;

    }


    return Math.round(
        (
            (
                comparePrice -
                price
            ) /
            comparePrice
        ) *
        100
    );

}


/* ============================================================
   RATING
============================================================ */

function getRating(product) {

    return Number(
        product?.rating ??
        product?.average_rating ??
        0
    );

}


/* ============================================================
   STOREFRONT
============================================================ */

function HomeStorefront() {

    const [
        products,
        setProducts
    ] =
        useState([]);


    const [
        loading,
        setLoading
    ] =
        useState(true);


    /* ========================================================
       LOAD PRODUCTS ONCE
    ======================================================== */

    useEffect(() => {

        let cancelled =
            false;


        async function loadProducts() {

            try {

                const data =
                    await getProducts();


                if (cancelled) {

                    return;

                }


                setProducts(
                    Array.isArray(
                        data
                    )
                        ? data
                        : []
                );

            }
            catch (error) {

                console.error(
                    "Homepage storefront loading failed:",
                    error
                );


                if (!cancelled) {

                    setProducts([]);

                }

            }
            finally {

                if (!cancelled) {

                    setLoading(
                        false
                    );

                }

            }

        }


        loadProducts();


        return () => {

            cancelled =
                true;

        };

    }, []);


    /* ========================================================
       DEALS
    ======================================================== */

    const dealProducts =
        useMemo(() => {

            return [
                ...products
            ]
                .filter(
                    product =>
                        getDiscount(
                            product
                        ) > 0
                )
                .sort(
                    (
                        first,
                        second
                    ) =>
                        getDiscount(
                            second
                        ) -
                        getDiscount(
                            first
                        )
                )
                .slice(
                    0,
                    DEAL_LIMIT
                );

        }, [
            products
        ]);


    /* ========================================================
       FEATURED
    ======================================================== */

    const featuredProducts =
        useMemo(() => {

            return [
                ...products
            ]
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const firstScore =
                            (
                                getRating(
                                    first
                                ) *
                                100
                            ) +
                            Number(
                                first?.review_count ||
                                0
                            ) +
                            getDiscount(
                                first
                            );


                        const secondScore =
                            (
                                getRating(
                                    second
                                ) *
                                100
                            ) +
                            Number(
                                second?.review_count ||
                                0
                            ) +
                            getDiscount(
                                second
                            );


                        return (
                            secondScore -
                            firstScore
                        );

                    }
                )
                .slice(
                    0,
                    FEATURED_LIMIT
                );

        }, [
            products
        ]);


    /* ========================================================
       TOP RATED
    ======================================================== */

    const topRatedProducts =
        useMemo(() => {

            return [
                ...products
            ]
                .filter(
                    product =>
                        getRating(
                            product
                        ) > 0
                )
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const ratingDifference =
                            getRating(
                                second
                            ) -
                            getRating(
                                first
                            );


                        if (
                            ratingDifference !==
                            0
                        ) {

                            return ratingDifference;

                        }


                        return (
                            Number(
                                second?.review_count ||
                                0
                            ) -
                            Number(
                                first?.review_count ||
                                0
                            )
                        );

                    }
                )
                .slice(
                    0,
                    TOP_RATED_LIMIT
                );

        }, [
            products
        ]);


    /* ========================================================
       PRODUCT SKELETON
    ======================================================== */

    function renderLoadingProducts() {

        return (

            <div
                className="storefront-loading-grid"
            >

                {
                    Array.from({
                        length: 6
                    }).map(
                        (
                            _,
                            index
                        ) => (

                            <div
                                key={
                                    index
                                }
                                className="storefront-loading-card"
                            >

                                <div
                                    className="storefront-loading-card__image"
                                />


                                <div
                                    className="storefront-loading-card__line storefront-loading-card__line--title"
                                />


                                <div
                                    className="storefront-loading-card__line"
                                />


                                <div
                                    className="storefront-loading-card__line storefront-loading-card__line--short"
                                />

                            </div>

                        )
                    )
                }

            </div>

        );

    }


    return (

        <main
            className="home-storefront"
        >


            {/* =================================================
                COMPACT SERVICE / SHOPPING STRIP
            ================================================= */}

            <section
                className="storefront-service-strip"
            >

                <div
                    className="storefront-service-strip__inner"
                >

                    <Link
                        to="/products"
                        className="storefront-service-item"
                    >

                        <ShoppingBag
                            size={19}
                        />


                        <span>

                            <strong>
                                Shop Products
                            </strong>

                            Explore the collection

                        </span>

                    </Link>


                    <Link
                        to="/products"
                        className="storefront-service-item"
                    >

                        <Search
                            size={19}
                        />


                        <span>

                            <strong>
                                Easy Discovery
                            </strong>

                            Find products faster

                        </span>

                    </Link>


                    <Link
                        to="/wishlist"
                        className="storefront-service-item"
                    >

                        <Heart
                            size={19}
                        />


                        <span>

                            <strong>
                                Wishlist Ready
                            </strong>

                            Save products for later

                        </span>

                    </Link>


                    <Link
                        to="/cart"
                        className="storefront-service-item"
                    >

                        <PackageCheck
                            size={19}
                        />


                        <span>

                            <strong>
                                Easy Shopping
                            </strong>

                            Review your cart anytime

                        </span>

                    </Link>


                    <Link
                        to="/contact"
                        className="storefront-service-item"
                    >

                        <Headphones
                            size={19}
                        />


                        <span>

                            <strong>
                                Customer Support
                            </strong>

                            Help when you need it

                        </span>

                    </Link>

                </div>

            </section>


            {/* =================================================
                CATEGORY SECTION
            ================================================= */}

            <section
                className="storefront-category-section"
            >

                <ExploreWellness />

            </section>


            {/* =================================================
                BEST DEALS
            ================================================= */}

            {
                (
                    loading ||
                    dealProducts.length >
                    0
                ) && (

                    <section
                        className="storefront-section"
                    >

                        <div
                            className="storefront-section__inner"
                        >

                            <div
                                className="storefront-section__header"
                            >

                                <div
                                    className="storefront-section__title"
                                >

                                    <h2>
                                        Best Deals
                                    </h2>


                                    <span
                                        className="storefront-section__tag"
                                    >

                                        <BadgePercent
                                            size={12}
                                        />

                                        Current savings

                                    </span>

                                </div>


                                <Link
                                    to="/products"
                                    className="storefront-view-all"
                                >

                                    View All

                                    <ArrowRight
                                        size={15}
                                    />

                                </Link>

                            </div>


                            {
                                loading
                                    ? renderLoadingProducts()
                                    : (

                                        <div
                                            className="storefront-product-grid"
                                        >

                                            <ProductGrid
                                                products={
                                                    dealProducts
                                                }
                                            />

                                        </div>

                                    )
                            }

                        </div>

                    </section>

                )
            }


            {/* =================================================
                FEATURED
            ================================================= */}

            <section
                className="
                    storefront-section
                    storefront-section--alternate
                "
            >

                <div
                    className="storefront-section__inner"
                >

                    <div
                        className="storefront-section__header"
                    >

                        <div
                            className="storefront-section__title"
                        >

                            <h2>
                                Featured Products
                            </h2>


                            <span
                                className="storefront-section__tag"
                            >
                                Explore AUMVEDA
                            </span>

                        </div>


                        <Link
                            to="/products"
                            className="storefront-view-all"
                        >

                            View All

                            <ArrowRight
                                size={15}
                            />

                        </Link>

                    </div>


                    {
                        loading
                            ? renderLoadingProducts()
                            : (

                                <div
                                    className="storefront-product-grid"
                                >

                                    <ProductGrid
                                        products={
                                            featuredProducts
                                        }
                                    />

                                </div>

                            )
                    }

                </div>

            </section>


            {/* =================================================
                SHOPPING BANNER
            ================================================= */}

            <section
                className="storefront-promo"
            >

                <div
                    className="storefront-promo__inner"
                >

                    <div
                        className="storefront-promo__accent"
                    />


                    <div
                        className="storefront-promo__copy"
                    >

                        <span>
                            DISCOVER MORE
                        </span>


                        <h2>
                            Something for your
                            <strong>
                                everyday wellness.
                            </strong>
                        </h2>


                        <p>
                            Explore more products across
                            the complete AUMVEDA collection.
                        </p>

                    </div>


                    <Link
                        to="/products"
                        className="storefront-promo__button"
                    >

                        Shop Now

                        <ArrowRight
                            size={16}
                        />

                    </Link>


                    <div
                        className="storefront-promo__decor storefront-promo__decor--one"
                    />


                    <div
                        className="storefront-promo__decor storefront-promo__decor--two"
                    />

                </div>

            </section>


            {/* =================================================
                TOP RATED
            ================================================= */}

            {
                (
                    loading ||
                    topRatedProducts.length >
                    0
                ) && (

                    <section
                        className="storefront-section"
                    >

                        <div
                            className="storefront-section__inner"
                        >

                            <div
                                className="storefront-section__header"
                            >

                                <div
                                    className="storefront-section__title"
                                >

                                    <h2>
                                        Top Rated Picks
                                    </h2>


                                    <span
                                        className="storefront-section__tag"
                                    >

                                        <Star
                                            size={11}
                                            fill="currentColor"
                                        />

                                        Customer ratings

                                    </span>

                                </div>


                                <Link
                                    to="/products?sort=rating"
                                    className="storefront-view-all"
                                >

                                    View All

                                    <ArrowRight
                                        size={15}
                                    />

                                </Link>

                            </div>


                            {
                                loading
                                    ? renderLoadingProducts()
                                    : (

                                        <div
                                            className="storefront-product-grid"
                                        >

                                            <ProductGrid
                                                products={
                                                    topRatedProducts
                                                }
                                            />

                                        </div>

                                    )
                            }

                        </div>

                    </section>

                )
            }


            {/* =================================================
                COMPACT BENEFITS STRIP
            ================================================= */}

            <section
                className="storefront-benefits"
            >

                <div
                    className="storefront-benefits__inner"
                >

                    <div
                        className="storefront-benefit"
                    >

                        <Search
                            size={21}
                        />


                        <span>

                            <strong>
                                Easy Discovery
                            </strong>

                            Find what you need faster

                        </span>

                    </div>


                    <div
                        className="storefront-benefit"
                    >

                        <ShoppingBag
                            size={21}
                        />


                        <span>

                            <strong>
                                Simple Shopping
                            </strong>

                            Browse, cart and checkout

                        </span>

                    </div>


                    <div
                        className="storefront-benefit"
                    >

                        <Heart
                            size={21}
                        />


                        <span>

                            <strong>
                                Wishlist
                            </strong>

                            Keep your favourites

                        </span>

                    </div>


                    <div
                        className="storefront-benefit"
                    >

                        <Headphones
                            size={21}
                        />


                        <span>

                            <strong>
                                Customer Support
                            </strong>

                            Assistance when needed

                        </span>

                    </div>

                </div>

            </section>

        </main>

    );

}


export default HomeStorefront;