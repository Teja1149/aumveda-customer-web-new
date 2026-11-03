
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
  UserRound,
  Wallet,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  getCustomerOrders,
  getCustomerOrderDetails
} from "../services/orderService";

import "../styles/orders.css";

/* ============================================================
   AUMVEDA CUSTOMER ORDERS
   STEP 17H.6

   - Authenticated order history
   - Dynamic status filters
   - Expandable order details
   - Ordered products
   - Delivery address
   - Payment information
   - Status history
   - Loading, empty and error states
============================================================ */

const CURRENCY_FALLBACK = "INR";

const STATUS_ICONS = {
  placed: ShoppingBag,
  pending: Package,
  confirmed: CheckCircle2,
  processing: Package,
  packed: Package,
  shipped: Truck,
  out_for_delivery: Truck,
  delivered: PackageCheck,
  completed: PackageCheck,
  cancelled: XCircle,
  canceled: XCircle,
  failed: XCircle,
  returned: Package
};

function normalizeStatus(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function readableStatus(value) {
  return normalizeStatus(value)
    .split("_")
    .map(word =>
      word ? word[0].toUpperCase() + word.slice(1) : ""
    )
    .join(" ");
}

function formatMoney(value, currency = CURRENCY_FALLBACK) {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: String(currency || CURRENCY_FALLBACK).trim(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
  } catch {
    return `₹${safeAmount.toFixed(2)}`;
  }
}

function formatDate(value, includeTime = false) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit" }
      : {})
  });
}

function formatPaymentMethod(value) {
  const method = normalizeStatus(value);

  if (method === "cod") return "Cash on Delivery";
  if (method === "online") return "Online Payment";

  return readableStatus(method);
}

function getStatusTone(status) {
  const value = normalizeStatus(status);

  if (["delivered", "completed", "paid", "success"].includes(value)) {
    return "success";
  }

  if (["cancelled", "canceled", "failed", "refunded"].includes(value)) {
    return "danger";
  }

  if (
    [
      "shipped",
      "out_for_delivery",
      "confirmed",
      "processing",
      "packed"
    ].includes(value)
  ) {
    return "progress";
  }

  return "pending";
}

function StatusBadge({ status }) {
  const Icon =
    STATUS_ICONS[normalizeStatus(status)] || Package;

  return (
    <span
      className={`orders-status orders-status--${getStatusTone(status)}`}
    >
      <Icon size={13} />
      {readableStatus(status)}
    </span>
  );
}

function DetailRow({ label, value, strong = false }) {
  return (
    <div className="orders-detail-row">
      <span>{label}</span>
      <strong className={strong ? "orders-detail-row--strong" : ""}>
        {value}
      </strong>
    </div>
  );
}

function AddressDetails({ address }) {
  if (!address || typeof address !== "object") {
    return <p className="orders-muted">Not available</p>;
  }

  const recipient =
    address.recipient_name ||
    address.recipientName ||
    address.full_name ||
    address.fullName ||
    address.name ||
    "";

  const phone = address.phone || "";

  const line1 =
    address.address_line1 ||
    address.addressLine1 ||
    address.line1 ||
    "";

  const line2 =
    address.address_line2 ||
    address.addressLine2 ||
    address.line2 ||
    "";

  const location = [
    address.city,
    address.state,
    address.postal_code ||
      address.postalCode ||
      address.pincode
  ].filter(Boolean).join(", ");

  const country = address.country || "";

  const lines = [
    recipient,
    phone,
    line1,
    line2,
    location,
    country
  ].filter(Boolean);

  if (!lines.length) {
    return <p className="orders-muted">Not available</p>;
  }

  return (
    <address className="orders-address">
      {lines.map((line, index) => (
        <span key={`${index}-${line}`}>{line}</span>
      ))}
    </address>
  );
}

function OrderItems({ items, currency }) {
  if (!Array.isArray(items) || !items.length) {
    return (
      <p className="orders-muted">
        Item details are not available for this order.
      </p>
    );
  }

  return (
    <div className="orders-items">
      {items.map((item, index) => (
        <div
          className="orders-item"
          key={item.id || `${item.product_id}-${index}`}
        >
          <div className="orders-item__icon">
            <Package size={20} />
          </div>

          <div className="orders-item__information">
            <strong>
              {item.product_name || "Product"}
            </strong>

            {item.variant_name && (
              <small>{item.variant_name}</small>
            )}

            {item.sku && (
              <small>SKU: {item.sku}</small>
            )}

            <span>
              Qty: {item.quantity} ×{" "}
              {formatMoney(item.unit_price, currency)}
            </span>
          </div>

          <div className="orders-item__right">
            <strong>
              {formatMoney(item.total_price, currency)}
            </strong>

            {item.status && (
              <span>{readableStatus(item.status)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderHistory({ history, currentStatus }) {
  const entries = Array.isArray(history)
    ? [...history].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )
    : [];

  if (!entries.length) {
    return (
      <div className="orders-history-empty">
        <StatusBadge status={currentStatus} />
        <p>
          Detailed tracking updates are not available yet.
        </p>
      </div>
    );
  }

  return (
    <ol className="orders-timeline">
      {entries.map((entry, index) => (
        <li
          className="orders-timeline__item"
          key={entry.id || index}
        >
          <span className="orders-timeline__dot" />

          <div>
            <strong>{readableStatus(entry.status)}</strong>
            <small>
              {formatDate(entry.created_at, true)}
            </small>

            {entry.notes && <p>{entry.notes}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function OrderPayments({ payments, order }) {
  const entries = Array.isArray(payments) ? payments : [];

  if (!entries.length) {
    return (
      <div className="orders-payment-summary">
        <DetailRow
          label="Payment Method"
          value={formatPaymentMethod(order.payment_method)}
        />

        <DetailRow
          label="Payment Status"
          value={readableStatus(order.payment_status)}
        />
      </div>
    );
  }

  return (
    <div className="orders-payment-list">
      {entries.map((payment, index) => (
        <div
          className="orders-payment-entry"
          key={payment.id || index}
        >
          <DetailRow
            label="Method"
            value={formatPaymentMethod(payment.payment_method)}
          />

          <DetailRow
            label="Amount"
            value={formatMoney(
              payment.amount,
              payment.currency || order.currency
            )}
          />

          <DetailRow
            label="Status"
            value={readableStatus(payment.status)}
          />

          <DetailRow
            label="Date"
            value={formatDate(payment.created_at)}
          />
        </div>
      ))}
    </div>
  );
}

function OrderExpandedDetails({
  order,
  details,
  loading,
  error,
  onRetry
}) {
  if (loading) {
    return (
      <div className="orders-expanded-loading">
        <span className="orders-spinner" />
        Loading order details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-inline-error">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  if (!details) return null;

  const currentOrder = details;
  const currency = currentOrder.currency || CURRENCY_FALLBACK;

  return (
    <div className="orders-expanded">
      <section className="orders-expanded-section">
        <div className="orders-section-heading">
          <ShoppingBag size={17} />
          <h3>Ordered Products</h3>
        </div>

        <OrderItems
          items={currentOrder.items}
          currency={currency}
        />
      </section>

      <div className="orders-expanded-grid">
        <section className="orders-expanded-section">
          <div className="orders-section-heading">
            <MapPin size={17} />
            <h3>Delivery Address</h3>
          </div>

          <AddressDetails
            address={currentOrder.shipping_address}
          />
        </section>

        <section className="orders-expanded-section">
          <div className="orders-section-heading">
            <CreditCard size={17} />
            <h3>Payment Details</h3>
          </div>

          <OrderPayments
            payments={currentOrder.payments}
            order={currentOrder}
          />
        </section>
      </div>

      <div className="orders-expanded-grid">
        <section className="orders-expanded-section">
          <div className="orders-section-heading">
            <Truck size={17} />
            <h3>Order Updates</h3>
          </div>

          <OrderHistory
            history={currentOrder.status_history}
            currentStatus={currentOrder.status}
          />
        </section>

        <section className="orders-expanded-section">
          <div className="orders-section-heading">
            <Wallet size={17} />
            <h3>Order Summary</h3>
          </div>

          <div className="orders-amount-summary">
            <DetailRow
              label="Subtotal"
              value={formatMoney(
                currentOrder.subtotal,
                currency
              )}
            />

            <DetailRow
              label="Shipping"
              value={formatMoney(
                currentOrder.shipping,
                currency
              )}
            />

            <DetailRow
              label="Discount"
              value={`−${formatMoney(
                currentOrder.discount,
                currency
              )}`}
            />

            <DetailRow
              label="Tax"
              value={formatMoney(
                currentOrder.tax,
                currency
              )}
            />

            <div className="orders-total-line">
              <strong>Total</strong>
              <strong>
                {formatMoney(
                  currentOrder.total_amount,
                  currency
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {currentOrder.customer_notes && (
        <section className="orders-expanded-section">
          <div className="orders-section-heading">
            <h3>Order Notes</h3>
          </div>

          <p className="orders-notes">
            {currentOrder.customer_notes}
          </p>
        </section>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  details,
  loading,
  error,
  onToggle,
  onRetry
}) {
  return (
    <article className="orders-card">
      <div className="orders-card__header">
        <div className="orders-card__identity">
          <span className="orders-card__eyebrow">
            ORDER NUMBER
          </span>
          <h2>
            {order.order_number || order.id}
          </h2>
        </div>

        <StatusBadge status={order.status} />
      </div>

      <div className="orders-card__details">
        <div>
          <CalendarDays size={15} />
          <span>
            {formatDate(order.created_at)}
          </span>
        </div>

        <div>
          <CreditCard size={15} />
          <span>
            {formatPaymentMethod(order.payment_method)}
          </span>
        </div>

        <div>
          <Wallet size={15} />
          <span>
            Payment: {readableStatus(order.payment_status)}
          </span>
        </div>
      </div>

      <div className="orders-card__footer">
        <div className="orders-card__total">
          <span>Order Total</span>
          <strong>
            {formatMoney(
              order.total_amount,
              order.currency
            )}
          </strong>
        </div>

        <button
          type="button"
          className="orders-card__toggle"
          onClick={() => onToggle(order.id)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide Details" : "View Details"}
          {expanded
            ? <ChevronUp size={16} />
            : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <OrderExpandedDetails
          order={order}
          details={details}
          loading={loading}
          error={error}
          onRetry={() => onRetry(order.id)}
        />
      )}
    </article>
  );
}

/* ============================================================
   MAIN ORDERS PAGE
============================================================ */

function Orders() {
  const {
    user,
    loading: authLoading,
    isAuthenticated
  } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedOrderId, setExpandedOrderId] =
    useState(null);

  const [detailsById, setDetailsById] = useState({});
  const [detailLoadingId, setDetailLoadingId] =
    useState(null);
  const [detailErrors, setDetailErrors] = useState({});

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const result = await getCustomerOrders(
          controller.signal
        );

        if (controller.signal.aborted) return;

        setOrders(result);
      } catch (requestError) {
        if (controller.signal.aborted) return;

        console.error(
          "Customer order loading failed:",
          requestError
        );

        setError(
          requestError?.message ||
          "Unable to load your orders."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => controller.abort();
  }, [
    authLoading,
    isAuthenticated,
    user?.id,
    refreshKey
  ]);

  const filters = useMemo(() => {
    const statusValues = [...new Set(
      orders.map(order => normalizeStatus(order.status))
    )];

    return [
      { value: "all", label: "All Orders" },
      ...statusValues.sort().map(statusValue => ({
        value: statusValue,
        label: readableStatus(statusValue)
      }))
    ];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;

    return orders.filter(
      order => normalizeStatus(order.status) === filter
    );
  }, [orders, filter]);

  async function loadOrderDetails(orderId) {
    try {
      setDetailLoadingId(orderId);
      setDetailErrors(previous => ({
        ...previous,
        [orderId]: ""
      }));

      const result = await getCustomerOrderDetails(orderId);

      setDetailsById(previous => ({
        ...previous,
        [orderId]: result
      }));
    } catch (requestError) {
      console.error(
        "Customer order details failed:",
        requestError
      );

      setDetailErrors(previous => ({
        ...previous,
        [orderId]:
          requestError?.message ||
          "Unable to load order details."
      }));
    } finally {
      setDetailLoadingId(current =>
        current === orderId ? null : current
      );
    }
  }

  function handleToggle(orderId) {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);

    if (!detailsById[orderId]) {
      loadOrderDetails(orderId);
    }
  }

  function refreshOrders() {
    setExpandedOrderId(null);
    setDetailsById({});
    setDetailErrors({});
    setFilter("all");
    setRefreshKey(value => value + 1);
  }

  /* ========================================================
     AUTH LOADING
  ======================================================== */

  if (authLoading) {
    return (
      <main className="orders-page orders-page--state">
        <div className="orders-state">
          <span className="orders-spinner" />
          <p>Checking your account...</p>
        </div>
      </main>
    );
  }

  /* ========================================================
     NOT SIGNED IN
  ======================================================== */

  if (!isAuthenticated) {
    return (
      <main className="orders-page orders-page--state">
        <div className="orders-state">
          <div className="orders-state__icon">
            <UserRound size={28} />
          </div>

          <h1>Sign In to View Orders</h1>

          <p>
            Access your purchases, delivery information
            and order updates in one place.
          </p>

          <Link
            to="/login"
            className="orders-primary-link"
          >
            Sign In
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <div className="orders-container">

        {/* PAGE HEADER */}

        <header className="orders-page__header">
          <div>
            <Link
              to="/profile"
              className="orders-page__back"
            >
              <ArrowLeft size={15} />
              Back to Account
            </Link>

            <span className="orders-page__eyebrow">
              MY ACCOUNT
            </span>

            <h1>My Orders</h1>

            <p>
              View your purchases and stay updated
              on your order status.
            </p>
          </div>

          <button
            type="button"
            className="orders-refresh-button"
            onClick={refreshOrders}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </header>

        {/* SUMMARY */}

        <section className="orders-overview">
          <div className="orders-overview__icon">
            <ShoppingBag size={23} />
          </div>

          <div>
            <span>YOUR ORDER HISTORY</span>
            <strong>
              {loading
                ? "Loading orders..."
                : `${orders.length} ${
                    orders.length === 1
                      ? "Order"
                      : "Orders"
                  }`}
            </strong>
          </div>
        </section>

        {/* LOADING */}

        {loading ? (
          <div className="orders-state orders-state--inline">
            <span className="orders-spinner" />
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="orders-state orders-state--inline">
            <div className="orders-state__icon">
              <XCircle size={26} />
            </div>

            <h2>Unable to Load Orders</h2>
            <p>{error}</p>

            <button
              type="button"
              className="orders-primary-link"
              onClick={refreshOrders}
            >
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-state orders-state--inline">
            <div className="orders-state__icon">
              <Package size={28} />
            </div>

            <h2>No Orders Yet</h2>

            <p>
              Your purchases will appear here once
              you place an order.
            </p>

            <Link
              to="/products"
              className="orders-primary-link"
            >
              Explore Products
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            {/* STATUS FILTERS */}

            <div className="orders-filters">
              {filters.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    "orders-filter" +
                    (filter === option.value
                      ? " orders-filter--active"
                      : "")
                  }
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="orders-results-count">
              Showing {filteredOrders.length} of{" "}
              {orders.length} orders
            </div>

            {/* ORDER CARDS */}

            {filteredOrders.length ? (
              <div className="orders-list">
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedOrderId === order.id}
                    details={detailsById[order.id]}
                    loading={detailLoadingId === order.id}
                    error={detailErrors[order.id]}
                    onToggle={handleToggle}
                    onRetry={loadOrderDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="orders-filter-empty">
                <Package size={25} />
                <h3>No Matching Orders</h3>
                <p>
                  There are no orders with this status.
                </p>

                <button
                  type="button"
                  onClick={() => setFilter("all")}
                >
                  View All Orders
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default Orders;
