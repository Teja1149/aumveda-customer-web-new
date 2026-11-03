
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
} from "lucide-react";

import { getHomeCategories } from "../../services/homeService";

import "../../styles/shop-by-need.css";

/* ============================================================
   AUMVEDA — SHOP BY NEED

   SUPABASE STORAGE INTEGRATION

   Bucket: site_assets
   Folder: shop-by-need

   Features:
   - Four photographic category cards
   - Images loaded from Supabase Storage
   - Exact stored filenames
   - Existing category navigation
   - Existing CMS text and target support
   - Local image fallbacks
   - Mobile horizontal swipe
   - Reference-aligned section layout

   No backend modifications required.
============================================================ */

/* ============================================================
   01 — SUPABASE CONFIGURATION
============================================================ */

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ihjbssbqwknyyzoewrik.supabase.co"
).replace(/\/+$/, "");

const STORAGE_BUCKET = "site_assets";
const STORAGE_FOLDER = "shop-by-need";

/* ============================================================
   02 — GENERATE PUBLIC STORAGE IMAGE URL

   Spaces and special characters are encoded automatically.

   Example:
   Skin care.webp => Skin%20care.webp
============================================================ */

function getStorageImage(filename) {
  if (!SUPABASE_URL || !filename) {
    return "";
  }

  const bucket = encodeURIComponent(STORAGE_BUCKET);

  const folder = encodeURIComponent(STORAGE_FOLDER);

  const file = encodeURIComponent(filename);

  return (
    `${SUPABASE_URL}/storage/v1/object/public/` +
    `${bucket}/${folder}/${file}`
  );
}

/* ============================================================
   03 — DEFAULT SHOP BY NEED CATEGORIES

   These filenames match the supplied Supabase screenshot.
============================================================ */

const DEFAULT_NEEDS = [
  {
    key: "hair",

    title: "Hair & Scalp Care",

    subtitle: "Healthy hair, naturally",

    image: getStorageImage(
      "Hair-scalp-care.webp"
    ),

    fallbackImage: "/shop-by-need/hair-care.webp",

    background: "#E9D8BE",

    search: "hair",

    keywords: [
      "hair",
      "scalp",
      "bhringraj",
    ],
  },

  {
    key: "skin",

    title: "Skin Care",

    subtitle: "Natural glow everyday",

    image: getStorageImage(
      "Skin care.webp"
    ),

    fallbackImage: "/shop-by-need/skin-care.webp",

    background: "#EEDBC7",

    search: "skin",

    keywords: [
      "skin",
      "face",
      "beauty",
    ],
  },

  {
    key: "nutrition",

    title: "Daily Nutrition",

    subtitle: "Fuel your wellness",

    image: getStorageImage(
      "Daily nutrition.webp"
    ),

    fallbackImage: "/shop-by-need/daily-nutrition.webp",

    background: "#DDC390",

    search: "nutrition",

    keywords: [
      "nutrition",
      "immunity",
      "supplement",
    ],
  },

  {
    key: "personal",

    title: "Personal Care",

    subtitle: "Gentle care, pure ingredients",

    image: getStorageImage(
      "personal care.webp"
    ),

    fallbackImage: "/shop-by-need/personal-care.webp",

    background: "#E4D1B6",

    search: "personal care",

    keywords: [
      "personal",
      "body",
      "soap",
      "bath",
    ],
  },
];

/* ============================================================
   04 — CATEGORY RESPONSE HELPER
============================================================ */

function extractCategories(response) {
  if (Array.isArray(response)) {
    return response;
  }

  const candidates = [
    response?.data?.categories,
    response?.data?.data?.categories,
    response?.data?.data,
    response?.data,
    response?.categories,
  ];

  return candidates.find(Array.isArray) || [];
}

/* ============================================================
   05 — MATCH REAL BACKEND CATEGORIES
============================================================ */

function findCategory(need, categories) {
  return (
    categories.find((category) => {
      const value = [
        category.name,
        category.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return need.keywords.some((keyword) =>
        value.includes(keyword)
      );
    }) || null
  );
}

/* ============================================================
   06 — SAFE INTERNAL LINKS
============================================================ */

function safeDestination(value) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return null;
}

/* ============================================================
   07 — RESOLVE CATEGORY DESTINATION

   Priority:
   1. CMS category target
   2. CMS explicit URL
   3. Matching real category
   4. Product search fallback
============================================================ */

function resolveDestination(need, categories) {
  const item = need.cmsItem;

  const explicitUrl = safeDestination(
    item?.primary_cta_url ||
    item?.target_url
  );

  if (
    item?.target_type === "category" &&
    item?.target_id
  ) {
    const category = categories.find(
      (entry) =>
        String(entry.id) ===
        String(item.target_id)
    );

    if (category) {
      return (
        "/products?category=" +
        encodeURIComponent(
          category.slug || category.id
        )
      );
    }
  }

  if (explicitUrl) {
    return explicitUrl;
  }

  if (need.category) {
    return (
      "/products?category=" +
      encodeURIComponent(
        need.category.slug ||
        need.category.id
      )
    );
  }

  return (
    "/products?search=" +
    encodeURIComponent(need.search)
  );
}

/* ============================================================
   08 — IMAGE COMPONENT

   Image source priority:
   1. Supabase Storage image
   2. CMS image
   3. Existing local image
   4. Category image

   On image failure, attempts next source.

   No infinite retry loop.
============================================================ */

function NeedImage({ sources }) {
  const [failedSources, setFailedSources] =
    useState([]);

  const activeSource = sources.find(
    (source) =>
      !failedSources.includes(source)
  );

  if (!activeSource) {
    return (
      <span
        className="shop-need-card__fallback"
        aria-hidden="true"
      >
        <Leaf
          size={36}
          strokeWidth={1.2}
        />
      </span>
    );
  }

  return (
    <img
      src={activeSource}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailedSources((previous) =>
          previous.includes(activeSource)
            ? previous
            : [
                ...previous,
                activeSource,
              ]
        );
      }}
    />
  );
}

/* ============================================================
   09 — MAIN COMPONENT
============================================================ */

export default function ShopByNeed({
  section,
  categories: suppliedCategories,
}) {
  const [
    fetchedCategories,
    setFetchedCategories,
  ] = useState([]);

  /* ==========================================================
     10 — LOAD EXISTING CATEGORY DATA
  ========================================================== */

  useEffect(() => {
    if (Array.isArray(suppliedCategories)) {
      return undefined;
    }

    let mounted = true;

    async function loadCategories() {
      try {
        const response =
          await getHomeCategories();

        if (!mounted) return;

        setFetchedCategories(
          extractCategories(response)
        );
      } catch (error) {
        console.error(
          "Shop by Need categories failed:",
          error
        );
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [suppliedCategories]);

  /* ==========================================================
     11 — CURRENT CATEGORIES
  ========================================================== */

  const categories = Array.isArray(
    suppliedCategories
  )
    ? suppliedCategories
    : fetchedCategories;

  /* ==========================================================
     12 — PREPARE FOUR SHOPPING CARDS

     Supabase Storage artwork is always preferred.

     CMS can still override:
     - Title
     - Subtitle
     - Navigation destination
  ========================================================== */

  const needs = useMemo(() => {
    const cmsItems = Array.isArray(section?.items)
      ? [...section.items]
          .filter(
            (item) =>
              item?.is_visible !== false
          )
          .sort(
            (a, b) =>
              Number(a.sort_order || 0) -
              Number(b.sort_order || 0)
          )
      : [];

    return DEFAULT_NEEDS.map(
      (need, index) => {
        const cmsItem =
          cmsItems[index] || null;

        const category = findCategory(
          need,
          categories
        );

        const sources = [
          need.image,
          cmsItem?.image_url,
          need.fallbackImage,
          category?.image_url,
        ].filter(
          (source, sourceIndex, array) =>
            typeof source === "string" &&
            source.trim().length > 0 &&
            array.indexOf(source) ===
              sourceIndex
        );

        return {
          ...need,

          cmsItem,
          category,
          sources,

          title:
            cmsItem?.title ||
            need.title,

          subtitle:
            cmsItem?.subtitle ||
            cmsItem?.description ||
            need.subtitle,
        };
      }
    );
  }, [categories, section?.items]);

  /* ==========================================================
     13 — RENDER SECTION
  ========================================================== */

  return (
    <section
      className="shop-by-need"
      aria-labelledby="shop-by-need-heading"
    >
      <div className="shop-by-need__container">

        {/* ================================================
            SECTION HEADER
        ================================================ */}

        <div className="shop-by-need__header">
          <div>
            <span className="shop-by-need__eyebrow">
              SHOP BY NEED
            </span>

            <h2 id="shop-by-need-heading">
              {section?.title ||
                "Wellness for Every Part of You"}
            </h2>
          </div>

          <Link
            to="/products"
            className="shop-by-need__view-all"
          >
            View All

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* ================================================
            FOUR CATEGORY CARDS
        ================================================ */}

        <div className="shop-by-need__scroll-area">
          <div className="shop-by-need__grid">
            {needs.map((need) => (
              <Link
                key={need.key}
                to={resolveDestination(
                  need,
                  categories
                )}
                className={
                  `shop-need-card ` +
                  `shop-need-card--${need.key}`
                }
                style={{
                  "--shop-card-bg":
                    need.background,
                }}
                aria-label={`Explore ${need.title}`}
              >
                {/* SUPABASE IMAGE */}

                <div className="shop-need-card__image">
                  <NeedImage
                    key={need.key}
                    sources={need.sources}
                  />
                </div>

                {/* CARD CAPTION */}

                <div className="shop-need-card__content">
                  <div className="shop-need-card__text">
                    <h3>
                      {need.title}
                    </h3>

                    <p>
                      {need.subtitle}
                    </p>
                  </div>

                  <span
                    className="shop-need-card__arrow"
                    aria-hidden="true"
                  >
                    <ArrowUpRight
                      size={16}
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
