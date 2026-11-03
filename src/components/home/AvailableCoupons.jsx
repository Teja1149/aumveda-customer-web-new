
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgePercent,
  Check,
  Copy,
  Gift,
  RefreshCw,
  TicketPercent,
} from "lucide-react";

import {
  getHomeCoupons,
  invalidateHomeCouponsCache,
} from "../../services/homeService";

import "../../styles/available-coupons.css";

/* ============================================================
   AUMVEDA — AVAILABLE COUPONS

   CUSTOMER WEB HOMEPAGE

   Backend:
   GET /api/v1/home/coupons

   Supports:
   - Native fetch API response
   - Axios-style response compatibility
   - Dynamic Admin-created coupons
   - Automatic refresh
   - Loading state
   - API error state
   - Empty state
   - Coupon copy
   - Responsive existing CSS
============================================================ */

const REFRESH_INTERVAL = 60 * 1000;

/* ============================================================
   CURRENCY FORMATTER
============================================================ */

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  const amount = Number(value);

  return currencyFormatter.format(
    Number.isFinite(amount) ? amount : 0
  );
}

/* ============================================================
   NORMALIZE API RESPONSE

   Your native fetch API returns:

   {
     status: "success",
     count: 3,
     data: [...]
   }

   Also supports nested response formats.
============================================================ */

function getCouponList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  const candidates = [
    response?.data,
    response?.items,
    response?.data?.data,
    response?.data?.items,
    response?.data?.data?.data,
  ];

  return candidates.find(Array.isArray) || [];
}

/* ============================================================
   COUPON AVAILABILITY

   Backend already filters:
   - Active coupons
   - Started coupons
   - Unexpired coupons

   Frontend additionally validates timestamps.
============================================================ */

function isCurrentlyAvailable(coupon, now) {
  if (!coupon || !coupon.code) {
    return false;
  }

  if (coupon.is_active === false) {
    return false;
  }

  if (coupon.starts_at) {
    const start = Date.parse(coupon.starts_at);

    if (!Number.isFinite(start) || start > now) {
      return false;
    }
  }

  if (coupon.expires_at) {
    const expiry = Date.parse(coupon.expires_at);

    if (!Number.isFinite(expiry) || expiry <= now) {
      return false;
    }
  }

  return true;
}

/* ============================================================
   DISCOUNT LABEL
============================================================ */

function getDiscountLabel(coupon) {
  const amount = Number(coupon.discount_value || 0);

  if (coupon.discount_type === "percentage") {
    return `${amount}%`;
  }

  return formatCurrency(amount);
}

/* ============================================================
   COUPON DESCRIPTION

   Database eligibility values are authoritative.

   We show the minimum amount separately, even when the
   Admin description contains an inconsistent amount.
============================================================ */

function getCouponDescription(coupon) {
  const description = String(
    coupon.description || ""
  ).trim();

  const minOrder = Number(
    coupon.min_order_value || 0
  );

  const maxDiscount = Number(
    coupon.max_discount_amount || 0
  );

  const lines = [];

  if (description) {
    lines.push(description);
  }

  if (minOrder > 0) {
    lines.push(
      `Minimum order: ${formatCurrency(minOrder)}`
    );
  }

  if (
    coupon.discount_type === "percentage" &&
    maxDiscount > 0
  ) {
    lines.push(
      `Maximum discount: ${formatCurrency(maxDiscount)}`
    );
  }

  if (coupon.first_order_only) {
    lines.push("First order only");
  }

  return lines.length
    ? lines.join(" • ")
    : "Apply this coupon at checkout.";
}

/* ============================================================
   COPY TO CLIPBOARD
============================================================ */

async function copyCouponCode(code) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      return;
    } catch {
      // Use fallback.
    }
  }

  const textarea = document.createElement("textarea");

  textarea.value = code;
  textarea.setAttribute("readonly", "");

  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);

  try {
    textarea.select();

    const successful = document.execCommand("copy");

    if (!successful) {
      throw new Error("Clipboard copy failed.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function AvailableCoupons() {
  const [coupons, setCoupons] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [copiedCode, setCopiedCode] = useState("");

  const [now, setNow] = useState(Date.now());

  /* ==========================================================
     LOAD COUPONS

     Uses existing Customer Web homeService.js.
  ========================================================== */

  const loadCoupons = useCallback(
    async ({ refresh = false, silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        if (refresh) {
          invalidateHomeCouponsCache();
        }

        const response = await getHomeCoupons();

        const couponList = getCouponList(response);

        console.info(
          "[AUMVEDA] Home coupons loaded:",
          couponList.length
        );

        setCoupons(couponList);
        setError("");
        setNow(Date.now());
      } catch (requestError) {
        console.error(
          "[AUMVEDA] Unable to load homepage coupons:",
          requestError
        );

        setError(
          requestError?.message ||
            "Unable to retrieve available coupons."
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  /* ==========================================================
     INITIAL LOAD + PERIODIC REFRESH

     Refresh while the homepage is visible.
  ========================================================== */

  useEffect(() => {
    loadCoupons();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadCoupons({
          refresh: true,
          silent: true,
        });
      }
    }, REFRESH_INTERVAL);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadCoupons({
          refresh: true,
          silent: true,
        });
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadCoupons]);

  /* ==========================================================
     RESET COPIED STATUS
  ========================================================== */

  useEffect(() => {
    if (!copiedCode) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopiedCode("");
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [copiedCode]);

  /* ==========================================================
     AVAILABLE COUPONS
  ========================================================== */

  const availableCoupons = useMemo(() => {
    return coupons.filter((coupon) =>
      isCurrentlyAvailable(coupon, now)
    );
  }, [coupons, now]);

  /* ==========================================================
     HANDLE COPY
  ========================================================== */

  async function handleCopy(code) {
    try {
      await copyCouponCode(code);

      setCopiedCode(code);
    } catch (copyError) {
      console.error(
        "[AUMVEDA] Coupon copy failed:",
        copyError
      );

      setError(
        "Could not copy the coupon automatically. Please copy the code manually."
      );
    }
  }

  /* ==========================================================
     LOADING STATE

     Never hide the section silently during loading.
  ========================================================== */

  if (loading && coupons.length === 0) {
    return (
      <section
        className="aum-coupons"
        aria-label="Available Coupons"
        aria-busy="true"
      >
        <div className="aum-coupons__heading">
          <div className="aum-coupons__heading-left">
            <span className="aum-coupons__heading-icon">
              <TicketPercent size={23} />
            </span>

            <div className="aum-coupons__heading-text">
              <h2>Available Coupons</h2>
              <p>Loading your latest offers...</p>
            </div>
          </div>
        </div>

        <p
          style={{
            color: "#716a63",
            fontSize: 13,
            margin: 0,
          }}
        >
          Please wait while we load available coupons.
        </p>
      </section>
    );
  }

  /* ==========================================================
     ERROR STATE

     Display actual API error with retry button.
  ========================================================== */

  if (error && availableCoupons.length === 0) {
    return (
      <section
        className="aum-coupons"
        aria-label="Available Coupons"
      >
        <div className="aum-coupons__heading">
          <div className="aum-coupons__heading-left">
            <span className="aum-coupons__heading-icon">
              <TicketPercent size={23} />
            </span>

            <div className="aum-coupons__heading-text">
              <h2>Available Coupons</h2>

              <p>
                We couldn't load your current offers.
              </p>
            </div>
          </div>
        </div>

        <div
          role="alert"
          style={{
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #efc6bc",
            background: "#fff8f6",
            color: "#a83224",
          }}
        >
          <p
            style={{
              fontSize: 13,
              margin: "0 0 10px",
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadCoupons({ refresh: true })
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 13px",
              borderRadius: 8,
              border: "1px solid #173e30",
              background: "#173e30",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <RefreshCw size={14} />
            Retry Coupons
          </button>
        </div>
      </section>
    );
  }

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  if (availableCoupons.length === 0) {
    return (
      <section
        className="aum-coupons"
        aria-label="Available Coupons"
      >
        <div className="aum-coupons__heading">
          <div className="aum-coupons__heading-left">
            <span className="aum-coupons__heading-icon">
              <TicketPercent size={23} />
            </span>

            <div className="aum-coupons__heading-text">
              <h2>Available Coupons</h2>

              <p>
                New offers are coming soon.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadCoupons({ refresh: true })
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 13px",
            borderRadius: 8,
            border: "1px solid #173e30",
            background: "#173e30",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <RefreshCw size={14} />
          Check Offers
        </button>
      </section>
    );
  }

  /* ==========================================================
     COUPONS UI
  ========================================================== */

  return (
    <section
      className="aum-coupons"
      aria-labelledby="aum-coupons-heading"
    >
      {/* HEADER */}

      <div className="aum-coupons__heading">
        <div className="aum-coupons__heading-left">
          <span className="aum-coupons__heading-icon">
            <TicketPercent
              size={23}
              strokeWidth={1.8}
            />
          </span>

          <div className="aum-coupons__heading-text">
            <h2 id="aum-coupons-heading">
              Available Coupons
            </h2>

            <p>
              Use these offers at checkout and save more.
            </p>
          </div>
        </div>

        <span className="aum-coupons__count">
          {availableCoupons.length}{" "}
          {availableCoupons.length === 1
            ? "OFFER"
            : "OFFERS"}
        </span>
      </div>

      {/* COUPON CARDS */}

      <div className="aum-coupons__grid">
        {availableCoupons.map((coupon) => {
          const isPercentage =
            coupon.discount_type === "percentage";

          const copied =
            copiedCode === coupon.code;

          return (
            <article
              className="aum-coupon-card"
              key={coupon.id || coupon.code}
            >
              {/* DISCOUNT */}

              <div className="aum-coupon-card__discount">
                <strong>
                  {getDiscountLabel(coupon)}
                </strong>

                <span>OFF</span>
              </div>

              {/* DIVIDER */}

              <div
                className="aum-coupon-card__divider"
                aria-hidden="true"
              />

              {/* COUPON INFORMATION */}

              <div className="aum-coupon-card__details">
                <div className="aum-coupon-card__code-row">
                  <Gift size={13} />

                  <h3>{coupon.code}</h3>
                </div>

                <p>
                  {getCouponDescription(coupon)}
                </p>

                <span className="aum-coupon-card__type">
                  <BadgePercent size={12} />

                  {isPercentage
                    ? "Percentage offer"
                    : "Fixed amount offer"}
                </span>
              </div>

              {/* COPY BUTTON */}

              <button
                type="button"
                className={
                  "aum-coupon-card__copy" +
                  (copied ? " is-copied" : "")
                }
                onClick={() =>
                  handleCopy(coupon.code)
                }
                aria-label={
                  copied
                    ? `${coupon.code} copied`
                    : `Copy coupon ${coupon.code}`
                }
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      {/* ELIGIBILITY NOTICE */}

      <p className="aum-coupons__footer">
        Coupon eligibility and final discounts are
        verified during checkout.
      </p>
    </section>
  );
}
