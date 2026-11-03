
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowRight,
  ChevronRight,
  Heart,
  Leaf,
  PackageSearch,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";

import ProductGrid from "../components/products/ProductGrid";
import ProductSort from "../components/products/ProductSort";

import {
  getCategories,
  getProducts,
} from "../services/productService";

import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

import "../styles/products.css";

/* ============================================================
   AUMVEDA — PRODUCTS PAGE

   Product-first shopping experience
   Main categories in sidebar
   Maximum 6 subcategory choices
   Four category-specific promotional banners
   2.5-second automatic rotation
   Individually clickable product images
   Product-first advertisement compositions
   No new stylesheet or backend dependencies
============================================================ */

const MAX_VISIBLE_SUBCATEGORIES = 5;
const AD_AFTER_PRODUCTS = 8;
const AD_INTERVAL_MS = 2500;

const AD_CAMPAIGNS = [
  {
    id: "hair",
    theme: "sage",
    eyebrow: "THE HAIR CARE EDIT",
    title: "Nourish Your Roots.",
    highlight: "Naturally.",
    description:
      "Discover botanical oils, masks and everyday hair nourishment.",
    button: "Shop Hair Care",
    categoryNames: ["Hair Care"],
    searchTerms: [
      "hair",
      "bhringraj",
      "amla",
      "shampoo",
      "scalp",
      "coconut",
    ],
  },
  {
    id: "skin",
    theme: "rose",
    eyebrow: "THE SKIN CARE EDIT",
    title: "Glow With Nature.",
    highlight: "Every Day.",
    description:
      "Explore thoughtfully selected serums, creams and gentle skin care.",
    button: "Shop Skin Care",
    categoryNames: ["Skin Care"],
    searchTerms: [
      "skin",
      "face",
      "serum",
      "sandalwood",
      "aloe",
      "neem",
    ],
  },
  {
    id: "immunity",
    theme: "gold",
    eyebrow: "THE INNER WELLNESS EDIT",
    title: "Wellness Begins",
    highlight: "Within.",
    description:
      "Explore herbal wellness essentials for your daily routine.",
    button: "Shop Immunity",
    categoryNames: ["Immunity"],
    searchTerms: [
      "immunity",
      "ashwagandha",
      "brahmi",
      "capsule",
      "triphala",
    ],
  },
  {
    id: "wellness",
    theme: "blue",
    eyebrow: "THE DAILY WELLNESS EDIT",
    title: "Make Every Day",
    highlight: "A Ritual.",
    description:
      "Find herbal teas, daily essentials and moments of mindful care.",
    button: "Shop Wellness",
    categoryNames: ["Wellness"],
    searchTerms: [
      "wellness",
      "tea",
      "detox",
      "tulsi",
      "herbal",
      "daily",
    ],
  },
];

/* ============================================================
   GENERAL UTILITIES
============================================================ */

function toId(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractList(response) {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data?.data?.products,
    response?.data?.data?.categories,
    response?.data?.products,
    response?.data?.categories,
    response?.data?.data,
    response?.data,
    response?.products,
    response?.categories,
  ];

  return candidates.find(Array.isArray) || [];
}

/* ============================================================
   CATEGORY TREE
============================================================ */

function getParentId(category) {
  return toId(
    category?.parent_id ??
    category?.parent_category_id ??
    category?.parentCategoryId ??
    category?.parent?.id ??
    category?.parent_category?.id ??
    ""
  );
}

function normalizeCategories(source) {
  const result = new Map();

  function visit(items, inheritedParent = "") {
    if (!Array.isArray(items)) return;

    for (const category of items) {
      if (!category?.id) continue;

      const id = toId(category.id);

      if (!result.has(id)) {
        result.set(id, {
          ...category,
          id,
          _parentId:
            getParentId(category) || inheritedParent,
        });
      }

      visit(category.children, id);
      visit(category.subcategories, id);
      visit(category.sub_categories, id);
    }
  }

  visit(source);
  return [...result.values()];
}

function createCategoryTree(categories) {
  const byId = new Map(
    categories.map((category) => [
      category.id,
      category,
    ])
  );

  const roots = [];
  const children = new Map();

  for (const category of categories) {
    const parent = category._parentId;

    if (
      parent &&
      parent !== category.id &&
      byId.has(parent)
    ) {
      const group = children.get(parent) || [];
      group.push(category);
      children.set(parent, group);
    } else {
      roots.push(category);
    }
  }

  function sortCategories(a, b) {
    const aOrder = Number(
      a.sort_order ?? a.display_order
    );

    const bOrder = Number(
      b.sort_order ?? b.display_order
    );

    if (
      Number.isFinite(aOrder) &&
      Number.isFinite(bOrder) &&
      aOrder !== bOrder
    ) {
      return aOrder - bOrder;
    }

    return String(a.name || "").localeCompare(
      String(b.name || "")
    );
  }

  roots.sort(sortCategories);
  children.forEach((items) => items.sort(sortCategories));

  function descendants(id) {
    const result = new Set();
    const stack = [toId(id)];

    while (stack.length > 0) {
      const current = stack.pop();

      if (result.has(current)) continue;

      result.add(current);

      for (const child of children.get(current) || []) {
        stack.push(child.id);
      }
    }

    return result;
  }

  function rootOf(id) {
    let current = byId.get(toId(id));
    const visited = new Set();

    while (
      current &&
      current._parentId &&
      byId.has(current._parentId) &&
      !visited.has(current.id)
    ) {
      visited.add(current.id);
      current = byId.get(current._parentId);
    }

    return current?.id || "";
  }

  return {
    byId,
    roots,
    children,
    descendants,
    rootOf,
  };
}

function getProductCategoryIds(product) {
  const ids = new Set();

  function add(value) {
    if (value == null || value === "") return;

    if (typeof value === "object") {
      add(value.id ?? value.category_id);
      return;
    }

    ids.add(toId(value));
  }

  add(product.category_id);
  add(product.category);

  if (Array.isArray(product.category_ids)) {
    product.category_ids.forEach(add);
  }

  if (Array.isArray(product.categories)) {
    product.categories.forEach(add);
  }

  return ids;
}

/* ============================================================
   PRODUCT HELPERS
============================================================ */

function getDefaultVariant(product) {
  return (
    product.product_variants?.find(
      (variant) => variant.is_default
    ) ||
    product.product_variants?.[0] ||
    product.variant ||
    null
  );
}

function productPrice(product) {
  return toNumber(
    product.price ??
    getDefaultVariant(product)?.price ??
    0
  );
}

function comparePrice(product) {
  return toNumber(
    product.compare_at_price ??
    getDefaultVariant(product)?.compare_at_price ??
    product.original_price ??
    0
  );
}

function productInStock(product) {
  if (product.in_stock === false) return false;
  if (product.in_stock === true) return true;

  const stock =
    product.stock_quantity ??
    getDefaultVariant(product)?.stock_quantity;

  return stock == null || toNumber(stock) > 0;
}

function productHasOffer(product) {
  return comparePrice(product) > productPrice(product);
}

function productRating(product) {
  return toNumber(
    product.average_rating ??
    product.rating ??
    0
  );
}

function getProductImage(product) {
  if (typeof product?.image === "string") {
    return product.image;
  }

  return (
    product?.image?.image_url ||
    product?.image_url ||
    product?.thumbnail_url ||
    product?.product_images?.find(
      (image) => image?.is_primary
    )?.image_url ||
    product?.product_images?.[0]?.image_url ||
    ""
  );
}

/* ============================================================
   SIDEBAR
============================================================ */

function ProductsFilterSidebar({
  categoryTree,
  selectedRoot,
  categoryCounts,
  totalProducts,
  onCategoryChange,
  maximumPrice,
  priceLimit,
  onPriceChange,
  inStockOnly,
  onStockChange,
  offersOnly,
  onOffersChange,
  minRating,
  onRatingChange,
  onClear,
}) {
  const displayedPrice =
    priceLimit === null
      ? maximumPrice
      : Math.min(priceLimit, maximumPrice);

  return (
    <div className="product-filters">
      <div className="product-filters__heading">
        <span>REFINE YOUR SHOPPING</span>
        <h2>Filters</h2>
      </div>

      <div className="product-filters__group">
        <h3>Categories</h3>

        <div className="product-filters__list">
          <button
            type="button"
            className={
              "product-filter-item" +
              (selectedRoot === "all"
                ? " is-active"
                : "")
            }
            onClick={() => onCategoryChange("all")}
            aria-pressed={selectedRoot === "all"}
          >
            <ShoppingBag size={14} />
            <span>All Products</span>
            <small>{totalProducts}</small>
          </button>

          {categoryTree.roots.map((category) => {
            const active =
              selectedRoot === category.id;

            return (
              <button
                type="button"
                key={category.id}
                className={
                  "product-filter-item product-filter-item--main" +
                  (active ? " is-active" : "")
                }
                onClick={() =>
                  onCategoryChange(category.id)
                }
                aria-pressed={active}
              >
                <span>{category.name}</span>
                <small>
                  {categoryCounts[category.id] || 0}
                </small>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="product-filters__group">
        <div className="product-filters__group-title">
          <h3>Price Range</h3>
          <Tag size={14} />
        </div>

        <div className="product-filters__price-labels">
          <span>₹0</span>
          <strong>
            ₹{displayedPrice.toLocaleString("en-IN")}
          </strong>
        </div>

        <input
          className="product-filters__range"
          type="range"
          min={0}
          max={maximumPrice}
          step={maximumPrice <= 1000 ? 25 : 50}
          value={displayedPrice}
          aria-label="Maximum product price"
          onChange={(event) =>
            onPriceChange(Number(event.target.value))
          }
        />

        <p className="product-filters__hint">
          Products priced up to ₹
          {displayedPrice.toLocaleString("en-IN")}
        </p>
      </div>

      <div className="product-filters__group">
        <h3>Availability</h3>

        <label className="product-filters__checkbox">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) =>
              onStockChange(event.target.checked)
            }
          />
          <span>In Stock Only</span>
        </label>
      </div>

      <div className="product-filters__group">
        <h3>Special Offers</h3>

        <label className="product-filters__checkbox">
          <input
            type="checkbox"
            checked={offersOnly}
            onChange={(event) =>
              onOffersChange(event.target.checked)
            }
          />
          <span>Discounted Products</span>
        </label>
      </div>

      <div className="product-filters__group">
        <h3>Customer Rating</h3>

        <div className="product-filters__rating-options">
          {[0, 4, 3, 2].map((rating) => (
            <label
              key={rating}
              className="product-filters__radio"
            >
              <input
                type="radio"
                name="catalog-rating"
                checked={minRating === rating}
                onChange={() => onRatingChange(rating)}
              />
              <span>
                {rating === 0
                  ? "All Ratings"
                  : `${rating}★ & above`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="product-filters__clear"
        onClick={onClear}
      >
        <RotateCcw size={14} />
        Reset All Filters
      </button>
    </div>
  );
}

/* ============================================================
   SUBCATEGORY STRIP
   Maximum six options including All
============================================================ */

function SubcategoryStrip({
  category,
  subcategories,
  selectedId,
  onChange,
}) {
  if (!category || subcategories.length === 0) {
    return null;
  }

  const firstFive = subcategories.slice(
    0,
    MAX_VISIBLE_SUBCATEGORIES
  );

  const selectedOutside = subcategories.find(
    (item) =>
      item.id === selectedId &&
      !firstFive.some(
        (visible) => visible.id === item.id
      )
  );

  const visible = selectedOutside
    ? [
        ...firstFive.slice(
          0,
          MAX_VISIBLE_SUBCATEGORIES - 1
        ),
        selectedOutside,
      ]
    : firstFive;

  return (
    <nav
      className="products-subcategories"
      aria-label={`${category.name} subcategories`}
    >
      <span className="products-subcategories__label">
        Explore
      </span>

      <div className="products-subcategories__list">
        <button
          type="button"
          className={
            "products-subcategories__chip" +
            (!selectedId ? " is-active" : "")
          }
          onClick={() => onChange("")}
          aria-pressed={!selectedId}
        >
          All {category.name}
        </button>

        {visible.map((item) => (
          <button
            type="button"
            key={item.id}
            className={
              "products-subcategories__chip" +
              (selectedId === item.id
                ? " is-active"
                : "")
            }
            onClick={() => onChange(item.id)}
            aria-pressed={selectedId === item.id}
          >
            {item.name}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ============================================================
   CATEGORY-BASED PROMOTIONAL BANNERS

   Product selection prioritizes:
   1. Exact category membership, including descendants
   2. Matching product keywords
   3. No unrelated product fallback

   Each slide uses its own theme, product combination,
   and category destination.
============================================================ */

function buildAdSlides(products, categories, tree) {
  const uniqueProducts = [];
  const seen = new Set();

  for (const product of products) {
    if (
      !product?.id ||
      !product?.slug ||
      !getProductImage(product)
    ) {
      continue;
    }

    const id = toId(product.id);

    if (seen.has(id)) continue;

    seen.add(id);
    uniqueProducts.push(product);
  }

  return AD_CAMPAIGNS.map((campaign) => {
    const category = tree.roots.find((item) =>
      campaign.categoryNames.some(
        (name) =>
          slugify(item.name) === slugify(name)
      )
    );

    const categoryIds = category
      ? tree.descendants(category.id)
      : new Set();

    const directMatches = [];
    const keywordMatches = [];

    for (const product of uniqueProducts) {
      const ids = getProductCategoryIds(product);

      const categoryMatch =
        [...ids].some((id) => categoryIds.has(id));

      const searchable = [
        product.name,
        product.short_description,
        ...categories
          .filter((item) => ids.has(item.id))
          .map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const keywordMatch = campaign.searchTerms.some(
        (term) => searchable.includes(term)
      );

      if (categoryMatch) {
        directMatches.push(product);
      } else if (keywordMatch) {
        keywordMatches.push(product);
      }
    }

    const matchingProducts = category
      ? directMatches
      : keywordMatches;

    // Keep each campaign relevant to its named category.
    // When no category is found, keyword matching is used.
    const selectedProducts = matchingProducts.slice(0, 3);

    const destination = category
      ? `/products?category=${encodeURIComponent(
          category.id
        )}`
      : `/products?search=${encodeURIComponent(
          campaign.searchTerms[0]
        )}`;

    return {
      ...campaign,
      products: selectedProducts,
      destination,
    };
  }).filter((slide) => slide.products.length > 0);
}

/* ============================================================
   PROMOTIONAL CAROUSEL
============================================================ */

function CatalogAdvertisement({
  products = [],
  categories = [],
  tree,
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  const slides = useMemo(
    () => buildAdSlides(products, categories, tree),
    [products, categories, tree]
  );

  const timerRef = useRef(null);

  const slideSignature = slides
    .map((slide) => slide.id)
    .join("|");

  useEffect(() => {
    setActiveSlide(0);
  }, [slideSignature]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updatePreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    mediaQuery.addEventListener?.(
      "change",
      updatePreference
    );

    return () => {
      mediaQuery.removeEventListener?.(
        "change",
        updatePreference
      );
    };
  }, []);

  useEffect(() => {
    if (
      paused ||
      reducedMotion ||
      slides.length < 2
    ) {
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      if (document.hidden) return;

      setActiveSlide(
        (current) =>
          (current + 1) % slides.length
      );
    }, AD_INTERVAL_MS);

    return () => {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [paused, reducedMotion, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const currentIndex =
    activeSlide % slides.length;

  const currentSlide = slides[currentIndex];

  return (
    <section
      className={
        "products-catalog-ad " +
        `products-catalog-ad--${currentSlide.theme}`
      }
      aria-label="AUMVEDA category promotions"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          setPaused(false);
        }
      }}
    >
      <div
        className="products-catalog-ad__decoration"
        aria-hidden="true"
      />

      <div
        className="products-catalog-ad__slide"
        key={currentSlide.id}
        aria-label={`Promotion ${currentIndex + 1} of ${slides.length}`}
        aria-roledescription="slide"
      >
        {/* CAMPAIGN COPY */}

        <div className="products-catalog-ad__copy">
          <span className="products-catalog-ad__eyebrow">
            <Leaf size={13} />
            {currentSlide.eyebrow}
          </span>

          <Link
            to={currentSlide.destination}
            className="products-catalog-ad__heading-link"
          >
            <h3>
              {currentSlide.title}
              <em>{currentSlide.highlight}</em>
            </h3>
          </Link>

          <p>{currentSlide.description}</p>

          <Link
            to={currentSlide.destination}
            className="products-catalog-ad__button"
          >
            {currentSlide.button}
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* FEATURED PRODUCTS — INDIVIDUAL LINKS */}

        <div className="products-catalog-ad__images">
          {currentSlide.products.map((product, index) => (
            <Link
              key={product.id}
              to={`/products/${encodeURIComponent(
                product.slug
              )}`}
              className={
                "products-catalog-ad__product " +
                `products-catalog-ad__product--${index + 1}`
              }
              aria-label={`View ${product.name}`}
              title={product.name}
            >
              <img
                src={getProductImage(product)}
                alt={product.name}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* SLIDE INDICATORS */}

      <div className="products-catalog-ad__pagination">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={
              "products-catalog-ad__dot" +
              (index === currentIndex
                ? " is-active"
                : "")
            }
            style={{
              "--dot-theme":
                slide.theme === "sage"
                  ? "#386445"
                  : slide.theme === "rose"
                    ? "#B25E6A"
                    : slide.theme === "gold"
                      ? "#A87930"
                      : "#5979A9",
            }}
            aria-label={`Show ${slide.eyebrow}`}
            aria-pressed={index === currentIndex}
            onClick={() => setActiveSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   MAIN PRODUCTS PAGE
============================================================ */

export default function Products() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [sortBy, setSortBy] = useState("popular");
  const [wishlistOnly, setWishlistOnly] = useState(false);

  const [priceLimit, setPriceLimit] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  const wishlist = useWishlist();
  const cart = useCart();

  const wishlistIds = wishlist.wishlistIds || [];
  const wishlistCount = wishlist.wishlistCount || 0;

  const cartCount = toNumber(
    cart.totalQuantity ??
    cart.items?.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0
    ) ??
    0
  );

  const searchQuery =
    searchParams.get("search") || "";

  /* LOAD API DATA */

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [productResponse, categoryResponse] =
          await Promise.all([
            getProducts(),
            getCategories(),
          ]);

        if (!active) return;

        setProducts(extractList(productResponse));
        setCategories(extractList(categoryResponse));
      } catch (requestError) {
        if (!active) return;

        console.error(
          "Products page loading failed:",
          requestError
        );

        setError(
          "Unable to load products. Please try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [retry]);

  /* MOBILE FILTER KEYBOARD SUPPORT */

  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileFiltersOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [mobileFiltersOpen]);

  /* CATEGORY HIERARCHY */

  const normalizedCategories = useMemo(
    () => normalizeCategories(categories),
    [categories]
  );

  const tree = useMemo(
    () => createCategoryTree(normalizedCategories),
    [normalizedCategories]
  );

  const categoryNames = useMemo(
    () =>
      Object.fromEntries(
        normalizedCategories.map((category) => [
          category.id,
          category.name,
        ])
      ),
    [normalizedCategories]
  );

  function resolveCategory(value) {
    if (!value) return "";

    const query = value.trim().toLowerCase();

    return (
      normalizedCategories.find(
        (category) =>
          category.id.toLowerCase() === query ||
          slugify(category.name) === query ||
          slugify(category.slug || "") === query
      )?.id || ""
    );
  }

  const categoryId = resolveCategory(
    searchParams.get("category")
  );

  const subcategoryId = resolveCategory(
    searchParams.get("subcategory")
  );

  const selectedRoot = categoryId
    ? tree.rootOf(categoryId)
    : "all";

  const selectedMainCategory =
    tree.byId.get(selectedRoot) || null;

  const availableSubcategories = useMemo(() => {
    if (selectedRoot === "all") return [];

    const allowed = tree.descendants(selectedRoot);

    return normalizedCategories.filter(
      (category) =>
        category.id !== selectedRoot &&
        allowed.has(category.id)
    );
  }, [
    selectedRoot,
    tree,
    normalizedCategories,
  ]);

  const selectedSubcategory = useMemo(() => {
    if (selectedRoot === "all") return "";

    const candidate =
      subcategoryId ||
      (categoryId !== selectedRoot ? categoryId : "");

    return availableSubcategories.some(
      (category) => category.id === candidate
    )
      ? candidate
      : "";
  }, [
    selectedRoot,
    subcategoryId,
    categoryId,
    availableSubcategories,
  ]);

  const effectiveCategory =
    selectedSubcategory || selectedRoot;

  /* CATEGORY COUNTS */

  const categoryCounts = useMemo(() => {
    const counts = {};

    for (const category of normalizedCategories) {
      const allowed = tree.descendants(category.id);

      counts[category.id] = products.filter(
        (product) =>
          [...getProductCategoryIds(product)].some(
            (id) => allowed.has(id)
          )
      ).length;
    }

    return counts;
  }, [products, normalizedCategories, tree]);

  /* PRICE LIMIT */

  const maximumPrice = useMemo(() => {
    const highest = products.reduce(
      (max, product) =>
        Math.max(max, productPrice(product)),
      0
    );

    return Math.max(
      500,
      Math.ceil(highest / 100) * 100
    );
  }, [products]);

  /* FILTER AND SORT PRODUCTS */

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (effectiveCategory !== "all") {
      const allowed = tree.descendants(
        effectiveCategory
      );

      result = result.filter(
        (product) =>
          [...getProductCategoryIds(product)].some(
            (id) => allowed.has(id)
          )
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((product) => {
        const names = [...getProductCategoryIds(product)]
          .map((id) => categoryNames[id])
          .filter(Boolean);

        const searchable = [
          product.name,
          product.short_description,
          product.description,
          ...names,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });
    }

    if (wishlistOnly) {
      const ids = new Set(wishlistIds.map(toId));

      result = result.filter(
        (product) => ids.has(toId(product.id))
      );
    }

    if (priceLimit !== null) {
      result = result.filter(
        (product) =>
          productPrice(product) <= priceLimit
      );
    }

    if (inStockOnly) {
      result = result.filter(productInStock);
    }

    if (offersOnly) {
      result = result.filter(productHasOffer);
    }

    if (minRating > 0) {
      result = result.filter(
        (product) =>
          productRating(product) >= minRating
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "price_low":
          return productPrice(a) - productPrice(b);

        case "price_high":
          return productPrice(b) - productPrice(a);

        case "rating":
          return productRating(b) - productRating(a);

        case "name":
          return String(a.name || "").localeCompare(
            String(b.name || "")
          );

        default: {
          const score = (product) =>
            productRating(product) * 1000 +
            toNumber(product.review_count);

          return score(b) - score(a);
        }
      }
    });

    return result;
  }, [
    products,
    effectiveCategory,
    tree,
    searchQuery,
    categoryNames,
    wishlistOnly,
    wishlistIds,
    priceLimit,
    inStockOnly,
    offersOnly,
    minRating,
    sortBy,
  ]);

  /* CATEGORY FILTER ACTIONS */

  function changeCategory(id) {
    const params = new URLSearchParams(searchParams);

    if (id === "all") {
      params.delete("category");
    } else {
      params.set("category", id);
    }

    params.delete("subcategory");
    setSearchParams(params);
  }

  function changeSubcategory(id) {
    if (selectedRoot === "all") return;

    const params = new URLSearchParams(searchParams);
    params.set("category", selectedRoot);

    if (id) {
      params.set("subcategory", id);
    } else {
      params.delete("subcategory");
    }

    setSearchParams(params);
  }

  function removeSearch() {
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    setSearchParams(params);
  }

  function clearFilters() {
    setSortBy("popular");
    setWishlistOnly(false);
    setPriceLimit(null);
    setInStockOnly(false);
    setOffersOnly(false);
    setMinRating(0);
    setSearchParams({});
  }

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedRoot !== "all" ||
    Boolean(selectedSubcategory) ||
    wishlistOnly ||
    priceLimit !== null ||
    inStockOnly ||
    offersOnly ||
    minRating > 0 ||
    sortBy !== "popular";

  const filterProps = {
    categoryTree: tree,
    selectedRoot,
    categoryCounts,
    totalProducts: products.length,
    onCategoryChange: changeCategory,
    maximumPrice,
    priceLimit,
    onPriceChange: setPriceLimit,
    inStockOnly,
    onStockChange: setInStockOnly,
    offersOnly,
    onOffersChange: setOffersOnly,
    minRating,
    onRatingChange: setMinRating,
    onClear: clearFilters,
  };

  const currentCategoryName = selectedSubcategory
    ? categoryNames[selectedSubcategory]
    : selectedRoot !== "all"
      ? categoryNames[selectedRoot]
      : "";

  /* GROUP PRODUCTS AROUND ADVERTISEMENT */

  const showAdvertisement =
    !loading &&
    !error &&
    filteredProducts.length > AD_AFTER_PRODUCTS;

  const firstProducts = showAdvertisement
    ? filteredProducts.slice(0, AD_AFTER_PRODUCTS)
    : filteredProducts;

  const remainingProducts = showAdvertisement
    ? filteredProducts.slice(AD_AFTER_PRODUCTS)
    : [];

  return (
    <main className="products-page">
      <section className="products-shop">
        {/* FILTER SIDEBAR */}

        <aside className="products-shop__sidebar">
          <ProductsFilterSidebar {...filterProps} />
        </aside>

        {/* MAIN COLLECTION */}

        <div className="products-shop__main">
          <div className="products-collection-heading">
            <div>
              <span className="products-collection-heading__eyebrow">
                CURATED FOR YOU
              </span>

              <h1>
                {currentCategoryName ||
                  "Explore Our Collection"}
              </h1>

              <p>
                Discover naturally inspired wellness
                essentials for everyday living.
              </p>
            </div>
          </div>

          <SubcategoryStrip
            category={selectedMainCategory}
            subcategories={availableSubcategories}
            selectedId={selectedSubcategory}
            onChange={changeSubcategory}
          />

          {/* TOOLBAR */}

          <div className="products-toolbar">
            <div className="products-toolbar__left">
              <button
                type="button"
                className="products-mobile-filter"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>

              <div className="products-result-count">
                <strong>
                  {loading
                    ? "—"
                    : filteredProducts.length}
                </strong>

                <span>
                  {filteredProducts.length === 1
                    ? " product"
                    : " products"}
                </span>
              </div>

              {currentCategoryName && (
                <span className="products-current-category">
                  {currentCategoryName}
                </span>
              )}
            </div>

            <div className="products-toolbar__right">
              <button
                type="button"
                className={
                  "products-toolbar-action" +
                  (wishlistOnly ? " is-active" : "")
                }
                onClick={() =>
                  setWishlistOnly((value) => !value)
                }
                aria-pressed={wishlistOnly}
              >
                <Heart
                  size={15}
                  fill={
                    wishlistOnly
                      ? "currentColor"
                      : "none"
                  }
                />

                Wishlist

                {wishlistCount > 0 && (
                  <span>{wishlistCount}</span>
                )}
              </button>

              <div className="products-cart-summary">
                <ShoppingBag size={15} />
                Cart

                {cartCount > 0 && (
                  <span>{cartCount}</span>
                )}
              </div>

              <ProductSort
                value={sortBy}
                onChange={setSortBy}
              />
            </div>
          </div>

          {/* SEARCH SUMMARY */}

          {searchQuery.trim() && (
            <div className="products-search-summary">
              Search results for
              <strong>“{searchQuery}”</strong>
            </div>
          )}

          {/* ACTIVE FILTER CHIPS */}

          {hasActiveFilters && (
            <div className="products-active-filters">
              {selectedRoot !== "all" && (
                <span>
                  Category:
                  <strong>
                    {categoryNames[selectedRoot]}
                  </strong>
                </span>
              )}

              {selectedSubcategory && (
                <span>
                  Subcategory:
                  <strong>
                    {categoryNames[selectedSubcategory]}
                  </strong>
                </span>
              )}

              {priceLimit !== null && (
                <span>
                  Up to
                  <strong>
                    ₹{priceLimit.toLocaleString("en-IN")}
                  </strong>
                </span>
              )}

              {inStockOnly && <span>In Stock</span>}
              {offersOnly && <span>Offers Only</span>}

              {minRating > 0 && (
                <span>{minRating}★ & above</span>
              )}

              {wishlistOnly && (
                <span>Wishlist Only</span>
              )}

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={removeSearch}
                >
                  <X size={12} />
                  Remove Search
                </button>
              )}

              <button
                type="button"
                onClick={clearFilters}
              >
                <RotateCcw size={12} />
                Clear All
              </button>
            </div>
          )}

          {/* PRODUCTS */}

          {loading ? (
            <div className="products-loading-grid">
              {Array.from({ length: 8 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="product-skeleton"
                  >
                    <div className="product-skeleton__image" />
                    <div className="product-skeleton__line product-skeleton__line--title" />
                    <div className="product-skeleton__line" />
                    <div className="product-skeleton__line product-skeleton__line--short" />
                  </div>
                )
              )}
            </div>
          ) : error ? (
            <div className="products-state">
              <PackageSearch size={38} />
              <h3>Collection unavailable</h3>
              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  setRetry((value) => value + 1)
                }
              >
                Try Again
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="products-state">
              <PackageSearch size={38} />
              <h3>No products found</h3>

              <p>
                Try adjusting your selected filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="products-catalog-results">
              <ProductGrid products={firstProducts} />

              {showAdvertisement && (
                <CatalogAdvertisement
                  products={products}
                  categories={normalizedCategories}
                  tree={tree}
                />
              )}

              {remainingProducts.length > 0 && (
                <ProductGrid
                  products={remainingProducts}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* MOBILE FILTER DRAWER */}

      {mobileFiltersOpen && (
        <div
          className="products-filter-overlay"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <aside
            className="products-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="products-filter-drawer__header">
              <div>
                <span>SHOP AUMVEDA</span>
                <h3>Refine Collection</h3>
              </div>

              <button
                type="button"
                aria-label="Close filters"
                onClick={() =>
                  setMobileFiltersOpen(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <ProductsFilterSidebar
              {...filterProps}
              onCategoryChange={(id) => {
                changeCategory(id);
                setMobileFiltersOpen(false);
              }}
              onClear={() => {
                clearFilters();
                setMobileFiltersOpen(false);
              }}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
