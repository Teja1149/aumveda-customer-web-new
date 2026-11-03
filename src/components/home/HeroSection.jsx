
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "../../styles/hero.css";

/* ============================================================
   AUMVEDA — HERO BANNER
   PREMIUM REFINED VERSION

   SUPABASE:
   Bucket: site_assets
   Folder: products-banner

   FUNCTIONALITY:
   - Six product banners
   - Smooth fade carousel
   - Automatic rotation every 4 seconds
   - Previous and Next arrows
   - Pagination dots
   - Pause on hover or keyboard focus
   - Touch swipe on mobile
   - Keyboard navigation
   - Reduced-motion accessibility

   DESIGN:
   - 4.4:1 ultrawide viewport
   - Complete artwork remains visible
   - Soft image-derived background for ratio differences
   - No duplicate promotional text
   - Distinct card separated from Navbar
============================================================ */

const ROTATION_INTERVAL = 4000;

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ihjbssbqwknyyzoewrik.supabase.co"
).replace(/\/+$/, "");

const STORAGE_BUCKET = "site_assets";
const STORAGE_FOLDER = "products-banner";

function storageUrl(filename) {
  if (!filename || !SUPABASE_URL) return "";

  const path = [
    STORAGE_BUCKET,
    STORAGE_FOLDER,
    filename,
  ]
    .map(encodeURIComponent)
    .join("/");

  return (
    `${SUPABASE_URL}/storage/v1/object/public/${path}`
  );
}

/*
  Verify the full filenames in Supabase.
  The screenshot previously provided truncated
  several filenames.
*/

const HERO_BANNERS = [
  {
    id: "ancient",
    title: "Ancient Wisdom for Modern Wellness",
    filename: "ancient-products-banner.webp",
    destination: "/products",
    theme: "green",
  },
  {
    id: "goodness",
    title: "Discover Natural Goodness",
    filename: "goodness-products-banner.webp",
    destination: "/products",
    theme: "gold",
  },
  {
    id: "nature",
    title: "Inspired by Nature",
    filename: "nature-products-banner.webp",
    destination: "/products",
    theme: "green",
  },
  {
    id: "natures",
    title: "Nature's Wellness Collection",
    filename: "natures-products-banner.webp",
    destination: "/products",
    theme: "rose",
  },
  {
    id: "skin",
    title: "Discover Skin Care",
    filename: "skin-products-banner.webp",
    destination: "/products?search=skin",
    theme: "rose",
  },
];

const SLIDES = HERO_BANNERS.map((banner) => ({
  ...banner,
  imageUrl: storageUrl(banner.filename),
}));

export default function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  const touchStartRef = useRef(null);

  const slideCount = SLIDES.length;

  /* REDUCED MOTION */

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia
    ) {
      return undefined;
    }

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updateMotion = () => {
      setReducedMotion(media.matches);
    };

    updateMotion();

    media.addEventListener?.(
      "change",
      updateMotion
    );

    return () => {
      media.removeEventListener?.(
        "change",
        updateMotion
      );
    };
  }, []);

  /* CAROUSEL NAVIGATION */

  const nextSlide = useCallback(() => {
    setActiveIndex(
      (current) => (current + 1) % slideCount
    );
  }, [slideCount]);

  const previousSlide = useCallback(() => {
    setActiveIndex(
      (current) =>
        (current - 1 + slideCount) % slideCount
    );
  }, [slideCount]);

  const goToSlide = useCallback(
    (index) => {
      if (index < 0 || index >= slideCount) return;
      setActiveIndex(index);
    },
    [slideCount]
  );

  /* AUTOPLAY */

  useEffect(() => {
    if (
      slideCount <= 1 ||
      isHovered ||
      isFocused ||
      reducedMotion
    ) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        nextSlide();
      }
    }, ROTATION_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    slideCount,
    isHovered,
    isFocused,
    reducedMotion,
    nextSlide,
  ]);

  /* TOUCH SWIPE */

  function handleTouchStart(event) {
    touchStartRef.current =
      event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    const startX = touchStartRef.current;
    const endX = event.changedTouches[0]?.clientX;

    touchStartRef.current = null;

    if (
      typeof startX !== "number" ||
      typeof endX !== "number"
    ) {
      return;
    }

    const difference = endX - startX;

    if (Math.abs(difference) < 45) return;

    if (difference < 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  }

  /* KEYBOARD */

  function handleKeyDown(event) {
    if (event.target !== event.currentTarget) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousSlide();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextSlide();
    }
  }

  /* IMAGE ERRORS */

  function markImageFailed(filename) {
    setFailedImages((previous) => {
      if (previous[filename]) return previous;

      console.warn(
        "AUMVEDA Hero image unavailable:",
        filename
      );

      return {
        ...previous,
        [filename]: true,
      };
    });
  }

  return (
    <section
      className="aum-hero"
      aria-label="AUMVEDA promotional banners"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          setIsFocused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
      }}
    >
      <div className="aum-hero__frame">
        <div className="aum-hero__viewport">
          {SLIDES.map((slide, index) => {
            const isActive = activeIndex === index;
            const imageFailed = Boolean(
              failedImages[slide.filename]
            );

            return (
              <article
                key={slide.id}
                className={[
                  "aum-hero__slide",
                  `aum-hero__slide--${slide.theme}`,
                  isActive
                    ? "aum-hero__slide--active"
                    : "",
                ].join(" ")}
                aria-hidden={!isActive}
                inert={!isActive}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slideCount}`}
              >
                <Link
                  to={slide.destination}
                  className="aum-hero__image-link"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={slide.title}
                >
                  {!imageFailed ? (
                    <>
                      {/* Backdrop fills unused sides
                          when source ratios differ. */}

                      <div
                        className="aum-hero__backdrop"
                        aria-hidden="true"
                      >
                        <img
                          src={slide.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </div>

                      {/* Primary image remains uncropped. */}

                      <picture className="aum-hero__picture">
                        <img
                          src={slide.imageUrl}
                          alt={slide.title}
                          loading={
                            index === 0
                              ? "eager"
                              : "lazy"
                          }
                          fetchPriority={
                            index === 0
                              ? "high"
                              : "auto"
                          }
                          decoding="async"
                          draggable={false}
                          onError={() =>
                            markImageFailed(
                              slide.filename
                            )
                          }
                        />
                      </picture>
                    </>
                  ) : (
                    <div className="aum-hero__fallback">
                      <span>{slide.title}</span>
                    </div>
                  )}
                </Link>
              </article>
            );
          })}

          {slideCount > 1 && (
            <>
              <button
                type="button"
                className="aum-hero__arrow aum-hero__arrow--left"
                aria-label="Previous banner"
                onClick={previousSlide}
              >
                <ChevronLeft
                  size={18}
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                className="aum-hero__arrow aum-hero__arrow--right"
                aria-label="Next banner"
                onClick={nextSlide}
              >
                <ChevronRight
                  size={18}
                  aria-hidden="true"
                />
              </button>
            </>
          )}

          {slideCount > 1 && (
            <div
              className="aum-hero__dots"
              aria-label="Banner navigation"
            >
              {SLIDES.map((slide, index) => (
                <button
                  type="button"
                  key={slide.id}
                  className={
                    "aum-hero__dot " +
                    (index === activeIndex
                      ? "aum-hero__dot--active"
                      : "")
                  }
                  aria-label={`Show banner ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
