import {
    ArrowLeft,
    ArrowRight,
    Minus,
    PackageCheck,
    Plus,
    ShoppingBag,
    Sparkles,
    Trash2
} from "lucide-react";

import {
    Link,
    useNavigate
} from "react-router-dom";

import {
    useEffect
} from "react";

import {
    useAuth
} from "../context/AuthContext";

import {
    useCart
} from "../context/CartContext";

import "../styles/cart.css";


/* ============================================================
   FORMAT PRICE
============================================================ */

function formatPrice(value) {

    const amount =
        Number(
            value ||
            0
        );


    return new Intl.NumberFormat(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    ).format(
        amount
    );

}


/* ============================================================
   CART
============================================================ */

function Cart() {

    const navigate =
        useNavigate();


    /* ========================================================
       AUTH
    ======================================================== */

    const {
        isAuthenticated,
        loading: authLoading
    } =
        useAuth();


    /* ========================================================
       CART CONTEXT
    ======================================================== */

    const {
        items,
        loading,
        error,
        totalQuantity,
        subtotal,
        updateCartItem,
        removeFromCart,
        clearCart
    } =
        useCart();


    /* ========================================================
       PROTECT CART
    ======================================================== */

    useEffect(() => {

        if (
            !authLoading &&
            !isAuthenticated
        ) {

            navigate(
                "/login",
                {
                    replace: true,
                    state: {
                        from: {
                            pathname:
                                "/cart"
                        }
                    }
                }
            );

        }

    }, [
        authLoading,
        isAuthenticated,
        navigate
    ]);


    /* ========================================================
       QUANTITY
    ======================================================== */

    async function changeQuantity(
        item,
        nextQuantity
    ) {

        const quantity =
            Number(
                nextQuantity
            );


        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity < 1
        ) {

            return;

        }


        const stock =
            Number(
                item?.variant
                    ?.stock_quantity ||
                0
            );


        if (
            stock > 0 &&
            quantity > stock
        ) {

            return;

        }


        try {

            await updateCartItem(
                item.id,
                quantity
            );

        }
        catch (updateError) {

            console.error(
                "Cart quantity update failed:",
                updateError
            );

        }

    }


    /* ========================================================
       REMOVE
    ======================================================== */

    async function handleRemove(
        itemId
    ) {

        try {

            await removeFromCart(
                itemId
            );

        }
        catch (removeError) {

            console.error(
                "Remove cart item failed:",
                removeError
            );

        }

    }


    /* ========================================================
       CLEAR CART
    ======================================================== */

    async function handleClearCart() {

        if (!items.length) {

            return;

        }


        const confirmed =
            window.confirm(
                "Remove all products from your cart?"
            );


        if (!confirmed) {

            return;

        }


        try {

            await clearCart();

        }
        catch (clearError) {

            console.error(
                "Clear cart failed:",
                clearError
            );

        }

    }


    /* ========================================================
       CHECKOUT
    ======================================================== */

    function handleCheckout() {

        if (!items.length) {

            return;

        }


        navigate(
            "/checkout"
        );

    }


    /* ========================================================
       AUTH LOADING
    ======================================================== */

    if (authLoading) {

        return (

            <main
                className="aumveda-cart-page"
            >

                <div
                    className="aumveda-cart-loading"
                >

                    <div
                        className="aumveda-cart-loading__spinner"
                    />

                    <p>
                        Preparing your cart...
                    </p>

                </div>

            </main>

        );

    }


    if (!isAuthenticated) {

        return null;

    }


    /* ========================================================
       CART LOADING
    ======================================================== */

    if (
        loading &&
        !items.length
    ) {

        return (

            <main
                className="aumveda-cart-page"
            >

                <div
                    className="aumveda-cart-loading"
                >

                    <div
                        className="aumveda-cart-loading__spinner"
                    />

                    <p>
                        Loading your cart...
                    </p>

                </div>

            </main>

        );

    }


    /* ========================================================
       EMPTY
    ======================================================== */

    if (!items.length) {

        return (

            <main
                className="aumveda-cart-page"
            >

                <div
                    className="aumveda-cart-empty"
                >

                    <div
                        className="aumveda-cart-empty__icon"
                    >

                        <ShoppingBag
                            size={34}
                            strokeWidth={1.5}
                        />

                    </div>


                    <div
                        className="aumveda-cart-empty__eyebrow"
                    >

                        <Sparkles
                            size={13}
                        />

                        YOUR CART

                    </div>


                    <h1>
                        Your cart is empty
                    </h1>


                    <p>
                        Explore AUMVEDA and add
                        products you would like
                        to purchase.
                    </p>


                    <Link
                        to="/products"
                        className="aumveda-cart-primary-button"
                    >

                        Explore Products

                        <ArrowRight
                            size={17}
                        />

                    </Link>

                </div>

            </main>

        );

    }


    /* ========================================================
       PAGE
    ======================================================== */

    return (

        <main
            className="aumveda-cart-page"
        >


            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div
                className="aumveda-cart-header"
            >

                <div
                    className="aumveda-cart-header__content"
                >

                    <div
                        className="aumveda-cart-eyebrow"
                    >

                        <span />

                        SHOPPING CART

                        <span />

                    </div>


                    <h1>
                        Your Cart
                    </h1>


                    <p>
                        Review your products,
                        update quantities and
                        continue when you're ready.
                    </p>

                </div>


                <div
                    className="aumveda-cart-header__count"
                >

                    <ShoppingBag
                        size={18}
                    />

                    <strong>
                        {
                            totalQuantity
                        }
                    </strong>

                    <span>
                        {
                            totalQuantity ===
                            1
                                ? "item"
                                : "items"
                        }
                    </span>

                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {
                error && (

                    <div
                        className="aumveda-cart-error"
                    >

                        {
                            error
                        }

                    </div>

                )
            }


            {/* =================================================
                MAIN LAYOUT
            ================================================= */}

            <div
                className="aumveda-cart-layout"
            >


                {/* =================================================
                    ITEMS
                ================================================= */}

                <section
                    className="aumveda-cart-items"
                >


                    <div
                        className="aumveda-cart-items__top"
                    >

                        <div>

                            <strong>
                                Products
                            </strong>

                            <span>
                                {
                                    items.length
                                }

                                {
                                    items.length ===
                                    1
                                        ? " product"
                                        : " products"
                                }
                            </span>

                        </div>


                        <button
                            type="button"
                            className="aumveda-cart-clear"
                            onClick={
                                handleClearCart
                            }
                            disabled={
                                loading
                            }
                        >

                            <Trash2
                                size={14}
                            />

                            Clear Cart

                        </button>

                    </div>


                    {/* =================================================
                        ITEM LIST
                    ================================================= */}

                    <div
                        className="aumveda-cart-item-list"
                    >

                        {
                            items.map(
                                item => {

                                    const product =
                                        item.product ||
                                        {};


                                    const variant =
                                        item.variant ||
                                        {};


                                    const quantity =
                                        Number(
                                            item.quantity ||
                                            1
                                        );


                                    const price =
                                        Number(
                                            variant.price ??
                                            item.price ??
                                            0
                                        );


                                    const comparePrice =
                                        Number(
                                            variant.compare_at_price ??
                                            0
                                        );


                                    const stock =
                                        Number(
                                            variant.stock_quantity ||
                                            0
                                        );


                                    const lineTotal =
                                        Number(
                                            item.line_total ??
                                            item.subtotal ??
                                            price *
                                            quantity
                                        );


                                    const productLink =
                                        product.slug
                                            ? `/products/${product.slug}`
                                            : "/products";


                                    const discount =
                                        comparePrice >
                                        price &&
                                        price > 0
                                            ? Math.round(
                                                (
                                                    (
                                                        comparePrice -
                                                        price
                                                    ) /
                                                    comparePrice
                                                ) *
                                                100
                                            )
                                            : 0;


                                    return (

                                        <article
                                            key={
                                                item.id
                                            }
                                            className="aumveda-cart-item"
                                        >


                                            {/* IMAGE */}

                                            <Link
                                                to={
                                                    productLink
                                                }
                                                className="aumveda-cart-item__image"
                                            >

                                                {
                                                    product.image ? (

                                                        <img
                                                            src={
                                                                product.image
                                                            }
                                                            alt={
                                                                product.name ||
                                                                "AUMVEDA product"
                                                            }
                                                        />

                                                    ) : (

                                                        <div
                                                            className="aumveda-cart-item__image-placeholder"
                                                        >

                                                            <ShoppingBag
                                                                size={25}
                                                            />

                                                        </div>

                                                    )
                                                }


                                                {
                                                    discount >
                                                    0 && (

                                                        <span
                                                            className="aumveda-cart-item__discount"
                                                        >

                                                            {
                                                                discount
                                                            }
                                                            % OFF

                                                        </span>

                                                    )
                                                }

                                            </Link>


                                            {/* PRODUCT */}

                                            <div
                                                className="aumveda-cart-item__details"
                                            >

                                                <Link
                                                    to={
                                                        productLink
                                                    }
                                                    className="aumveda-cart-item__name"
                                                >

                                                    {
                                                        product.name ||
                                                        "AUMVEDA Product"
                                                    }

                                                </Link>


                                                {
                                                    variant.name && (

                                                        <span
                                                            className="aumveda-cart-item__variant"
                                                        >

                                                            {
                                                                variant.name
                                                            }

                                                        </span>

                                                    )
                                                }


                                                {
                                                    product.short_description && (

                                                        <p>
                                                            {
                                                                product.short_description
                                                            }
                                                        </p>

                                                    )
                                                }


                                                <div
                                                    className="aumveda-cart-item__price"
                                                >

                                                    <strong>

                                                        ₹
                                                        {
                                                            formatPrice(
                                                                price
                                                            )
                                                        }

                                                    </strong>


                                                    {
                                                        comparePrice >
                                                        price && (

                                                            <del>

                                                                ₹
                                                                {
                                                                    formatPrice(
                                                                        comparePrice
                                                                    )
                                                                }

                                                            </del>

                                                        )
                                                    }

                                                </div>

                                            </div>


                                            {/* QUANTITY */}

                                            <div
                                                className="aumveda-cart-item__quantity"
                                            >

                                                <span>
                                                    Quantity
                                                </span>


                                                <div
                                                    className="aumveda-quantity-control"
                                                >

                                                    <button
                                                        type="button"
                                                        aria-label="Decrease quantity"
                                                        disabled={
                                                            quantity <=
                                                            1 ||
                                                            loading
                                                        }
                                                        onClick={() =>
                                                            changeQuantity(
                                                                item,
                                                                quantity -
                                                                1
                                                            )
                                                        }
                                                    >

                                                        <Minus
                                                            size={14}
                                                        />

                                                    </button>


                                                    <strong>
                                                        {
                                                            quantity
                                                        }
                                                    </strong>


                                                    <button
                                                        type="button"
                                                        aria-label="Increase quantity"
                                                        disabled={
                                                            loading ||
                                                            (
                                                                stock >
                                                                0 &&
                                                                quantity >=
                                                                stock
                                                            )
                                                        }
                                                        onClick={() =>
                                                            changeQuantity(
                                                                item,
                                                                quantity +
                                                                1
                                                            )
                                                        }
                                                    >

                                                        <Plus
                                                            size={14}
                                                        />

                                                    </button>

                                                </div>


                                                {
                                                    stock >
                                                    0 && (

                                                        <small>
                                                            {
                                                                stock
                                                            }
                                                            {" "}
                                                            available
                                                        </small>

                                                    )
                                                }

                                            </div>


                                            {/* TOTAL */}

                                            <div
                                                className="aumveda-cart-item__total"
                                            >

                                                <span>
                                                    Total
                                                </span>


                                                <strong>

                                                    ₹
                                                    {
                                                        formatPrice(
                                                            lineTotal
                                                        )
                                                    }

                                                </strong>


                                                <button
                                                    type="button"
                                                    className="aumveda-cart-item__remove"
                                                    aria-label={
                                                        `Remove ${
                                                            product.name ||
                                                            "product"
                                                        }`
                                                    }
                                                    onClick={() =>
                                                        handleRemove(
                                                            item.id
                                                        )
                                                    }
                                                    disabled={
                                                        loading
                                                    }
                                                >

                                                    <Trash2
                                                        size={15}
                                                    />

                                                </button>

                                            </div>

                                        </article>

                                    );

                                }
                            )
                        }

                    </div>


                    {/* CONTINUE */}

                    <Link
                        to="/products"
                        className="aumveda-cart-continue"
                    >

                        <ArrowLeft
                            size={16}
                        />

                        Continue Shopping

                    </Link>

                </section>


                {/* =================================================
                    ORDER SUMMARY
                ================================================= */}

                <aside
                    className="aumveda-cart-summary"
                >

                    <div
                        className="aumveda-cart-summary__heading"
                    >

                        <span>
                            ORDER SUMMARY
                        </span>

                        <h2>
                            Your Order
                        </h2>

                    </div>


                    <div
                        className="aumveda-cart-summary__rows"
                    >

                        <div>

                            <span>
                                Items
                            </span>

                            <strong>
                                {
                                    totalQuantity
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                Subtotal
                            </span>

                            <strong>

                                ₹
                                {
                                    formatPrice(
                                        subtotal
                                    )
                                }

                            </strong>

                        </div>

                    </div>


                    <div
                        className="aumveda-cart-summary__divider"
                    />


                    <div
                        className="aumveda-cart-summary__total"
                    >

                        <span>
                            Cart Total
                        </span>


                        <strong>

                            ₹
                            {
                                formatPrice(
                                    subtotal
                                )
                            }

                        </strong>

                    </div>


                    <button
                        type="button"
                        className="aumveda-checkout-button"
                        onClick={
                            handleCheckout
                        }
                    >

                        Proceed to Checkout

                        <ArrowRight
                            size={17}
                        />

                    </button>


                    <div
                        className="aumveda-cart-summary__info"
                    >

                        <PackageCheck
                            size={17}
                        />

                        <p>
                            Shipping charges,
                            discounts and final
                            payment details will be
                            shown during checkout.
                        </p>

                    </div>

                </aside>

            </div>

        </main>

    );

}


export default Cart;