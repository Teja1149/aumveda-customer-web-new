
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Sparkles,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { getHomeCategories } from "../../services/homeService";

import "../../styles/explore-wellness.css";

/* ============================================================
   AUMVEDA — EXPLORE WELLNESS

   Source:
   Existing Customer Backend / Home Categories API

   Preserved:
   - Real category images and names
   - Category navigation
   - Continuous automatic scrolling at 20px/s
   - Infinite looping
   - Manual arrows
   - Mouse dragging and mobile swiping
   - Pause on hover / focus / interaction
   - Reduced-motion support

   Design:
   - Independent warm-ivory section
   - Circular photographic categories
   - Clean centered heading
   - Subtle arrows and edge fades
============================================================ */

const AUTO_SCROLL_SPEED = 20;
const MANUAL_SCROLL_PAUSE = 2200;
const ARROW_SCROLL_DURATION = 500;

function extractCategories(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data?.data?.categories,
    response?.data?.categories,
    response?.data?.data,
    response?.data,
    response?.categories,
  ];

  return candidates.find(Array.isArray) || [];
}

function normalizePosition(position, width) {
  if (width <= 0) return 0;
  return ((position % width) + width) % width;
}

export default function ExploreWellness() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedImages, setFailedImages] = useState({});

  const viewportRef = useRef(null);
  const trackRef = useRef(null);

  const positionRef = useRef(0);
  const loopWidthRef = useRef(0);

  const animationRef = useRef(null);
  const arrowAnimationRef = useRef(null);

  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const interactingRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const pointerRef = useRef(null);
  const suppressClickRef = useRef(false);

  /* ==========================================================
     LOAD CATEGORIES
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        setLoading(true);

        const response = await getHomeCategories();

        if (!mounted) return;

        const unique = new Map();

        for (const category of extractCategories(response)) {
          if (
            !category ||
            category.id == null ||
            !category.name
          ) {
            continue;
          }

          const id = String(category.id);

          if (!unique.has(id)) {
            unique.set(id, category);
          }
        }

        setCategories([...unique.values()]);
      } catch (error) {
        console.error(
          "AUMVEDA Explore Wellness categories failed:",
          error
        );

        if (mounted) {
          setCategories([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     REDUCED MOTION
  ========================================================== */

  useEffect(() => {
    if (!window.matchMedia) return undefined;

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () => setReducedMotion(media.matches);

    update();

    media.addEventListener?.("change", update);

    return () => {
      media.removeEventListener?.("change", update);
    };
  }, []);

  /* ==========================================================
     REPEATED CATEGORIES FOR INFINITE SCROLLING
  ========================================================== */

  const carouselItems = useMemo(() => {
    if (categories.length <= 1) return categories;

    return [
      ...categories,
      ...categories,
      ...categories,
    ];
  }, [categories]);

  const paintPosition = useCallback(() => {
    const track = trackRef.current;

    if (!track) return;

    track.style.transform =
      `translate3d(${-positionRef.current}px, 0, 0)`;
  }, []);

  const setPosition = useCallback(
    (position) => {
      positionRef.current = normalizePosition(
        position,
        loopWidthRef.current
      );

      paintPosition();
    },
    [paintPosition]
  );

  const measureTrack = useCallback(() => {
    const track = trackRef.current;

    if (!track || categories.length < 2) {
      loopWidthRef.current = 0;
      return;
    }

    const first = track.children[0];
    const nextSet = track.children[categories.length];

    if (!first || !nextSet) return;

    const width =
      nextSet.offsetLeft - first.offsetLeft;

    if (width > 0) {
      loopWidthRef.current = width;

      positionRef.current = normalizePosition(
        positionRef.current,
        width
      );

      paintPosition();
    }
  }, [categories.length, paintPosition]);

  const pauseAutoScroll = useCallback((duration = MANUAL_SCROLL_PAUSE) => {
    pauseUntilRef.current =
      performance.now() + duration;
  }, []);

  /* ==========================================================
     CONTINUOUS AUTO SCROLL
  ========================================================== */

  useEffect(() => {
    if (loading || categories.length < 2) {
      return undefined;
    }

    let cancelled = false;
    let lastTimestamp = null;

    measureTrack();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measureTrack)
        : null;

    if (trackRef.current) {
      observer?.observe(trackRef.current);

      if (trackRef.current.firstElementChild) {
        observer?.observe(
          trackRef.current.firstElementChild
        );
      }
    }

    const onResize = () => measureTrack();

    window.addEventListener("resize", onResize);

    function animate(timestamp) {
      if (cancelled) return;

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const delta = Math.min(
        timestamp - lastTimestamp,
        50
      );

      lastTimestamp = timestamp;

      const paused =
        hoveredRef.current ||
        focusedRef.current ||
        interactingRef.current ||
        reducedMotion ||
        document.hidden ||
        timestamp < pauseUntilRef.current ||
        arrowAnimationRef.current !== null;

      if (
        !paused &&
        loopWidthRef.current > 0
      ) {
        setPosition(
          positionRef.current +
          (AUTO_SCROLL_SPEED * delta) / 1000
        );
      }

      animationRef.current =
        requestAnimationFrame(animate);
    }

    animationRef.current =
      requestAnimationFrame(animate);

    return () => {
      cancelled = true;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = null;
      observer?.disconnect();

      window.removeEventListener(
        "resize",
        onResize
      );
    };
  }, [
    categories,
    loading,
    reducedMotion,
    measureTrack,
    setPosition,
  ]);

  /* ==========================================================
     MANUAL ARROWS
  ========================================================== */

  function moveCategories(direction) {
    if (
      !trackRef.current ||
      categories.length < 2
    ) {
      return;
    }

    pauseAutoScroll(
      ARROW_SCROLL_DURATION + 1500
    );

    if (arrowAnimationRef.current !== null) {
      cancelAnimationFrame(
        arrowAnimationRef.current
      );

      arrowAnimationRef.current = null;
    }

    const firstCard =
      trackRef.current.children[0];

    const gap = parseFloat(
      getComputedStyle(trackRef.current).columnGap
    ) || 12;

    const cardWidth =
      firstCard?.getBoundingClientRect().width ||
      100;

    const distance =
      (cardWidth + gap) *
      (direction === "right" ? 1 : -1);

    if (reducedMotion) {
      setPosition(
        positionRef.current + distance
      );
      return;
    }

    const initialPosition = positionRef.current;
    let startTime = null;

    function animateArrow(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(
        elapsed / ARROW_SCROLL_DURATION,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setPosition(
        initialPosition + distance * eased
      );

      if (progress < 1) {
        arrowAnimationRef.current =
          requestAnimationFrame(animateArrow);
      } else {
        arrowAnimationRef.current = null;
        pauseAutoScroll(1500);
      }
    }

    arrowAnimationRef.current =
      requestAnimationFrame(animateArrow);
  }

  /* ==========================================================
     POINTER DRAG / SWIPE
  ========================================================== */

  function handlePointerDown(event) {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    pointerRef.current = {
      x: event.clientX,
      position: positionRef.current,
      moved: false,
    };

    interactingRef.current = true;
    pauseAutoScroll();
  }

  function handlePointerMove(event) {
    const start = pointerRef.current;

    if (!start) return;

    const distance = event.clientX - start.x;

    if (Math.abs(distance) > 6) {
      start.moved = true;
    }

    if (
      event.pointerType === "mouse" ||
      event.pointerType === "pen"
    ) {
      setPosition(
        start.position - distance
      );
    }
  }

  function handlePointerEnd() {
    if (pointerRef.current?.moved) {
      suppressClickRef.current = true;
    }

    pointerRef.current = null;
    interactingRef.current = false;
    pauseAutoScroll(1800);
  }

  /* ==========================================================
     CATEGORY NAVIGATION
  ========================================================== */

  function handleCategoryClick(category) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (category?.id == null) return;

    navigate(
      `/products?category=${encodeURIComponent(
        category.id
      )}`
    );
  }

  /* ==========================================================
     IMAGE FALLBACK
  ========================================================== */

  function markImageFailed(category) {
    setFailedImages((previous) => ({
      ...previous,
      [String(category.id)]: true,
    }));
  }

  /* ==========================================================
     CLEANUP MANUAL ANIMATION
  ========================================================== */

  useEffect(() => {
    return () => {
      if (arrowAnimationRef.current !== null) {
        cancelAnimationFrame(
          arrowAnimationRef.current
        );
      }
    };
  }, []);

  /* ==========================================================
     CATEGORY CARD
  ========================================================== */

  function renderCategory(category, index) {
    const duplicate =
      categories.length > 1 &&
      index >= categories.length;

    const imageFailed =
      failedImages[String(category.id)];

    return (
      <article
        key={`${category.id}-${index}`}
        className="explore-category"
        role="button"
        tabIndex={duplicate ? -1 : 0}
        aria-hidden={duplicate ? true : undefined}
        aria-label={
          duplicate
            ? undefined
            : `Shop ${category.name}`
        }
        onClick={() =>
          handleCategoryClick(category)
        }
        onKeyDown={(event) => {
          if (duplicate) return;

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            handleCategoryClick(category);
          }
        }}
      >
        <div className="explore-category__visual">
          <div className="explore-category__ring">
            <div className="explore-category__image">
              {category.image_url && !imageFailed ? (
                <img
                  src={category.image_url}
                  alt={duplicate ? "" : category.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={() =>
                    markImageFailed(category)
                  }
                />
              ) : (
                <span className="explore-category__fallback">
                  <Leaf
                    size={24}
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                </span>
              )}
            </div>
          </div>

          <span
            className="explore-category__open"
            aria-hidden="true"
          >
            <ArrowUpRight size={12} />
          </span>
        </div>

        <h3>{category.name}</h3>
      </article>
    );
  }

  if (!categories.length) {
    return null;
  }

  return (
    <section
      className="explore-wellness"
      aria-labelledby="explore-wellness-title"
    >
      <div className="explore-wellness__header">
        <div className="explore-wellness__eyebrow">
          <span className="explore-wellness__eyebrow-line" />

          <Sparkles
            size={12}
            strokeWidth={1.7}
            aria-hidden="true"
          />

          <span>SHOP BY CATEGORY</span>

          <span className="explore-wellness__eyebrow-line" />
        </div>

        <h2 id="explore-wellness-title">
          Explore Wellness
        </h2>

        <p>
          Find everyday wellness, personal care,
          nutrition and lifestyle products.
        </p>
      </div>

      <div
        className="explore-carousel"
        onMouseEnter={() => {
          hoveredRef.current = true;
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
        }}
        onFocusCapture={() => {
          focusedRef.current = true;
        }}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget
            )
          ) {
            focusedRef.current = false;
          }
        }}
      >
        {categories.length > 1 && (
          <button
            type="button"
            className="explore-carousel__arrow explore-carousel__arrow--left"
            aria-label="Previous categories"
            onClick={() => moveCategories("left")}
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div
          ref={viewportRef}
          className="explore-carousel__viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onWheel={() => pauseAutoScroll(1500)}
          onClickCapture={(event) => {
            if (suppressClickRef.current) {
              event.stopPropagation();
              suppressClickRef.current = false;
            }
          }}
        >
          <div
            ref={trackRef}
            className="explore-carousel__track"
          >
            {carouselItems.map(renderCategory)}
          </div>
        </div>

        {categories.length > 1 && (
          <button
            type="button"
            className="explore-carousel__arrow explore-carousel__arrow--right"
            aria-label="Next categories"
            onClick={() => moveCategories("right")}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
