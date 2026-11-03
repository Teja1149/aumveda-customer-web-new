
import { useEffect, useState } from "react";

import {
    FaEnvelope,
    FaFacebookF,
    FaInstagram,
    FaYoutube
} from "react-icons/fa";

import {
    ArrowRight,
    Mail
} from "lucide-react";

import { Link } from "react-router-dom";

import {
    getBrandingSettings
} from "../../services/siteSettingsService";

import "../../styles/footer.css";

/* ============================================================
   AUMVEDA CUSTOMER WEB
   COMPACT PREMIUM FOOTER
   STEP 17E.8

   - Modern professional content
   - Compact responsive layout
   - Dynamic branding preserved
   - Existing routes preserved
   - No additional dependencies
============================================================ */

function Footer() {
    const [branding, setBranding] = useState({
        site_name: "AUMVEDA",
        logo_url: "",
        favicon_url: "",
        branding_version: 1
    });

    /* ========================================================
       LOAD BRANDING
    ======================================================== */

    useEffect(() => {
        let isMounted = true;

        async function loadBranding() {
            try {
                const data = await getBrandingSettings();

                if (!isMounted) return;

                setBranding(previous => ({
                    ...previous,
                    ...(data || {})
                }));

            } catch (error) {
                console.error(
                    "Footer branding load failed:",
                    error
                );
            }
        }

        loadBranding();

        return () => {
            isMounted = false;
        };
    }, []);

    const logoUrl = branding?.logo_url
        ? `${branding.logo_url}?v=${branding.branding_version || 1}`
        : "";

    const siteName =
        branding?.site_name || "AUMVEDA";

    return (
        <footer className="footer">

            {/* =================================================
                MAIN FOOTER
            ================================================= */}

            <div className="footer__container">

                {/* BRAND */}

                <div className="footer__brand">

                    <Link
                        to="/"
                        className="footer__logo"
                        aria-label={`${siteName} Home`}
                    >
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={`${siteName} Wellness LLP`}
                            />
                        ) : (
                            <span>{siteName}</span>
                        )}
                    </Link>

                    <div className="footer__brand-copy">

                        <h2 className="footer__tagline">
                            Everyday Essentials,
                            <span> Thoughtfully Selected.</span>
                        </h2>

                        <p className="footer__description">
                            Explore quality products across
                            personal care, nutrition, wellness,
                            and everyday essentials.
                        </p>

                    </div>

                    <Link
                        to="/products"
                        className="footer__shop-button"
                    >
                        Shop Products

                        <ArrowRight
                            size={14}
                            aria-hidden="true"
                        />
                    </Link>

                </div>

                {/* SHOP */}

                <nav
                    className="footer__column"
                    aria-label="Shop"
                >
                    <h3>Shop</h3>

                    <Link to="/">
                        Home
                    </Link>

                    <Link to="/products">
                        All Products
                    </Link>

                    <Link to="/wishlist">
                        Wishlist
                    </Link>

                    <Link to="/cart">
                        Cart
                    </Link>
                </nav>

                {/* COMPANY */}

                <nav
                    className="footer__column"
                    aria-label="Company"
                >
                    <h3>{siteName}</h3>

                    <Link to="/about">
                        About Us
                    </Link>

                    <Link to="/contact">
                        Contact Us
                    </Link>

                    <Link to="/profile">
                        My Account
                    </Link>

                    <Link to="/checkout">
                        Checkout
                    </Link>
                </nav>

                {/* CUSTOMER CARE */}

                <div className="footer__column footer__support">

                    <h3>Customer Care</h3>

                    <p className="footer__support-description">
                        Need assistance with your order or
                        account? We're here to help.
                    </p>

                    <Link
                        to="/contact"
                        className="footer__support-link"
                    >
                        Contact Support

                        <ArrowRight
                            size={13}
                            aria-hidden="true"
                        />
                    </Link>

                    <a
                        href="mailto:support@aumveda.com"
                        className="footer__email-link"
                    >
                        <Mail
                            size={13}
                            aria-hidden="true"
                        />

                        <span>
                            support@aumveda.com
                        </span>
                    </a>

                </div>

                {/* CONNECT */}

                <div className="footer__column footer__connect">

                    <h3>Connect</h3>

                    <p>
                        Stay connected with AUMVEDA for
                        product updates and new arrivals.
                    </p>

                    <div className="footer__icons">

                        {/* Social icons remain placeholders
                            until actual URLs are configured. */}

                        <span
                            className="footer__social-icon"
                            title="Instagram"
                            aria-label="Instagram"
                            role="img"
                        >
                            <FaInstagram />
                        </span>

                        <span
                            className="footer__social-icon"
                            title="Facebook"
                            aria-label="Facebook"
                            role="img"
                        >
                            <FaFacebookF />
                        </span>

                        <span
                            className="footer__social-icon"
                            title="YouTube"
                            aria-label="YouTube"
                            role="img"
                        >
                            <FaYoutube />
                        </span>

                        <a
                            href="mailto:support@aumveda.com"
                            aria-label="Email AUMVEDA"
                            title="Email AUMVEDA"
                        >
                            <FaEnvelope />
                        </a>

                    </div>

                </div>

            </div>

            {/* =================================================
                BOTTOM FOOTER BAR
            ================================================= */}

            <div className="footer__lower">

                <div className="footer__lower-inner">

                    <div className="footer__lower-left">

                        <span className="footer__lower-brand">
                            {siteName} Wellness LLP
                        </span>

                        <span
                            className="footer__lower-dot"
                            aria-hidden="true"
                        />

                        <span>
                            Quality Products. Simple Shopping.
                        </span>

                    </div>

                    <p className="footer__copyright">
                        © {new Date().getFullYear()} {siteName}.
                        All Rights Reserved.
                    </p>

                </div>

            </div>

        </footer>
    );
}

export default Footer;
