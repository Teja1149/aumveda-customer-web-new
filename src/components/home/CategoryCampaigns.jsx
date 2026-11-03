
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import "../../styles/category-campaigns.css";

/* ============================================================
   AUMVEDA — CATEGORY CAMPAIGNS

   Storage:
   Bucket: site_assets
   Folder: category-campaigns

   - Three promotional cards
   - Supabase images take priority
   - CMS titles, subtitles and routes preserved
   - Local image fallbacks
   - Mobile horizontal swiping
============================================================ */

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ihjbssbqwknyyzoewrik.supabase.co"
).replace(/\/+$/, "");

const STORAGE_BUCKET = "site_assets";
const STORAGE_FOLDER = "category-campaigns";

function getStorageImage(filename) {
  if (!SUPABASE_URL || !filename) return "";

  return (
    `${SUPABASE_URL}/storage/v1/object/public/` +
    `${encodeURIComponent(STORAGE_BUCKET)}/` +
    `${encodeURIComponent(STORAGE_FOLDER)}/` +
    `${encodeURIComponent(filename)}`
  );
}

const DEFAULT_CAMPAIGNS = [
  {
    id: "hair",
    title: "Hair Care Rituals",
    subtitle: "For Stronger, Healthier Hair",
    image: getStorageImage("hair-care-rituals.webp"),
    fallbackImage: "/shop-by-need/hair-care.webp",
    background: "#3b5c40",
    color: "#ffffff",
    destination: "/products?search=hair",
    theme: "dark",
  },
  {
    id: "skin",
    title: "Skin Care Naturals",
    subtitle: "Pure Ingredients, Real Results",
    image: getStorageImage("Skin-care-naturals.webp"),
    fallbackImage: "/shop-by-need/skin-care.webp",
    background: "#ead7bd",
    color: "#3e2b20",
    destination: "/products?search=skin",
    theme: "light",
  },
  {
    id: "nutrition",
    title: "Nutrition Picks",
    subtitle: "Everyday Wellness Support",
    image: getStorageImage("nature-picks.webp"),
    fallbackImage: "/shop-by-need/nature-picks.webp",
    background: "#486449",
    color: "#ffffff",
    destination: "/products?search=nutrition",
    theme: "dark",
  },
];

function safeInternalRoute(value, fallback) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return fallback;
}

/* ============================================================
   IMAGE WITH FALLBACK

   Tries:
   1. Supabase image
   2. CMS image
   3. Local fallback

   Each failed source is skipped once.
============================================================ */

function CampaignImage({ sources }) {
  const [failedSources, setFailedSources] = useState([]);

  const activeSource = sources.find(
    (source) => !failedSources.includes(source)
  );

  if (!activeSource) return null;

  return (
    <img
      className="category-campaign__image"
      src={activeSource}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailedSources((previous) =>
          previous.includes(activeSource)
            ? previous
            : [...previous, activeSource]
        );
      }}
    />
  );
}

export default function CategoryCampaigns({ section }) {
  const campaigns = useMemo(() => {
    const cmsItems = Array.isArray(section?.items)
      ? [...section.items]
          .filter((item) => item?.is_visible !== false)
          .sort(
            (a, b) =>
              Number(a.sort_order || 0) -
              Number(b.sort_order || 0)
          )
      : [];

    return DEFAULT_CAMPAIGNS.map((campaign, index) => {
      const item = cmsItems[index] || null;

      const sources = [
        campaign.image,
        item?.image_url,
        campaign.fallbackImage,
      ].filter(
        (source, sourceIndex, array) =>
          typeof source === "string" &&
          source.trim().length > 0 &&
          array.indexOf(source) === sourceIndex
      );

      return {
        ...campaign,
        title: item?.title || campaign.title,
        subtitle:
          item?.subtitle ||
          item?.description ||
          campaign.subtitle,
        sources,
        destination: safeInternalRoute(
          item?.primary_cta_url || item?.target_url,
          campaign.destination
        ),
      };
    });
  }, [section?.items]);

  return (
    <section
      className="category-campaigns"
      aria-label="Explore AUMVEDA wellness collections"
    >
      <div className="category-campaigns__container">
        <div className="category-campaigns__grid">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              to={campaign.destination}
              className={
                "category-campaign " +
                `category-campaign--${campaign.id} ` +
                `category-campaign--${campaign.theme}`
              }
              style={{
                "--campaign-bg": campaign.background,
                "--campaign-text": campaign.color,
              }}
              aria-label={`Explore ${campaign.title}`}
            >
              <CampaignImage
                key={campaign.id}
                sources={campaign.sources}
              />

              <span
                className="category-campaign__overlay"
                aria-hidden="true"
              />

              <div className="category-campaign__content">
                <h2 className="category-campaign__title">
                  {campaign.title}
                </h2>

                <p className="category-campaign__subtitle">
                  {campaign.subtitle}
                </p>

                <span className="category-campaign__cta">
                  Shop Now
                  <ArrowUpRight
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
