import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    ArrowRight,
    BadgePercent,
    Heart,
    ShoppingBag,
    Sparkles,
    Star
} from "lucide-react";

import {
    Link
} from "react-router-dom";

import {
    getProducts
} from "../../services/productService";

import ProductGrid
    from "../products/ProductGrid";

import "../../styles/home-commerce-sections.css";


const DEAL_LIMIT =
    4;


const TOP_RATED_LIMIT =
    4;


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
   HOME COMMERCE SECTIONS
============================================================ */

function HomeCommerceSections() {

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
       LOAD
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
                    "Homepage commerce products failed:",
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
       DEAL PRODUCTS
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
       TOP RATED PRODUCTS
    ======================================================== */

    const topRatedProducts =
        useMemo(() => {

            return [
                ...products
            ]
                .filter(
                    product =>
                        Number(
                            product?.rating ??
                            product?.average_rating ??
                            0
                        ) > 0
                )
                .sort(
                    (
                        first,
                        second
                    ) => {

                        const firstRating =
                            Number(
                                first?.rating ??
                                first?.average_rating ??
                                0
                            );


                        const secondRating =
                            Number(
                                second?.rating ??
                                second?.average_rating ??
                                0
                            );


                        const firstReviews =
                            Number(
                                first?.review_count ||
                                0
                            );


                        const secondReviews =
                            Number(
                                second?.review_count ||
                                0
                            );


                        if (
                            secondRating !==
                            firstRating
                        ) {

                            return (
                                secondRating -
                                firstRating
                            );

                        }


                        return (
                            secondReviews -
                            firstReviews
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


    return (

        <>


            {/* =================================================
                QUICK SHOPPING STRIP
            ================================================= */}

            <section
                className="home-shopping-strip"
            >

                <div
                    className="home-shopping-strip__inner"
                >

                    <Link
                        to="/products"
                        className="home-shopping-strip__item"
                    >

                        <div>
                            <ShoppingBag
                                size={18}
                            />
                        </div>


                        <span>

                            <strong>
                                Shop Products
                            </strong>

                            Browse the collection

                        </span>

                    </Link>


                    <Link
                        to="/wishlist"
                        className="home-shopping-strip__item"
                    >

                        <div>
                            <Heart
                                size={18}
                            />
                        </div>


                        <span>

                            <strong>
                                Save Your Picks
                            </strong>

                            Keep products for later

                        </span>

                    </Link>


                    <Link
                        to="/cart"
                        className="home-shopping-strip__item"
                    >

                        <div>
                            <ShoppingBag
                                size={18}
                            />
                        </div>


                        <span>

                            <strong>
                                Your Cart
                            </strong>

                            Review before checkout

                        </span>

                    </Link>


                    <Link
                        to="/products"
                        className="
                            home-shopping-strip__item
                            home-shopping-strip__item--action
                        "
                    >

                        <span>

                            <strong>
                                Explore AUMVEDA
                            </strong>

                            Start shopping

                        </span>


                        <ArrowRight
                            size={17}
                        />

                    </Link>

                </div>

            </section>


            {/* =================================================
                DEALS
            ================================================= */}

            {
                (
                    loading ||
                    dealProducts.length >
                    0
                ) && (

                    <section
                        className="
                            home-commerce
                            home-commerce--deals
                        "
                    >

                        <div
                            className="home-commerce__inner"
                        >

                            <div
                                className="home-commerce__header"
                            >

                                <div>

                                    <div
                                        className="home-commerce__eyebrow"
                                    >

                                        <BadgePercent
                                            size={14}
                                        />

                                        CURRENT OFFERS

                                    </div>


                                    <h2>
                                        Deals you can
                                        <span>
                                            shop now.
                                        </span>
                                    </h2>


                                    <p>
                                        Products currently available
                                        at a reduced price.
                                    </p>

                                </div>


                                <Link
                                    to="/products"
                                    className="home-commerce__view-all"
                                >

                                    View All Products

                                    <ArrowRight
                                        size={15}
                                    />

                                </Link>

                            </div>


                            {
                                loading ? (

                                    <div
                                        className="home-commerce__loading"
                                    >

                                        {
                                            Array.from({
                                                length: 4
                                            }).map(
                                                (
                                                    _,
                                                    index
                                                ) => (

                                                    <div
                                                        key={
                                                            index
                                                        }
                                                    />

                                                )
                                            )
                                        }

                                    </div>

                                ) : (

                                    <div
                                        className="home-commerce__product-grid"
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
                TOP RATED
            ================================================= */}

            {
                (
                    loading ||
                    topRatedProducts.length >
                    0
                ) && (

                    <section
                        className="
                            home-commerce
                            home-commerce--rated
                        "
                    >

                        <div
                            className="home-commerce__inner"
                        >

                            <div
                                className="home-commerce__header"
                            >

                                <div>

                                    <div
                                        className="home-commerce__eyebrow"
                                    >

                                        <Star
                                            size={14}
                                            fill="currentColor"
                                        />

                                        CUSTOMER FAVOURITES

                                    </div>


                                    <h2>
                                        Top rated
                                        <span>
                                            picks.
                                        </span>
                                    </h2>


                                    <p>
                                        Discover products with strong
                                        customer ratings from the
                                        current AUMVEDA collection.
                                    </p>

                                </div>


                                <Link
                                    to="/products"
                                    className="home-commerce__view-all"
                                >

                                    Shop All

                                    <ArrowRight
                                        size={15}
                                    />

                                </Link>

                            </div>


                            {
                                loading ? (

                                    <div
                                        className="home-commerce__loading"
                                    >

                                        {
                                            Array.from({
                                                length: 4
                                            }).map(
                                                (
                                                    _,
                                                    index
                                                ) => (

                                                    <div
                                                        key={
                                                            index
                                                        }
                                                    />

                                                )
                                            )
                                        }

                                    </div>

                                ) : (

                                    <div
                                        className="home-commerce__product-grid"
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

        </>

    );

}


export default HomeCommerceSections;