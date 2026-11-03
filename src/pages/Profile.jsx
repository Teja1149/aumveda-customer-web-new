
import { useEffect, useState } from "react";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Edit3,
  Heart,
  Home,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Save,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

import {
  getCustomerProfile,
  updateCustomerProfile
} from "../services/profileService";

import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultAddress,
  updateCustomerAddress
} from "../services/addressService";

import "../styles/profile.css";

/* ============================================================
   AUMVEDA CUSTOMER PROFILE — STEP 17H.6

   Profile editing
   Saved addresses
   Default address management
   Wishlist, Cart, Products and My Orders
   Account details
   Logout
============================================================ */

const EMPTY_ADDRESS_FORM = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false
};

const EMPTY_PROFILE_FORM = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  marketingOptIn: false
};

/* ============================================================
   HELPERS
============================================================ */

function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "A";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (
    words[0][0] + words[words.length - 1][0]
  ).toUpperCase();
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(
    `${String(value).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function memberSinceOf(value) {
  if (!value) return "AUMVEDA Member";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "AUMVEDA Member";
  }

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function validatePhone(value) {
  const cleaned = String(value || "").trim();

  if (!cleaned) return true;

  return /^[0-9+\-\s()]{7,20}$/.test(cleaned);
}

function profileToForm(profile, user) {
  return {
    fullName:
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      "",
    phone: profile?.phone || "",
    dateOfBirth:
      profile?.date_of_birth?.slice(0, 10) || "",
    gender: profile?.gender || "",
    marketingOptIn: Boolean(
      profile?.marketing_opt_in
    )
  };
}

function addressToForm(address) {
  return {
    label: address.label || "Home",
    recipientName: address.recipient_name || "",
    phone: address.phone || "",
    addressLine1: address.address_line1 || "",
    addressLine2: address.address_line2 || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postal_code || "",
    country: address.country || "India",
    isDefault: Boolean(address.is_default)
  };
}

function normalizeAddresses(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

/* ============================================================
   REUSABLE COMPONENTS
============================================================ */

function InfoItem({
  label,
  value,
  className = "",
  wide = false
}) {
  return (
    <div
      className={[
        "profile-information-item",
        wide ? "profile-information-item--wide" : ""
      ].join(" ")}
    >
      <span>{label}</span>
      <strong className={className}>
        {value ?? "Not provided"}
      </strong>
    </div>
  );
}

function ProfileField({
  label,
  htmlFor,
  children,
  readOnly = false
}) {
  return (
    <div className="profile-field">
      <label htmlFor={htmlFor}>{label}</label>

      <div
        className={
          "profile-input-shell" +
          (readOnly
            ? " profile-input-shell--readonly"
            : "")
        }
      >
        {children}
      </div>
    </div>
  );
}

function AddressField({
  label,
  htmlFor,
  children,
  full = false
}) {
  return (
    <div
      className={
        "profile-address-field" +
        (full ? " profile-address-field--full" : "")
      }
    >
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function AddressCard({
  address,
  busy,
  onDefault,
  onEdit,
  onDelete
}) {
  const Icon =
    ["work", "office"].includes(
      String(address.label || "").toLowerCase()
    )
      ? BriefcaseBusiness
      : Home;

  return (
    <div
      className={
        "profile-address-card" +
        (address.is_default
          ? " profile-address-card--default"
          : "")
      }
    >
      <div className="profile-address-card__top">
        <div className="profile-address-card__label">
          <span className="profile-address-card__icon">
            <Icon size={16} />
          </span>
          <strong>{address.label || "Address"}</strong>
        </div>

        {address.is_default && (
          <span className="profile-address-default-badge">
            <Star size={11} fill="currentColor" />
            Default
          </span>
        )}
      </div>

      <div className="profile-address-card__body">
        <strong className="profile-address-recipient">
          {address.recipient_name}
        </strong>

        <div className="profile-address-phone">
          <Phone size={13} />
          {address.phone}
        </div>

        <address>
          {address.address_line1}

          {address.address_line2 && (
            <>
              <br />
              {address.address_line2}
            </>
          )}

          <br />
          {address.city}, {address.state} -{" "}
          {address.postal_code}
          <br />
          {address.country}
        </address>
      </div>

      <div className="profile-address-card__actions">
        {!address.is_default && (
          <button
            type="button"
            className="profile-address-default-button"
            onClick={() => onDefault(address)}
            disabled={busy}
          >
            <Star size={12} />
            Set Default
          </button>
        )}

        <button
          type="button"
          className="profile-address-edit-button"
          onClick={() => onEdit(address)}
          disabled={busy}
        >
          <Pencil size={12} />
          Edit
        </button>

        <button
          type="button"
          className="profile-address-delete-button"
          onClick={() => onDelete(address)}
          disabled={busy}
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PROFILE
============================================================ */

function Profile() {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
    refreshUser
  } = useAuth();

  const wishlistContext = useWishlist();
  const cartContext = useCart();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] =
    useState(true);

  const [formData, setFormData] = useState(
    EMPTY_PROFILE_FORM
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] =
    useState(true);

  const [addressFormOpen, setAddressFormOpen] =
    useState(false);

  const [editingAddressId, setEditingAddressId] =
    useState(null);

  const [addressForm, setAddressForm] = useState({
    ...EMPTY_ADDRESS_FORM
  });

  const [addressSaving, setAddressSaving] =
    useState(false);

  const [addressActionId, setAddressActionId] =
    useState(null);

  const [addressError, setAddressError] =
    useState("");
  const [addressSuccess, setAddressSuccess] =
    useState("");

  /* ========================================================
     CART AND WISHLIST COUNTS
  ======================================================== */

  const wishlistCount = Number(
    wishlistContext?.wishlistCount ??
    wishlistContext?.wishlistIds?.length ??
    wishlistContext?.wishlistIds?.size ??
    0
  );

  const cartCount = Number(
    cartContext?.totalQuantity ??
    cartContext?.cartItems?.reduce(
      (total, item) =>
        total + Number(item?.quantity || 0),
      0
    ) ??
    cartContext?.items?.reduce(
      (total, item) =>
        total + Number(item?.quantity || 0),
      0
    ) ??
    0
  );

  /* ========================================================
     LOAD PROFILE
  ======================================================== */

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading) {
        setProfileLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        setProfileLoading(true);

        const data = await getCustomerProfile(
          user.id
        );

        if (cancelled) return;

        setProfile(data);
        setFormData(profileToForm(data, user));
        setErrorMessage("");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Profile loading failed:",
          error
        );

        setErrorMessage(
          error?.message ||
          "Unable to load your profile."
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user?.id,
    user?.user_metadata?.full_name
  ]);

  /* ========================================================
     LOAD ADDRESSES
  ======================================================== */

  useEffect(() => {
    if (authLoading || !user?.id) {
      if (!authLoading) {
        setAddressesLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function loadAddresses() {
      try {
        setAddressesLoading(true);

        const response =
          await getCustomerAddresses(user.id);

        if (cancelled) return;

        setAddresses(
          normalizeAddresses(response)
        );

        setAddressError("");
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Address loading failed:",
          error
        );

        setAddressError(
          error?.message ||
          "Unable to load saved addresses."
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
  }, [authLoading, user?.id]);

  /* ========================================================
     DERIVED PROFILE VALUES
  ======================================================== */

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "AUMVEDA Customer";

  const initials = getInitials(displayName);

  const memberSince = memberSinceOf(
    profile?.created_at || user?.created_at
  );

  const defaultAddress =
    addresses.find(item => item.is_default) ||
    addresses[0] ||
    null;

  /* ========================================================
     PROFILE EDIT
  ======================================================== */

  function handleStartEdit() {
    setFormData(profileToForm(profile, user));
    setErrorMessage("");
    setSuccessMessage("");
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setErrorMessage("");
  }

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked
    } = event.target;

    setFormData(previous => ({
      ...previous,
      [name]:
        type === "checkbox" ? checked : value
    }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (saving || !user?.id) return;

    const cleanName = formData.fullName.trim();

    if (!cleanName) {
      setErrorMessage(
        "Please enter your full name."
      );
      return;
    }

    if (!validatePhone(formData.phone)) {
      setErrorMessage(
        "Please enter a valid phone number."
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const updated = await updateCustomerProfile({
        userId: user.id,
        fullName: cleanName,
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        marketingOptIn: formData.marketingOptIn
      });

      setProfile(updated);
      setFormData(profileToForm(updated, user));
      setEditing(false);

      if (typeof refreshUser === "function") {
        try {
          await refreshUser();
        } catch (refreshError) {
          console.warn(
            "User refresh failed after profile save:",
            refreshError
          );
        }
      }

      setSuccessMessage(
        "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Profile save failed:",
        error
      );

      setErrorMessage(
        error?.message ||
        "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ========================================================
     ADDRESS HELPERS
  ======================================================== */

  async function refreshAddresses() {
    if (!user?.id) return [];

    const response =
      await getCustomerAddresses(user.id);

    const normalized =
      normalizeAddresses(response);

    setAddresses(normalized);

    return normalized;
  }

  function handleAddAddress() {
    setEditingAddressId(null);

    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      recipientName:
        profile?.full_name || displayName,
      phone: profile?.phone || "",
      isDefault: addresses.length === 0
    });

    setAddressError("");
    setAddressSuccess("");
    setAddressFormOpen(true);
  }

  function handleEditAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm(addressToForm(address));
    setAddressError("");
    setAddressSuccess("");
    setAddressFormOpen(true);
  }

  function handleAddressChange(event) {
    const {
      name,
      value,
      type,
      checked
    } = event.target;

    let nextValue =
      type === "checkbox" ? checked : value;

    if (name === "postalCode") {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 6);
    }

    setAddressForm(previous => ({
      ...previous,
      [name]: nextValue
    }));
  }

  function handleCloseAddressForm() {
    if (addressSaving) return;

    setAddressFormOpen(false);
    setEditingAddressId(null);
    setAddressError("");
  }

  /* ========================================================
     CREATE / UPDATE ADDRESS
  ======================================================== */

  async function handleAddressSave(event) {
    event.preventDefault();

    if (addressSaving || !user?.id) return;

    if (!addressForm.recipientName.trim()) {
      setAddressError(
        "Recipient name is required."
      );
      return;
    }

    if (
      !addressForm.phone.trim() ||
      !validatePhone(addressForm.phone)
    ) {
      setAddressError(
        "Please enter a valid phone number."
      );
      return;
    }

    if (!addressForm.addressLine1.trim()) {
      setAddressError(
        "Address line 1 is required."
      );
      return;
    }

    if (!addressForm.city.trim()) {
      setAddressError("City is required.");
      return;
    }

    if (!addressForm.state.trim()) {
      setAddressError("State is required.");
      return;
    }

    if (
      !/^\d{6}$/.test(
        addressForm.postalCode.trim()
      )
    ) {
      setAddressError(
        "Enter a valid 6-digit PIN code."
      );
      return;
    }

    try {
      setAddressSaving(true);
      setAddressError("");
      setAddressSuccess("");

      const isEditing =
        editingAddressId !== null &&
        editingAddressId !== undefined;

      const payload = {
        customerId: user.id,
        label:
          addressForm.label.trim() || "Home",
        recipientName:
          addressForm.recipientName.trim(),
        phone: addressForm.phone.trim(),
        addressLine1:
          addressForm.addressLine1.trim(),
        addressLine2:
          addressForm.addressLine2.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        postalCode:
          addressForm.postalCode.trim(),
        country:
          addressForm.country.trim() || "India",
        isDefault:
          addresses.length === 0
            ? true
            : addressForm.isDefault
      };

      if (isEditing) {
        await updateCustomerAddress({
          addressId: editingAddressId,
          ...payload
        });
      } else {
        await createCustomerAddress(payload);
      }

      await refreshAddresses();

      setAddressFormOpen(false);
      setEditingAddressId(null);

      setAddressSuccess(
        isEditing
          ? "Address updated successfully."
          : "Address added successfully."
      );
    } catch (error) {
      console.error(
        "Address save failed:",
        error
      );

      setAddressError(
        error?.message ||
        "Unable to save address."
      );
    } finally {
      setAddressSaving(false);
    }
  }

  /* ========================================================
     SET DEFAULT ADDRESS
  ======================================================== */

  async function handleSetDefault(address) {
    if (
      !user?.id ||
      address.is_default ||
      addressActionId !== null
    ) {
      return;
    }

    try {
      setAddressActionId(address.id);
      setAddressError("");
      setAddressSuccess("");

      await setDefaultAddress(
        address.id,
        user.id
      );

      await refreshAddresses();

      setAddressSuccess(
        "Default address updated."
      );
    } catch (error) {
      console.error(
        "Set default address failed:",
        error
      );

      setAddressError(
        error?.message ||
        "Unable to set default address."
      );
    } finally {
      setAddressActionId(null);
    }
  }

  /* ========================================================
     DELETE ADDRESS
  ======================================================== */

  async function handleDeleteAddress(address) {
    if (
      !user?.id ||
      addressActionId !== null
    ) {
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this address?"
      )
    ) {
      return;
    }

    try {
      setAddressActionId(address.id);
      setAddressError("");
      setAddressSuccess("");

      const wasDefault = Boolean(
        address.is_default
      );

      await deleteCustomerAddress(
        address.id,
        user.id
      );

      let refreshed =
        await refreshAddresses();

      if (
        wasDefault &&
        refreshed.length > 0 &&
        !refreshed.some(
          item => item.is_default
        )
      ) {
        await setDefaultAddress(
          refreshed[0].id,
          user.id
        );

        refreshed =
          await refreshAddresses();
      }

      setAddressSuccess(
        "Address deleted successfully."
      );
    } catch (error) {
      console.error(
        "Address deletion failed:",
        error
      );

      setAddressError(
        error?.message ||
        "Unable to delete address."
      );
    } finally {
      setAddressActionId(null);
    }
  }

  /* ========================================================
     SIGN OUT
  ======================================================== */

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setErrorMessage("");

      await logout();

      navigate("/", {
        replace: true
      });
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      setErrorMessage(
        error?.message ||
        "Unable to sign out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  /* ========================================================
     LOADING STATE
  ======================================================== */

  if (
    authLoading ||
    (isAuthenticated && profileLoading)
  ) {
    return (
      <main className="profile-page profile-page--state">
        <div className="profile-state-card">
          <div className="profile-loading-ring" />
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  /* ========================================================
     UNAUTHENTICATED STATE
  ======================================================== */

  if (!isAuthenticated) {
    return (
      <main className="profile-page profile-page--state">
        <div className="profile-state-card">
          <div className="profile-state-card__icon">
            <UserRound size={25} />
          </div>

          <h1>Sign In to Your Account</h1>

          <p>
            Sign in to manage your personal details
            and delivery addresses.
          </p>

          <Link
            to="/login"
            className="profile-state-card__button"
          >
            Sign In
            <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    );
  }

  /* ========================================================
     RENDER PROFILE
  ======================================================== */

  return (
    <main className="profile-page">
      <div
        className="profile-page__orb profile-page__orb--one"
        aria-hidden="true"
      />

      <div
        className="profile-page__orb profile-page__orb--two"
        aria-hidden="true"
      />

      <div className="profile-container">
        {/* PROFILE HEADER */}

        <header className="profile-page__header">
          <span className="profile-page__eyebrow-text">
            MY ACCOUNT
          </span>

          <h1>My Profile</h1>

          <p>
            Manage your personal information,
            saved addresses and account details.
          </p>
        </header>

        {/* GLOBAL MESSAGES */}

        {successMessage && (
          <div
            className="profile-global-message profile-global-message--success"
            role="status"
          >
            <Check size={15} />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            className="profile-global-message profile-global-message--error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <section className="profile-layout">
          {/* =================================================
              LEFT SIDEBAR
          ================================================= */}

          <aside className="profile-identity-card">
            <div className="profile-avatar-shell">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="profile-avatar-image"
                />
              ) : (
                <div className="profile-avatar">
                  {initials}
                </div>
              )}

              {profile?.is_active && (
                <span className="profile-avatar__status">
                  <Check size={11} />
                </span>
              )}
            </div>

            <h2>{displayName}</h2>

            <p className="profile-identity-card__email">
              {user?.email}
            </p>

            <div className="profile-member-chip">
              <CalendarDays size={13} />
              Member since {memberSince}
            </div>

            <div className="profile-identity-card__divider" />

            {/* QUICK NAVIGATION */}

            <nav className="profile-quick-links">
              {/* MY ORDERS — NEW */}

              <Link
                to="/orders"
                className="profile-quick-link"
              >
                <span className="profile-quick-link__icon">
                  <Package size={16} />
                </span>

                <span className="profile-quick-link__content">
                  <strong>My Orders</strong>
                  <small>View order history</small>
                </span>

                <ArrowRight size={14} />
              </Link>

              {/* WISHLIST */}

              <Link
                to="/wishlist"
                className="profile-quick-link"
              >
                <span className="profile-quick-link__icon">
                  <Heart size={16} />
                </span>

                <span className="profile-quick-link__content">
                  <strong>Wishlist</strong>
                  <small>
                    {wishlistCount} saved items
                  </small>
                </span>

                <ArrowRight size={14} />
              </Link>

              {/* CART */}

              <Link
                to="/cart"
                className="profile-quick-link"
              >
                <span className="profile-quick-link__icon">
                  <ShoppingBag size={16} />
                </span>

                <span className="profile-quick-link__content">
                  <strong>Cart</strong>
                  <small>{cartCount} items</small>
                </span>

                <ArrowRight size={14} />
              </Link>

              {/* PRODUCTS */}

              <Link
                to="/products"
                className="profile-quick-link"
              >
                <span className="profile-quick-link__icon">
                  <Package size={16} />
                </span>

                <span className="profile-quick-link__content">
                  <strong>Products</strong>
                  <small>Continue shopping</small>
                </span>

                <ArrowRight size={14} />
              </Link>
            </nav>

            {/* LOGOUT */}

            <button
              type="button"
              className="profile-logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={15} />

              {loggingOut
                ? "Signing Out..."
                : "Sign Out"}
            </button>
          </aside>

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <div className="profile-main">
            {/* PERSONAL INFORMATION */}

            <article className="profile-card">
              <div className="profile-card__header">
                <div>
                  <span className="profile-card__label">
                    PERSONAL DETAILS
                  </span>

                  <h2>Personal Information</h2>
                </div>

                {!editing && (
                  <button
                    type="button"
                    className="profile-edit-button"
                    onClick={handleStartEdit}
                  >
                    <Edit3 size={14} />
                    Edit Profile
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="profile-information-grid">
                  <InfoItem
                    label="Full Name"
                    value={displayName}
                  />

                  <InfoItem
                    label="Email Address"
                    value={
                      user?.email ||
                      "Not available"
                    }
                  />

                  <InfoItem
                    label="Phone Number"
                    value={
                      profile?.phone ||
                      "Not provided"
                    }
                  />

                  <InfoItem
                    label="Date of Birth"
                    value={formatDate(
                      profile?.date_of_birth
                    )}
                  />

                  <InfoItem
                    label="Gender"
                    value={
                      profile?.gender
                        ? profile.gender.replaceAll(
                            "_",
                            " "
                          )
                        : "Not provided"
                    }
                    className="profile-capitalize"
                  />

                  <div className="profile-information-item">
                    <span>Account Status</span>

                    <strong
                      className={
                        "profile-status " +
                        (profile?.is_active
                          ? "profile-status--active"
                          : "profile-status--inactive")
                      }
                    >
                      {profile?.is_active
                        ? "Active"
                        : "Inactive"}
                    </strong>
                  </div>

                  <InfoItem
                    label="Product Updates"
                    value={
                      profile?.marketing_opt_in
                        ? "Subscribed"
                        : "Not subscribed"
                    }
                    wide
                  />
                </div>
              ) : (
                <form
                  className="profile-form"
                  onSubmit={handleSave}
                >
                  <ProfileField
                    label="Full Name"
                    htmlFor="profile-full-name"
                  >
                    <UserRound size={16} />

                    <input
                      id="profile-full-name"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      autoComplete="name"
                      required
                    />
                  </ProfileField>

                  <ProfileField
                    label="Email Address"
                    htmlFor="profile-email"
                    readOnly
                  >
                    <Mail size={16} />

                    <input
                      id="profile-email"
                      type="email"
                      value={user?.email || ""}
                      readOnly
                    />
                  </ProfileField>

                  <ProfileField
                    label="Phone Number"
                    htmlFor="profile-phone"
                  >
                    <Phone size={16} />

                    <input
                      id="profile-phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      autoComplete="tel"
                    />
                  </ProfileField>

                  <ProfileField
                    label="Date of Birth"
                    htmlFor="profile-date-of-birth"
                  >
                    <CalendarDays size={16} />

                    <input
                      id="profile-date-of-birth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                    />
                  </ProfileField>

                  <ProfileField
                    label="Gender"
                    htmlFor="profile-gender"
                  >
                    <UserRound size={16} />

                    <select
                      id="profile-gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="">
                        Select gender
                      </option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">
                        Prefer not to say
                      </option>
                    </select>
                  </ProfileField>

                  <div className="profile-field profile-field--marketing">
                    <label className="profile-checkbox">
                      <input
                        type="checkbox"
                        name="marketingOptIn"
                        checked={
                          formData.marketingOptIn
                        }
                        onChange={handleChange}
                      />

                      <span className="profile-checkbox__box">
                        <Check size={13} />
                      </span>

                      <span className="profile-checkbox__content">
                        <strong>Product Updates</strong>
                        <small>
                          Receive product announcements,
                          new arrivals and special offers.
                        </small>
                      </span>
                    </label>
                  </div>

                  <div className="profile-form__actions">
                    <button
                      type="button"
                      className="profile-cancel-button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X size={14} />
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="profile-save-button"
                      disabled={saving}
                    >
                      <Save size={14} />

                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </article>

            {/* =================================================
                SAVED ADDRESSES
            ================================================= */}

            <article className="profile-card profile-address-section">
              <div className="profile-card__header profile-address-header">
                <div>
                  <span className="profile-card__label">
                    DELIVERY DETAILS
                  </span>

                  <h2>Saved Addresses</h2>

                  <p className="profile-address-header__description">
                    Manage your delivery addresses
                    for a faster checkout.
                  </p>
                </div>

                <button
                  type="button"
                  className="profile-add-address-button"
                  onClick={handleAddAddress}
                >
                  <Plus size={15} />
                  Add Address
                </button>
              </div>

              {addressSuccess && (
                <div
                  className="profile-address-message profile-address-message--success"
                  role="status"
                >
                  <Check size={14} />
                  {addressSuccess}
                </div>
              )}

              {addressError && !addressFormOpen && (
                <div
                  className="profile-address-message profile-address-message--error"
                  role="alert"
                >
                  {addressError}
                </div>
              )}

              {addressesLoading ? (
                <div className="profile-address-loading">
                  <div className="profile-address-loading__spinner" />
                  Loading saved addresses...
                </div>
              ) : addresses.length === 0 ? (
                <div className="profile-address-empty">
                  <div className="profile-address-empty__icon">
                    <MapPin size={23} />
                  </div>

                  <h3>No Saved Addresses</h3>

                  <p>
                    Add a delivery address to make
                    checkout quicker.
                  </p>

                  <button
                    type="button"
                    onClick={handleAddAddress}
                  >
                    <Plus size={14} />
                    Add First Address
                  </button>
                </div>
              ) : (
                <div className="profile-address-list">
                  {addresses.map(address => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      busy={
                        addressActionId !== null ||
                        addressSaving
                      }
                      onDefault={handleSetDefault}
                      onEdit={handleEditAddress}
                      onDelete={handleDeleteAddress}
                    />
                  ))}
                </div>
              )}
            </article>

            {/* =================================================
                ACCOUNT INFORMATION
            ================================================= */}

            <article className="profile-card">
              <div className="profile-card__header">
                <div>
                  <span className="profile-card__label">
                    ACCOUNT DETAILS
                  </span>

                  <h2>Account Information</h2>
                </div>
              </div>

              <div className="profile-account-details">
                <div>
                  <span>Customer ID</span>

                  <strong className="profile-account-id">
                    {user?.id}
                  </strong>
                </div>

                <div>
                  <span>Account Type</span>
                  <strong>Customer</strong>
                </div>

                <div>
                  <span>Member Since</span>
                  <strong>{memberSince}</strong>
                </div>

                <div>
                  <span>Default Address</span>

                  <strong>
                    {defaultAddress
                      ? `${defaultAddress.city}, ${defaultAddress.state}`
                      : "Not added"}
                  </strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>

      {/* ======================================================
          ADDRESS MODAL
      ====================================================== */}

      {addressFormOpen && (
        <div className="profile-address-modal">
          <button
            type="button"
            className="profile-address-modal__backdrop"
            aria-label="Close address form"
            onClick={handleCloseAddressForm}
          />

          <div
            className="profile-address-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-modal-title"
          >
            <div className="profile-address-modal__header">
              <div>
                <span>DELIVERY ADDRESS</span>

                <h2 id="address-modal-title">
                  {editingAddressId !== null
                    ? "Edit Address"
                    : "Add New Address"}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCloseAddressForm}
                disabled={addressSaving}
                aria-label="Close address form"
              >
                <X size={18} />
              </button>
            </div>

            {addressError && (
              <div
                className="profile-address-message profile-address-message--error"
                role="alert"
              >
                {addressError}
              </div>
            )}

            <form
              className="profile-address-form"
              onSubmit={handleAddressSave}
            >
              <div className="profile-address-form__grid">
                <AddressField
                  label="Address Label"
                  htmlFor="address-label"
                >
                  <input
                    id="address-label"
                    name="label"
                    type="text"
                    value={addressForm.label}
                    onChange={handleAddressChange}
                    placeholder="Home, Office, Hostel..."
                  />
                </AddressField>

                <AddressField
                  label="Recipient Name"
                  htmlFor="address-recipient"
                >
                  <input
                    id="address-recipient"
                    name="recipientName"
                    type="text"
                    value={
                      addressForm.recipientName
                    }
                    onChange={handleAddressChange}
                    placeholder="Recipient name"
                    autoComplete="name"
                    required
                  />
                </AddressField>

                <AddressField
                  label="Phone Number"
                  htmlFor="address-phone"
                >
                  <input
                    id="address-phone"
                    name="phone"
                    type="tel"
                    value={addressForm.phone}
                    onChange={handleAddressChange}
                    placeholder="Phone number"
                    autoComplete="tel"
                    required
                  />
                </AddressField>

                <AddressField
                  label="Address Line 1"
                  htmlFor="address-line1"
                  full
                >
                  <input
                    id="address-line1"
                    name="addressLine1"
                    type="text"
                    value={
                      addressForm.addressLine1
                    }
                    onChange={handleAddressChange}
                    placeholder="House, flat, building or street"
                    autoComplete="address-line1"
                    required
                  />
                </AddressField>

                <AddressField
                  label="Address Line 2"
                  htmlFor="address-line2"
                  full
                >
                  <input
                    id="address-line2"
                    name="addressLine2"
                    type="text"
                    value={
                      addressForm.addressLine2
                    }
                    onChange={handleAddressChange}
                    placeholder="Area, locality or landmark"
                    autoComplete="address-line2"
                  />
                </AddressField>

                <AddressField
                  label="City"
                  htmlFor="address-city"
                >
                  <input
                    id="address-city"
                    name="city"
                    type="text"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    placeholder="City"
                    autoComplete="address-level2"
                    required
                  />
                </AddressField>

                <AddressField
                  label="State"
                  htmlFor="address-state"
                >
                  <input
                    id="address-state"
                    name="state"
                    type="text"
                    value={addressForm.state}
                    onChange={handleAddressChange}
                    placeholder="State"
                    autoComplete="address-level1"
                    required
                  />
                </AddressField>

                <AddressField
                  label="PIN Code"
                  htmlFor="address-postal-code"
                >
                  <input
                    id="address-postal-code"
                    name="postalCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={
                      addressForm.postalCode
                    }
                    onChange={handleAddressChange}
                    placeholder="6-digit PIN"
                    autoComplete="postal-code"
                    required
                  />
                </AddressField>

                <AddressField
                  label="Country"
                  htmlFor="address-country"
                >
                  <input
                    id="address-country"
                    name="country"
                    type="text"
                    value={addressForm.country}
                    onChange={handleAddressChange}
                    autoComplete="country-name"
                    required
                  />
                </AddressField>
              </div>

              {addresses.length > 0 && (
                <label className="profile-address-default-checkbox">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={
                      addressForm.isDefault
                    }
                    onChange={handleAddressChange}
                  />

                  <span className="profile-address-default-checkbox__box">
                    <Check size={13} />
                  </span>

                  <span>
                    <strong>
                      Set as Default Address
                    </strong>

                    <small>
                      Use this address by default
                      during checkout.
                    </small>
                  </span>
                </label>
              )}

              <div className="profile-address-form__actions">
                <button
                  type="button"
                  className="profile-address-form__cancel"
                  onClick={handleCloseAddressForm}
                  disabled={addressSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="profile-address-form__save"
                  disabled={addressSaving}
                >
                  <Save size={14} />

                  {addressSaving
                    ? "Saving..."
                    : editingAddressId !== null
                      ? "Update Address"
                      : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Profile;
