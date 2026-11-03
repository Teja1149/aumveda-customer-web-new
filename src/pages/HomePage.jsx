
import {
  useEffect,
  useMemo,
  useState,
} from "react";

/* ============================================================
   AUMVEDA — HOMEPAGE COMPONENTS
============================================================ */

import HeroSection from "../components/home/HeroSection";
import ExploreWellness from "../components/home/ExploreWellness";
import ShopByNeed from "../components/home/ShopByNeed";
import BestDealsSection from "../components/home/BestDealsSection";

import AvailableCoupons from "../components/home/AvailableCoupons";
import ContinueShopping from "../components/home/ContinueShopping";

import MainPromoHero from "../components/home/MainPromoHero";
import FeaturedProducts from "../components/home/FeaturedProducts";
import CategoryCampaigns from "../components/home/CategoryCampaigns";
import CategoryProductShowcase from "../components/home/CategoryProductShowcase";
import TrustBenefits from "../components/home/TrustBenefits";
import MoreDiscovery from "../components/home/MoreDiscovery";

/* ============================================================
   SERVICES
============================================================ */

import {
  getHomeConfiguration,
} from "../services/homeService";

/* ============================================================
   HOMEPAGE STYLES
============================================================ */

import "../styles/home-cms.css";

/* ============================================================
   AUMVEDA — CUSTOMER WEB HOMEPAGE

   SECTION ORDER

   01 — Hero Banner
   02 — Explore Categories
   03 — Shop by Need
   04 — Best Deals
   05 — Available Coupons
   06 — Continue Your Wellness Journey (NEW)
   07 — Daily Wellness Essentials
   08 — Featured Products
   09 — Category Campaigns
   10 — Category Product Showcase
   11 — Trust & Benefits
   12 — More Discovery

   Navbar and Footer remain in MainLayout.
   Existing CMS controls preserved.
   No Dosha section.
============================================================ */

function getSections(response) {
  const candidates = [
    response?.data?.sections,
    response?.data?.data?.sections,
    response?.sections,
  ];

  return candidates.find(Array.isArray) || [];
}

function findSection(sections, ...keys) {
  return (
    sections.find((section) => {
      const key =
        section?.section_key ||
        section?.key ||
        section?.slug ||
        "";

      return keys.includes(key);
    }) || null
  );
}

function isVisible(section) {
  return (
    section?.is_visible !== false &&
    section?.is_enabled !== false
  );
}

/* ============================================================
   MAIN HOMEPAGE
============================================================ */

export default function HomePage() {
  const [configuration, setConfiguration] =
    useState(null);

  const [configurationError, setConfigurationError] =
    useState(false);

  /* ==========================================================
     LOAD HOMEPAGE CMS
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadConfiguration() {
      try {
        const response = await getHomeConfiguration();

        if (!mounted) return;

        setConfiguration(response);
        setConfigurationError(false);
      } catch (error) {
        console.error(
          "AUMVEDA homepage configuration failed:",
          error
        );

        if (mounted) {
          setConfigurationError(true);
        }
      }
    }

    loadConfiguration();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     CMS SECTIONS
  ========================================================== */

  const sections = useMemo(
    () => getSections(configuration),
    [configuration]
  );

  const hero = findSection(
    sections,
    "hero_banner",
    "hero"
  );

  const explore = findSection(
    sections,
    "explore_categories",
    "explore_wellness"
  );

  const shopByNeed = findSection(
    sections,
    "shop_by_need"
  );

  const bestDeals = findSection(
    sections,
    "best_deals"
  );

  const couponsSection = findSection(
    sections,
    "available_coupons",
    "coupons"
  );

  const continueShoppingSection = findSection(
    sections,
    "continue_shopping",
    "continue_wellness_journey",
    "personalized_shopping"
  );

  const mainPromo = findSection(
    sections,
    "main_promo",
    "main_promo_hero"
  );

  const featured = findSection(
    sections,
    "featured_products"
  );

  const campaigns = findSection(
    sections,
    "category_campaigns",
    "campaigns"
  );

  const categoryShowcase = findSection(
    sections,
    "category_product_showcase",
    "product_category"
  );

  const trust = findSection(
    sections,
    "trust_benefits"
  );

  const discovery = findSection(
    sections,
    "more_discovery"
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="aumveda-home-page">
      <div className="aumveda-home-page__container">

        {/* 01 — HERO BANNER */}

        {isVisible(hero) && (
          <div className="rv-slot-hero_banner">
            <HeroSection
              banners={
                Array.isArray(hero?.items) &&
                hero.items.length > 0
                  ? hero.items
                  : undefined
              }
            />
          </div>
        )}

        {/* 02 — EXPLORE CATEGORIES */}

        {isVisible(explore) && (
          <div className="rv-slot-explore_categories">
            <ExploreWellness />
          </div>
        )}

        {/* 03 — SHOP BY NEED */}

        {isVisible(shopByNeed) && (
          <div className="rv-slot-shop_by_need">
            <ShopByNeed section={shopByNeed} />
          </div>
        )}

        {/* 04 — BEST DEALS */}

        {isVisible(bestDeals) && (
          <div className="rv-slot-best_deals">
            <BestDealsSection section={bestDeals} />
          </div>
        )}

        {/* 05 — AVAILABLE COUPONS */}

        {isVisible(couponsSection) && (
          <div className="rv-slot-available_coupons">
            <AvailableCoupons />
          </div>
        )}

        {/* 06 — CONTINUE YOUR WELLNESS JOURNEY */}

        {isVisible(continueShoppingSection) && (
          <div className="rv-slot-continue_shopping">
            <ContinueShopping />
          </div>
        )}

        {/* 07 — DAILY WELLNESS ESSENTIALS */}

        {isVisible(mainPromo) && (
          <div className="rv-slot-main_promo">
            <MainPromoHero />
          </div>
        )}

        {/* 08 — FEATURED PRODUCTS */}

        {isVisible(featured) && (
          <div className="rv-slot-featured_products">
            <FeaturedProducts
              section={featured}
            />
          </div>
        )}

        {/* 09 — CATEGORY CAMPAIGNS */}

        {isVisible(campaigns) && (
          <div className="rv-slot-category_campaigns">
            <CategoryCampaigns
              section={campaigns}
            />
          </div>
        )}

        {/* 10 — CATEGORY PRODUCT SHOWCASE */}

        {isVisible(categoryShowcase) && (
          <div className="rv-slot-category_product_showcase">
            <CategoryProductShowcase
              section={categoryShowcase}
            />
          </div>
        )}

        {/* 11 — TRUST & BENEFITS */}

        {isVisible(trust) && (
          <div className="rv-slot-trust_benefits">
            <TrustBenefits />
          </div>
        )}

        {/* 12 — MORE DISCOVERY */}

        {isVisible(discovery) && (
          <div className="rv-slot-more_discovery">
            <MoreDiscovery />
          </div>
        )}

      </div>

      {configurationError && null}
    </div>
  );
}
