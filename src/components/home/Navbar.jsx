
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

import { getBrandingSettings } from "../../services/siteSettingsService";

import "../../styles/navbar.css";

/* ============================================================
   AUMVEDA — CUSTOMER WEB NAVBAR

   - Full-width white/ivory navbar
   - CMS-controlled logo
   - Centered product search
   - Home and Products navigation
   - Wishlist and cart counts
   - Authentication-aware profile
   - Account dropdown and logout
   - Responsive mobile navigation

   Existing routes and backend integrations preserved.
============================================================ */

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  /* ==========================================================
     AUTHENTICATION
  ========================================================== */

  const {
    user,
    isAuthenticated,
    loading: authLoading,
    displayName,
    logout,
  } = useAuth();

  /* ==========================================================
     CART
  ========================================================== */

  const cartContext = useCart();

  const totalQuantity = Number(
    cartContext?.totalQuantity ??
      cartContext?.items?.reduce(
        (total, item) =>
          total + Number(item?.quantity || 0),
        0
      ) ??
      0
  );

  /* ==========================================================
     WISHLIST
  ========================================================== */

  const { wishlistCount = 0 } = useWishlist();

  const safeWishlistCount = Number(
    wishlistCount || 0
  );

  /* ==========================================================
     COMPONENT STATE
  ========================================================== */

  const [searchText, setSearchText] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);
  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  const [logoFailed, setLogoFailed] =
    useState(false);

  const [branding, setBranding] = useState({
    site_name: "AUMVEDA",
    logo_url: "",
    favicon_url: "",
    branding_version: 1,
  });

  const profileWrapperRef = useRef(null);

  /* ==========================================================
     FETCH BRANDING FROM EXISTING CMS
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadBranding() {
      try {
        const data = await getBrandingSettings();

        if (mounted && data) {
          setBranding((previous) => ({
            ...previous,
            ...data,
          }));
        }
      } catch (error) {
        console.error(
          "Navbar branding load failed:",
          error
        );
      }
    }

    loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

  const siteName =
    branding?.site_name || "AUMVEDA";

  const logoUrl = branding?.logo_url
    ? (() => {
        const separator =
          branding.logo_url.includes("?")
            ? "&"
            : "?";

        return (
          branding.logo_url +
          separator +
          `v=${branding.branding_version || 1}`
        );
      })()
    : "";

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  /* ==========================================================
     ACTIVE ROUTES
  ========================================================== */

  const activePath = location.pathname;

  const isHomeActive = activePath === "/";

  const isProductsActive =
    activePath === "/products" ||
    activePath.startsWith("/products/");

  const isWishlistActive =
    activePath === "/wishlist";

  const isCartActive =
    activePath === "/cart";

  const isProfileActive =
    activePath === "/profile";

  function navClass(active) {
    return [
      "aumveda-nav-link",
      active
        ? "aumveda-nav-link--active"
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  /* ==========================================================
     CLOSE MENUS
  ========================================================== */

  function closeMenus() {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }

  /* ==========================================================
     SEARCH
  ========================================================== */

  function handleSearch(event) {
    event.preventDefault();

    const query = searchText.trim();

    if (!query) return;

    closeMenus();

    navigate(
      `/products?search=${encodeURIComponent(query)}`
    );
  }

  /* ==========================================================
     WISHLIST
  ========================================================== */

  function handleWishlistClick() {
    closeMenus();
    navigate("/wishlist");
  }

  /* ==========================================================
     CART
  ========================================================== */

  function handleCartClick() {
    if (authLoading) return;

    closeMenus();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate("/cart");
  }

  /* ==========================================================
     PROFILE
  ========================================================== */

  function handleProfileClick() {
    if (authLoading) return;

    closeMenus();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    navigate("/profile");
  }

  /* ==========================================================
     ACCOUNT MENU
  ========================================================== */

  function handleAccountMenuToggle() {
    if (authLoading) return;

    if (!isAuthenticated) {
      setProfileMenuOpen(false);
      navigate("/login");
      return;
    }

    setMobileMenuOpen(false);

    setProfileMenuOpen(
      (previous) => !previous
    );
  }

  /* ==========================================================
     LOGOUT
  ========================================================== */

  async function handleLogout() {
    try {
      await logout();

      closeMenus();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "AUMVEDA logout failed:",
        error
      );
    }
  }

  /* ==========================================================
     CLOSE MENUS ON ROUTE CHANGE
  ========================================================== */

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname, location.hash]);

  /* ==========================================================
     OUTSIDE CLICK / ESCAPE
  ========================================================== */

  useEffect(() => {
    function onOutsideClick(event) {
      if (
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(
          event.target
        )
      ) {
        setProfileMenuOpen(false);
      }
    }

    function onEscape(event) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      onOutsideClick
    );

    document.addEventListener(
      "keydown",
      onEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onOutsideClick
      );

      document.removeEventListener(
        "keydown",
        onEscape
      );
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileMenuOpen(false);
    }
  }, [isAuthenticated]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <header className="aumveda-navbar">
      <div className="aumveda-navbar__inner">

        {/* ================================================
            LEFT — BRAND
        ================================================ */}

        <Link
          to="/"
          className="aumveda-brand"
          aria-label={`${siteName} Home`}
          onClick={closeMenus}
        >
          <div className="aumveda-brand-wrapper">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="aumveda-brand__logo"
                onError={() =>
                  setLogoFailed(true)
                }
              />
            ) : (
              <span className="aumveda-brand__fallback">
                {siteName}
              </span>
            )}
          </div>
        </Link>

        {/* ================================================
            CENTER — SEARCH
        ================================================ */}

        <form
          className="aumveda-search"
          onSubmit={handleSearch}
          role="search"
        >
          <Search
            size={18}
            strokeWidth={1.8}
            className="aumveda-search__icon"
            aria-hidden="true"
          />

          <input
            type="search"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            placeholder="Search products & wellness essentials..."
            aria-label="Search products on AUMVEDA"
          />

          <button
            type="submit"
            className="aumveda-search__button"
          >
            Search
          </button>
        </form>

        {/* ================================================
            RIGHT — NAVIGATION & ACTIONS
        ================================================ */}

        <div className="aumveda-navbar__right">

          <nav
            className="aumveda-nav-links"
            aria-label="Main navigation"
          >
            <Link
              to="/"
              className={navClass(isHomeActive)}
              aria-current={
                isHomeActive ? "page" : undefined
              }
            >
              Home
            </Link>

            <Link
              to="/products"
              className={navClass(isProductsActive)}
              aria-current={
                isProductsActive ? "page" : undefined
              }
            >
              Products
            </Link>
          </nav>

          <div className="aumveda-navbar__actions">

            {/* WISHLIST */}

            <button
              type="button"
              className={
                `aumveda-action ` +
                (isWishlistActive
                  ? "aumveda-action--active"
                  : "")
              }
              onClick={handleWishlistClick}
              aria-label={
                `Wishlist, ${safeWishlistCount} items`
              }
              title="Wishlist"
            >
              <span className="aumveda-action__icon-shell">
                <Heart
                  size={20}
                  strokeWidth={1.8}
                  fill={
                    isWishlistActive
                      ? "currentColor"
                      : "none"
                  }
                />

                {safeWishlistCount > 0 && (
                  <span className="aumveda-action__badge">
                    {safeWishlistCount > 99
                      ? "99+"
                      : safeWishlistCount}
                  </span>
                )}
              </span>

              <span className="aumveda-action__label">
                Wishlist
              </span>
            </button>

            {/* CART */}

            <button
              type="button"
              className={
                `aumveda-action ` +
                (isCartActive
                  ? "aumveda-action--active"
                  : "")
              }
              onClick={handleCartClick}
              disabled={authLoading}
              aria-label={`Cart, ${totalQuantity} items`}
              title="Cart"
            >
              <span className="aumveda-action__icon-shell">
                <ShoppingCart
                  size={20}
                  strokeWidth={1.8}
                />

                {totalQuantity > 0 && (
                  <span className="aumveda-action__badge">
                    {totalQuantity > 99
                      ? "99+"
                      : totalQuantity}
                  </span>
                )}
              </span>

              <span className="aumveda-action__label">
                Cart
              </span>
            </button>

            {/* PROFILE */}

            <div
              className="aumveda-profile-wrapper"
              ref={profileWrapperRef}
            >
              <div className="aumveda-profile-actions">
                <button
                  type="button"
                  className={
                    `aumveda-action ` +
                    (isProfileActive
                      ? "aumveda-action--active"
                      : "")
                  }
                  onClick={handleProfileClick}
                  disabled={authLoading}
                  aria-label={
                    isAuthenticated
                      ? "Open my profile"
                      : "Log in to my account"
                  }
                  title={
                    isAuthenticated
                      ? "My Account"
                      : "Login"
                  }
                >
                  <span className="aumveda-action__icon-shell">
                    <UserRound
                      size={20}
                      strokeWidth={1.8}
                    />
                  </span>

                  <span className="aumveda-action__label">
                    {isAuthenticated
                      ? "Profile"
                      : "Login"}
                  </span>
                </button>

                {isAuthenticated && (
                  <button
                    type="button"
                    className="aumveda-profile-dropdown-toggle"
                    onClick={handleAccountMenuToggle}
                    aria-label="Toggle account menu"
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    aria-controls="aumveda-account-menu"
                    disabled={authLoading}
                  >
                    <ChevronDown
                      size={14}
                      className={
                        profileMenuOpen
                          ? "aumveda-profile-chevron--open"
                          : ""
                      }
                    />
                  </button>
                )}
              </div>

              {/* ACCOUNT DROPDOWN */}

              {isAuthenticated &&
                profileMenuOpen && (
                  <div
                    id="aumveda-account-menu"
                    className="aumveda-profile-menu"
                    role="menu"
                    aria-label="Account menu"
                  >
                    <div className="aumveda-profile-menu__header">
                      <div className="aumveda-profile-menu__avatar">
                        <UserRound size={19} />
                      </div>

                      <div className="aumveda-profile-menu__user">
                        <span className="aumveda-profile-menu__eyebrow">
                          My Account
                        </span>

                        <Link
                          to="/profile"
                          onClick={closeMenus}
                          className="aumveda-profile-menu__name"
                          role="menuitem"
                        >
                          {displayName ||
                            user?.email?.split("@")[0] ||
                            "My Profile"}
                        </Link>

                        <span className="aumveda-profile-menu__email">
                          {user?.email}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={closeMenus}
                      className="aumveda-profile-menu__profile-link"
                      role="menuitem"
                    >
                      <UserRound size={16} />
                      My Profile
                    </Link>

                    <div className="aumveda-profile-menu__divider" />

                    <button
                      type="button"
                      className="aumveda-profile-menu__logout"
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
            </div>

            {/* MOBILE MENU */}

            <button
              type="button"
              className="aumveda-mobile-toggle"
              aria-label={
                mobileMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              onClick={() =>
                setMobileMenuOpen(
                  (previous) => !previous
                )
              }
            >
              {mobileMenuOpen ? (
                <X size={21} />
              ) : (
                <Menu size={21} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================
          MOBILE NAVIGATION PANEL
      ================================================ */}

      {mobileMenuOpen && (
        <nav
          className="aumveda-mobile-nav"
          aria-label="Mobile navigation"
        >
          <Link
            to="/"
            onClick={closeMenus}
          >
            Home
          </Link>

          <Link
            to="/products"
            onClick={closeMenus}
          >
            Products
          </Link>

          <button
            type="button"
            onClick={handleWishlistClick}
          >
            Wishlist
            {safeWishlistCount > 0 && (
              <span>{safeWishlistCount}</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleCartClick}
            disabled={authLoading}
          >
            Cart
            {totalQuantity > 0 && (
              <span>{totalQuantity}</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleProfileClick}
            disabled={authLoading}
          >
            {isAuthenticated
              ? "Profile"
              : "Login / Sign Up"}
          </button>

          {isAuthenticated && (
            <button
              type="button"
              className="aumveda-mobile-nav__logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
