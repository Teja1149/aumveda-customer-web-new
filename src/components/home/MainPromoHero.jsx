
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import "../../styles/main-promo-hero.css";

/* ============================================================
   AUMVEDA — DAILY WELLNESS ESSENTIALS

   - Premium compact promotional banner
   - Supabase Storage photography
   - Text and CTA on the left
   - Product photography on the right
   - Responsive desktop and mobile
   - Graceful image failure fallback
   - No additional backend requests
============================================================ */

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ihjbssbqwknyyzoewrik.supabase.co"
).replace(/\/+$/, "");

const STORAGE_BUCKET = "site_assets";
const STORAGE_FOLDER = "main-promo-banner";
const BANNER_FILENAME = "daily-wellness-essentials.webp";

const BANNER_URL =
  `${SUPABASE_URL}/storage/v1/object/public/` +
  `${encodeURIComponent(STORAGE_BUCKET)}/` +
  `${encodeURIComponent(STORAGE_FOLDER)}/` +
  encodeURIComponent(BANNER_FILENAME);

export default function MainPromoHero() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      className="main-promo-hero"
      aria-labelledby="daily-wellness-title"
    >
      <div className="main-promo-hero__container">
        <div className="main-promo-hero__banner">

          {/* SUPABASE PROMOTIONAL IMAGE */}

          {!imageFailed && (
            <img
              className="main-promo-hero__image"
              src={BANNER_URL}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => {
                setImageFailed(true);
                console.error(
                  "Daily Wellness banner failed:",
                  BANNER_URL
                );
              }}
            />
          )}

          {/* READABILITY GRADIENT */}

          <div
            className="main-promo-hero__overlay"
            aria-hidden="true"
          />

          {/* PROMOTIONAL TEXT */}

          <div className="main-promo-hero__copy">

            <span className="main-promo-hero__eyebrow">
              <Sparkles
                size={13}
                aria-hidden="true"
              />
              THE AUMVEDA COLLECTION
            </span>

            <h2 id="daily-wellness-title">
              Daily Wellness
              <span>Essentials</span>
            </h2>

            <p className="main-promo-hero__subtitle">
              Natural solutions for a better tomorrow.
            </p>

            <Link
              to="/products"
              className="main-promo-hero__shop"
            >
              Shop Now
              <ArrowRight
                size={16}
                aria-hidden="true"
              />
            </Link>

            <div className="main-promo-hero__benefits">
              <span>
                <Leaf
                  size={14}
                  aria-hidden="true"
                />
                Natural Ingredients
              </span>

              <span>
                <ShieldCheck
                  size={14}
                  aria-hidden="true"
                />
                Quality Assured
              </span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
