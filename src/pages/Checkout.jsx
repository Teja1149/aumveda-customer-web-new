
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Home,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Truck
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

import {
  getCustomerAddresses
} from "../services/addressService";

import {
  createCustomerOrder,
  createBuyNowOrder
} from "../services/orderService";

import "../styles/checkout.css";

/* ============================================================
   AUMVEDA — CHECKOUT
   STEP 17I.12

   CART COD + BUY NOW COD
   EXISTING UI AND CSS CLASSES PRESERVED
============================================================ */

const BUY_NOW_STORAGE_KEY = "aumveda_buy_now";

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function readBuyNowData() {
  try {
    const saved = sessionStorage.getItem(
      BUY_NOW_STORAGE_KEY
    );

    if (!saved) return null;

    const parsed = JSON.parse(saved);

    if (!parsed || !parsed.product) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "Unable to read Buy Now product:",
      error
    );
    return null;
  }
}

function getProduct(item) {
  return item?.product || {};
}

function getVariant(item) {
  return item?.variant || {};
}

function getItemQuantity(item) {
  return Number(item?.quantity || 1);
}

function getItemPrice(item) {
  const product = getProduct(item);
  const variant = getVariant(item);

  return Number(
    variant?.price ??
    item?.price ??
    product?.price ??
    0
  );
}

function getLineTotal(item) {
  return Number(
    item?.line_total ??
    item?.subtotal ??
    (
      getItemPrice(item) *
      getItemQuantity(item)
    )
  );
}

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  /* ========================================================
     AUTH & CART
  ======================================================== */

  const {
    user,
    isAuthenticated,
    loading: authLoading
  } = useAuth();

  const {
    items,
    loading: cartLoading,
    totalQuantity: cartTotalQuantity,
    subtotal: cartSubtotal
  } = useCart();

  /* ========================================================
     CHECKOUT MODE
  ======================================================== */

  const searchParams = new URLSearchParams(
    location.search
  );

  const isBuyNow =
    searchParams.get("mode") === "buy-now";

  const buyNowData = isBuyNow
    ? (
        location.state?.buyNow ||
        readBuyNowData()
      )
    : null;

  const buyNowProduct =
    buyNowData?.product || null;

  const buyNowVariant =
    buyNowProduct?.variant || {};

  const buyNowVariantId =
    buyNowData?.variantId ||
    buyNowData?.variant_id ||
    buyNowVariant?.id ||
    buyNowProduct?.variant_id ||
    null;

  const buyNowQuantity = Math.max(
    1,
    Number(buyNowData?.quantity || 1)
  );

  const buyNowPrice = Number(
    buyNowVariant?.price ??
    buyNowProduct?.price ??
    0
  );

  const buyNowItems = buyNowProduct
    ? [
        {
          id: `buy-now-${buyNowProduct.id}`,
          quantity: buyNowQuantity,
          price: buyNowPrice,
          line_total: buyNowPrice * buyNowQuantity,
          product: buyNowProduct,
          variant: buyNowVariant
        }
      ]
    : [];

  const checkoutItems = isBuyNow
    ? buyNowItems
    : (items || []);

  const checkoutTotalQuantity = isBuyNow
    ? buyNowQuantity
    : Number(cartTotalQuantity || 0);

  const checkoutSubtotal = isBuyNow
    ? buyNowPrice * buyNowQuantity
    : Number(cartSubtotal || 0);

  /* ========================================================
     ADDRESS STATE
  ======================================================== */

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] =
    useState(true);
  const [addressError, setAddressError] = useState("");
  const [selectedAddressId, setSelectedAddressId] =
    useState("");

  /* ========================================================
     PAYMENT & SUBMISSION
  ======================================================== */

  const [paymentMethod, setPaymentMethod] =
    useState("cod");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [orderError, setOrderError] =
    useState("");

  const submittingRef = useRef(false);

  /* ========================================================
     AUTH PROTECTION
  ======================================================== */

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const destination =
        `${location.pathname}${location.search}`;

      navigate("/login", {
        replace: true,
        state: {
          from: {
            pathname: destination
          }
        }
      });
    }
  }, [
    authLoading,
    isAuthenticated,
    navigate,
    location.pathname,
    location.search
  ]);

  /* ========================================================
     LOAD ADDRESSES
  ======================================================== */

  useEffect(() => {
    if (authLoading || !user?.id) {
      return;
    }

    let cancelled = false;

    async function loadAddresses() {
      try {
        setAddressesLoading(true);
        setAddressError("");

        const result = await getCustomerAddresses(
          user.id
        );

        if (cancelled) return;

        const nextAddresses = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];

        setAddresses(nextAddresses);

        const preferredAddress =
          nextAddresses.find(
            address => address.is_default
          ) ||
          nextAddresses[0] ||
          null;

        setSelectedAddressId(
          preferredAddress?.id || ""
        );

      } catch (error) {
        if (cancelled) return;

        console.error(
          "Checkout address loading failed:",
          error
        );

        setAddressError(
          error?.message ||
          "Unable to load your saved addresses."
        );
      } finally {
        if (!cancelled) {
          setAddressesLoading(false);
        }
      }
    }

    loadAddresses();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user?.id
  ]);

  /* ========================================================
     SELECTED ADDRESS & TOTALS
  ======================================================== */

  const selectedAddress =
    addresses.find(
      address =>
        String(address.id) ===
        String(selectedAddressId)
    ) || null;

  const deliveryCharge = 0;
  const total = checkoutSubtotal + deliveryCharge;

  /* ========================================================
     BACK
  ======================================================== */

  function handleBack() {
    if (placingOrder) return;

    if (isBuyNow) {
      navigate("/products");
    } else {
      navigate("/cart");
    }
  }

  /* ========================================================
     PLACE ORDER
  ======================================================== */

  async function handlePlaceOrder() {
    if (submittingRef.current || placingOrder) {
      return;
    }

    setAddressError("");
    setOrderError("");

    if (!selectedAddress) {
      setAddressError(
        "Please select a delivery address before continuing."
      );
      return;
    }

    if (paymentMethod !== "cod") {
      setOrderError(
        "Online payment is not connected yet. " +
        "Please select Cash on Delivery."
      );
      return;
    }

    if (!checkoutItems.length) {
      setOrderError(
        "Your checkout does not contain any products."
      );
      return;
    }

    if (isBuyNow && !buyNowVariantId) {
      setOrderError(
        "The selected product variant is missing. " +
        "Please return to Products and select Buy Now again."
      );
      return;
    }

    if (!isBuyNow && cartLoading) {
      setOrderError(
        "Your cart is still loading. Please try again."
      );
      return;
    }

    submittingRef.current = true;
    setPlacingOrder(true);

    try {
      let createdOrder;

      if (isBuyNow) {
        createdOrder = await createBuyNowOrder({
          addressId: selectedAddress.id,
          variantId: buyNowVariantId,
          quantity: buyNowQuantity,
          paymentMethod: "cod"
        });
      } else {
        createdOrder = await createCustomerOrder({
          addressId: selectedAddress.id,
          paymentMethod: "cod"
        });
      }

      console.info(
        "AUMVEDA order created:",
        createdOrder.order_number,
        createdOrder.order_id
      );

      if (isBuyNow) {
        sessionStorage.removeItem(
          BUY_NOW_STORAGE_KEY
        );
      }

      window.location.assign("/orders");

    } catch (error) {
      console.error(
        "Checkout order placement failed:",
        error
      );

      setOrderError(
        error?.message ||
        "Unable to place the order. " +
        "Please check My Orders before trying again."
      );
    } finally {
      submittingRef.current = false;
      setPlacingOrder(false);
    }
  }

  /* ========================================================
     LOADING
  ======================================================== */

  if (authLoading) {
    return (
      <main className="checkout-page checkout-page--loading">
        <div className="checkout-loading">
          <div className="checkout-loading__spinner" />
          <p>Preparing checkout...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (
    !isBuyNow &&
    cartLoading &&
    !checkoutItems.length
  ) {
    return (
      <main className="checkout-page checkout-page--loading">
        <div className="checkout-loading">
          <div className="checkout-loading__spinner" />
          <p>Loading your order...</p>
        </div>
      </main>
    );
  }

  /* ========================================================
     EMPTY CHECKOUT
  ======================================================== */

  if (!checkoutItems.length) {
    return (
      <main className="checkout-page checkout-page--empty">
        <div className="checkout-empty">
          <div className="checkout-empty__icon">
            <ShoppingBag size={32} />
          </div>

          <span>AUMVEDA CHECKOUT</span>

          <h1>
            {isBuyNow
              ? "Product unavailable"
              : "Your cart is empty"}
          </h1>

          <p>
            {isBuyNow
              ? "Return to Products and choose an item to purchase."
              : "Add products to your cart before proceeding to checkout."}
          </p>

          <Link to="/products">
            Explore Products
            <ChevronRight size={16} />
          </Link>
        </div>
      </main>
    );
  }

  /* ========================================================
     CHECKOUT PAGE
  ======================================================== */

  return (
    <main className="checkout-page">
      <div className="checkout-container">

        {/* TOP NAVIGATION */}

        <div className="checkout-top">
          <button
            type="button"
            onClick={handleBack}
            disabled={placingOrder}
          >
            <ArrowLeft size={15} />
            {isBuyNow
              ? "Back to Products"
              : "Back to Cart"}
          </button>

          <div className="checkout-progress">
            <span className="is-active">
              Cart
            </span>
            <ChevronRight size={12} />
            <span className="is-active">
              Checkout
            </span>
            <ChevronRight size={12} />
            <span>Order</span>
          </div>
        </div>

        {/* HEADER */}

        <header className="checkout-header">
          <span>
            {isBuyNow
              ? "BUY NOW"
              : "COMPLETE YOUR ORDER"}
          </span>

          <h1>Checkout</h1>

          <p>
            {isBuyNow
              ? "Confirm your delivery details and review the selected product."
              : "Confirm your delivery details, review your products and choose a payment option."}
          </p>
        </header>

        {/* MAIN LAYOUT */}

        <div className="checkout-layout">
          <div className="checkout-main">

            {/* STEP 1 — ADDRESS */}

            <section className="checkout-card">
              <div className="checkout-card__heading">
                <div className="checkout-step-icon">
                  1
                </div>

                <div>
                  <span>DELIVERY</span>
                  <h2>Delivery Address</h2>
                  <p>
                    Choose where you would like
                    your order delivered.
                  </p>
                </div>
              </div>

              {addressError && (
                <div
                  className="checkout-message checkout-message--error"
                  role="alert"
                >
                  {addressError}
                </div>
              )}

              {addressesLoading ? (
                <div className="checkout-address-loading">
                  <div className="checkout-mini-spinner" />
                  Loading your addresses...
                </div>
              ) : addresses.length === 0 ? (
                <div className="checkout-no-address">
                  <MapPin size={24} />

                  <div>
                    <h3>No delivery address</h3>
                    <p>
                      Add an address from your profile
                      before continuing.
                    </p>
                  </div>

                  <Link to="/profile">
                    Add Address
                    <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="checkout-addresses">
                  {addresses.map(address => {
                    const selected =
                      String(selectedAddressId) ===
                      String(address.id);

                    return (
                      <button
                        key={address.id}
                        type="button"
                        disabled={placingOrder}
                        className={
                          selected
                            ? "checkout-address checkout-address--selected"
                            : "checkout-address"
                        }
                        onClick={() => {
                          setSelectedAddressId(address.id);
                          setAddressError("");
                          setOrderError("");
                        }}
                      >
                        <div className="checkout-address__radio">
                          {selected && <Check size={12} />}
                        </div>

                        <div className="checkout-address__content">
                          <div className="checkout-address__top">
                            <strong>
                              {address.label || "Address"}
                            </strong>

                            {address.is_default && (
                              <span>Default</span>
                            )}
                          </div>

                          <h3>
                            {address.recipient_name}
                          </h3>

                          <p>
                            {address.address_line1}

                            {address.address_line2
                              ? `, ${address.address_line2}`
                              : ""}

                            <br />

                            {address.city},{" "}
                            {address.state}
                            {" - "}
                            {address.postal_code}

                            {address.country && (
                              <>
                                <br />
                                {address.country}
                              </>
                            )}
                          </p>

                          {address.phone && (
                            <small>{address.phone}</small>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="checkout-manage-address">
                <Link to="/profile">
                  Manage Addresses
                  <ChevronRight size={13} />
                </Link>
              </div>
            </section>

            {/* STEP 2 — ITEMS */}

            <section className="checkout-card">
              <div className="checkout-card__heading">
                <div className="checkout-step-icon">
                  2
                </div>

                <div>
                  <span>REVIEW</span>
                  <h2>Order Items</h2>

                  <p>
                    {isBuyNow
                      ? "Review the product selected with Buy Now."
                      : "Check your products before placing the order."}
                  </p>
                </div>
              </div>

              <div className="checkout-products">
                {checkoutItems.map(item => {
                  const product = getProduct(item);
                  const variant = getVariant(item);
                  const quantity = getItemQuantity(item);
                  const lineTotal = getLineTotal(item);

                  return (
                    <div
                      key={item.id}
                      className="checkout-product"
                    >
                      <div className="checkout-product__image">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={
                              product.name ||
                              "AUMVEDA product"
                            }
                          />
                        ) : (
                          <ShoppingBag size={22} />
                        )}
                      </div>

                      <div className="checkout-product__details">
                        <strong>
                          {product.name ||
                            "AUMVEDA Product"}
                        </strong>

                        {variant.name && (
                          <span>{variant.name}</span>
                        )}

                        <small>
                          Quantity: {quantity}
                        </small>
                      </div>

                      <div className="checkout-product__price">
                        ₹{formatPrice(lineTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* STEP 3 — PAYMENT */}

            <section className="checkout-card">
              <div className="checkout-card__heading">
                <div className="checkout-step-icon">
                  3
                </div>

                <div>
                  <span>PAYMENT</span>
                  <h2>Payment Method</h2>
                  <p>
                    Select an available payment option.
                  </p>
                </div>
              </div>

              <div className="checkout-payment-options">
                <button
                  type="button"
                  disabled={placingOrder}
                  className={
                    paymentMethod === "cod"
                      ? "checkout-payment checkout-payment--selected"
                      : "checkout-payment"
                  }
                  onClick={() => {
                    setPaymentMethod("cod");
                    setAddressError("");
                    setOrderError("");
                  }}
                >
                  <span className="checkout-payment__radio">
                    {paymentMethod === "cod" && (
                      <Check size={11} />
                    )}
                  </span>

                  <Truck size={19} />

                  <span>
                    <strong>Cash on Delivery</strong>
                    <small>
                      Pay when your order arrives
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={placingOrder}
                  className={
                    paymentMethod === "online"
                      ? "checkout-payment checkout-payment--selected"
                      : "checkout-payment"
                  }
                  onClick={() => {
                    setPaymentMethod("online");
                    setAddressError("");
                    setOrderError("");
                  }}
                >
                  <span className="checkout-payment__radio">
                    {paymentMethod === "online" && (
                      <Check size={11} />
                    )}
                  </span>

                  <CreditCard size={19} />

                  <span>
                    <strong>Online Payment</strong>
                    <small>UPI and card payment</small>
                  </span>
                </button>
              </div>

              {paymentMethod === "online" && (
                <div className="checkout-payment-note">
                  Online payment is not connected yet.
                  Use Cash on Delivery for current testing.
                </div>
              )}
            </section>
          </div>

          {/* ORDER SUMMARY */}

          <aside className="checkout-summary">
            <div className="checkout-summary__header">
              <span>
                {isBuyNow
                  ? "BUY NOW SUMMARY"
                  : "ORDER SUMMARY"}
              </span>
              <h2>Your Order</h2>
            </div>

            {/* PRODUCT PREVIEW */}

            <div className="checkout-summary-products">
              {checkoutItems.slice(0, 3).map(item => {
                const product = getProduct(item);

                return (
                  <div
                    key={`summary-${item.id}`}
                    className="checkout-summary-product"
                  >
                    <div>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name || "Product"}
                        />
                      ) : (
                        <ShoppingBag size={15} />
                      )}
                    </div>

                    <span>
                      {product.name || "Product"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* PRICE SUMMARY */}

            <div className="checkout-summary__rows">
              <div>
                <span>Items</span>
                <strong>
                  {checkoutTotalQuantity}
                </strong>
              </div>

              <div>
                <span>Subtotal</span>
                <strong>
                  ₹{formatPrice(checkoutSubtotal)}
                </strong>
              </div>

              <div>
                <span>Delivery</span>
                <strong className="checkout-free">
                  FREE
                </strong>
              </div>
            </div>

            <div className="checkout-summary__divider" />

            <div className="checkout-summary__total">
              <span>Total</span>
              <strong>
                ₹{formatPrice(total)}
              </strong>
            </div>

            {/* SELECTED ADDRESS */}

            {selectedAddress && (
              <div className="checkout-summary-address">
                <div className="checkout-summary-address__label">
                  <Home size={14} />
                  Delivering to
                </div>

                <strong className="checkout-summary-address__name">
                  {selectedAddress.recipient_name}
                </strong>

                <div className="checkout-summary-address__full">
                  {selectedAddress.address_line1 && (
                    <p>
                      {selectedAddress.address_line1}
                    </p>
                  )}

                  {selectedAddress.address_line2 && (
                    <p>
                      {selectedAddress.address_line2}
                    </p>
                  )}

                  <p>
                    {selectedAddress.city},{" "}
                    {selectedAddress.state}
                    {" - "}
                    {selectedAddress.postal_code}
                  </p>

                  {selectedAddress.phone && (
                    <p className="checkout-summary-address__phone">
                      {selectedAddress.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ORDER ERROR */}

            {orderError && (
              <div
                className="checkout-message checkout-message--error"
                role="alert"
                aria-live="polite"
                style={{
                  marginTop: 14,
                  marginBottom: 0
                }}
              >
                {orderError}
              </div>
            )}

            {/* PLACE ORDER */}

            <button
              type="button"
              className="checkout-place-order"
              onClick={handlePlaceOrder}
              disabled={
                placingOrder ||
                !selectedAddress ||
                addressesLoading ||
                (!isBuyNow && cartLoading) ||
                paymentMethod !== "cod" ||
                (isBuyNow && !buyNowVariantId)
              }
            >
              {placingOrder
                ? "Placing Order..."
                : paymentMethod === "online"
                  ? "Online Payment Unavailable"
                  : "Place Order"}

              {!placingOrder && (
                <ChevronRight size={17} />
              )}
            </button>

            {isBuyNow && !buyNowVariantId && (
              <p className="checkout-summary-warning">
                This product's variant was not provided.
                Return to Products and try Buy Now again.
              </p>
            )}

            {!selectedAddress && (
              <p className="checkout-summary-warning">
                Select a delivery address to continue.
              </p>
            )}

            <div className="checkout-summary-trust">
              <PackageCheck size={17} />

              <div>
                <strong>
                  Review before ordering
                </strong>

                <span>
                  Confirm your address, products
                  and payment method before continuing.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default Checkout;
