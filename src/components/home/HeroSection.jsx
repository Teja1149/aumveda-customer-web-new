
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { supabase } from "../../services/supabase";

import "../../styles/hero.css";

/* ============================================================
   AUMVEDA — DYNAMIC SUPABASE HERO CAROUSEL

   Project:
   cheuntpecafsdcjumkzs

   Storage bucket:
   site_assets

   Storage folder:
   products-banner

   FEATURES:
   - Automatic banner discovery
   - No hardcoded image filenames
   - Supports additional banner uploads
   - Detects deleted banners
   - Alphabetical ordering
   - Refresh every 60 seconds
   - Refresh on browser focus
   - Four-second autoplay
   - Navigation arrows
   - Pagination dots
   - Mobile swipe
   - Keyboard controls
   - Reduced-motion support
   - Detailed diagnostic logging
============================================================ */

const BUCKET = "site_assets";
const FOLDER = "products-banner";

const AUTOPLAY_MS = 4000;
const REFRESH_MS = 60000;

const PAGE_SIZE = 100;
const MAX_FILES = 500;

const IMAGE_EXTENSIONS = [
  "webp",
  "png",
  "jpg",
  "jpeg",
  "avif",
  "gif",
];

/* ============================================================
   HELPERS
============================================================ */

function isImageFile(filename) {
  if (typeof filename !== "string") {
    return false;
  }

  const extension = filename
    .split(".")
    .pop()
    ?.toLowerCase();

  return IMAGE_EXTENSIONS.includes(extension);
}

function getBannerTitle(filename) {
  return String(filename || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBannerTheme(filename) {
  const name = filename.toLowerCase();

  if (
    name.includes("skin") ||
    name.includes("rose")
  ) {
    return "rose";
  }

  if (
    name.includes("gold") ||
    name.includes("diwali") ||
    name.includes("immunity")
  ) {
    return "gold";
  }

  if (
    name.includes("sleep") ||
    name.includes("lavender")
  ) {
    return "lavender";
  }

  return "green";
}

function getBannerDestination(filename) {
  const name = filename.toLowerCase();

  if (name.includes("skin")) {
    return "/products?search=skin";
  }

  if (name.includes("hair")) {
    return "/products?search=hair";
  }

  if (name.includes("immunity")) {
    return "/products?search=immunity";
  }

  return "/products";
}

/* ============================================================
   LOAD STORAGE BANNERS

   Does not require file.id to exist.
   Excludes folders and unsupported files.
============================================================ */

async function loadStorageBanners() {
  const files = [];

  let offset = 0;

  while (offset < MAX_FILES) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER, {
        limit: PAGE_SIZE,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      throw error;
    }

    const page = Array.isArray(data)
      ? data
      : [];

    console.info(
      "[AUMVEDA HERO] Storage page:",
      {
        offset,
        returned: page.length,
        filenames: page.map((file) => file.name),
      }
    );

    files.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  const imageFiles = files.filter(
    (file) =>
      file &&
      isImageFile(file.name)
  );

  const uniqueFiles = new Map();

  for (const file of imageFiles) {
    uniqueFiles.set(file.name, file);
  }

  const sortedFiles = [...uniqueFiles.values()]
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      )
    );

  const banners = sortedFiles.map((file) => {
    const storagePath =
      `${FOLDER}/${file.name}`;

    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = data?.publicUrl || "";

    const updatedAt =
      file.updated_at ||
      file.created_at ||
      "";

    // Helps a replaced image load without keeping an
    // older browser-cached version of the same filename.
    const version = updatedAt
      ? `?v=${encodeURIComponent(updatedAt)}`
      : "";

    return {
      id: storagePath,
      filename: file.name,
      title:
        getBannerTitle(file.name) ||
        "AUMVEDA Wellness",
      imageUrl: `${publicUrl}${version}`,
      destination:
        getBannerDestination(file.name),
      theme: getBannerTheme(file.name),
      updatedAt,
    };
  });

  const validBanners = banners.filter(
    (banner) => Boolean(banner.imageUrl)
  );

  console.info(
    "[AUMVEDA HERO] Total valid banners:",
    validBanners.length
  );

  return validBanners;
}

/* ============================================================
   HERO COMPONENT
============================================================ */

export default function HeroSection() {
  const [slides, setSlides] = useState([]);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [isHovered, setIsHovered] =
    useState(false);

  const [isFocused, setIsFocused] =
    useState(false);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  const [failedImages, setFailedImages] =
    useState({});

  const touchStartRef = useRef(null);

  const requestIdRef = useRef(0);
  const bannerSignatureRef = useRef("");

  const slideCount = slides.length;

  /* ==========================================================
     REFRESH BANNERS

     Stable callback:
     Does not depend on activeIndex.
  ========================================================== */

  const refreshBanners = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const latest = await loadStorageBanners();

      if (requestId !== requestIdRef.current) {
        return;
      }

      const signature = latest
        .map(
          (slide) =>
            `${slide.id}:${slide.updatedAt}`
        )
        .join("|");

      const collectionChanged =
        signature !== bannerSignatureRef.current;

      if (collectionChanged) {
        bannerSignatureRef.current = signature;

        setSlides(latest);

        setActiveIndex(0);
        setFailedImages({});

        console.info(
          "[AUMVEDA HERO] Banner collection updated:",
          latest.map((banner) => banner.filename)
        );
      }

      if (latest.length === 0) {
        console.warn(
          "[AUMVEDA HERO] Storage returned no image files.",
          "Check folder name and Storage SELECT policies."
        );
      }

      setLoadError("");
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "[AUMVEDA HERO] Unable to list banners:",
        error
      );

      setLoadError(
        error?.message ||
        "Unable to retrieve banners."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /* ==========================================================
     INITIAL FETCH + REFRESH

     Re-registers only when component mounts,
     not when the current slide changes.
  ========================================================== */

  useEffect(() => {
    refreshBanners();

    function handleVisibilityChange() {
      if (!document.hidden) {
        refreshBanners();
      }
    }

    function handleFocus() {
      if (!document.hidden) {
        refreshBanners();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    const refreshInterval = window.setInterval(
      () => {
        if (!document.hidden) {
          refreshBanners();
        }
      },
      REFRESH_MS
    );

    return () => {
      requestIdRef.current += 1;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      window.clearInterval(refreshInterval);
    };
  }, [refreshBanners]);

  /* ==========================================================
     REDUCED MOTION
  ========================================================== */

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

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const nextSlide = useCallback(() => {
    setActiveIndex((current) => {
      if (slideCount <= 1) {
        return 0;
      }

      return (current + 1) % slideCount;
    });
  }, [slideCount]);

  const previousSlide = useCallback(() => {
    setActiveIndex((current) => {
      if (slideCount <= 1) {
        return 0;
      }

      return (
        current - 1 + slideCount
      ) % slideCount;
    });
  }, [slideCount]);

  const goToSlide = useCallback(
    (index) => {
      if (
        index < 0 ||
        index >= slideCount
      ) {
        return;
      }

      setActiveIndex(index);
    },
    [slideCount]
  );

  /* ==========================================================
     AUTOPLAY
  ========================================================== */

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
    }, AUTOPLAY_MS);

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

  /* ==========================================================
     TOUCH SWIPE
  ========================================================== */

  function handleTouchStart(event) {
    touchStartRef.current =
      event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    const startX = touchStartRef.current;
    const endX =
      event.changedTouches[0]?.clientX;

    touchStartRef.current = null;

    if (
      typeof startX !== "number" ||
      typeof endX !== "number"
    ) {
      return;
    }

    const difference = endX - startX;

    if (Math.abs(difference) < 45) {
      return;
    }

    if (difference < 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  }

  /* ==========================================================
     KEYBOARD NAVIGATION
  ========================================================== */

  function handleKeyDown(event) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousSlide();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextSlide();
    }
  }

  /* ==========================================================
     IMAGE ERROR HANDLING
  ========================================================== */

  function markImageFailed(filename) {
    setFailedImages((previous) => {
      if (previous[filename]) {
        return previous;
      }

      console.warn(
        "[AUMVEDA HERO] Image failed:",
        filename
      );

      return {
        ...previous,
        [filename]: true,
      };
    });
  }

  /* ==========================================================
     INITIAL LOADING
  ========================================================== */

  if (loading && slides.length === 0) {
    return (
      <section
        className="aum-hero"
        aria-label="Loading AUMVEDA banners"
        aria-busy="true"
      >
        <div className="aum-hero__frame">
          <div className="aum-hero__viewport">
            <div className="aum-hero__fallback">
              <span>
                Discover Natural Wellness
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ==========================================================
     NO BANNERS OR LISTING ERROR
  ========================================================== */

  if (slides.length === 0) {
    return (
      <section
        className="aum-hero"
        aria-label="AUMVEDA promotional banners"
      >
        <div className="aum-hero__frame">
          <div className="aum-hero__viewport">
            <Link
              to="/products"
              className="aum-hero__image-link"
            >
              <div className="aum-hero__fallback">
                <span>
                  {loadError
                    ? "Explore AUMVEDA Wellness"
                    : "Discover Natural Wellness"}
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* ==========================================================
     DYNAMIC SLIDER
  ========================================================== */

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

          {slides.map((slide, index) => {
            const isActive =
              activeIndex === index;

            const imageFailed =
              Boolean(
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
                aria-label={
                  `${index + 1} of ${slideCount}`
                }
              >
                <Link
                  to={slide.destination}
                  className="aum-hero__image-link"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={slide.title}
                >
                  {!imageFailed ? (
                    <>
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

          {/* PREVIOUS / NEXT */}

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

          {/* DOTS */}

          {slideCount > 1 && (
            <div
              className="aum-hero__dots"
              aria-label="Banner navigation"
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={
                    "aum-hero__dot " +
                    (
                      index === activeIndex
                        ? "aum-hero__dot--active"
                        : ""
                    )
                  }
                  aria-label={
                    `Show banner ${index + 1}`
                  }
                  aria-pressed={
                    index === activeIndex
                  }
                  onClick={() =>
                    goToSlide(index)
                  }
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
