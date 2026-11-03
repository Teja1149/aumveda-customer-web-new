
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
  Award,
  ChevronRight,
  Flower2,
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

import "../styles/products.css";

/* ============================================================
   AUMVEDA — PRODUCTS PAGE

   - Category and subcategory navigation
   - Price, availability, offers and rating filters
   - Product search and sorting
   - Best Sellers discovery
   - New Arrivals discovery
   - Promotional carousel
   - Responsive catalog and mobile filter drawer

   Toolbar icons:
   Best Sellers = Award
   New Arrivals = Flower2
============================================================ */

const MAX_VISIBLE_SUBCATEGORIES = 5;
const AD_AFTER_PRODUCTS = 8;
const AD_INTERVAL_MS = 2500;

const NEW_ARRIVALS_DAYS = 60;

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
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  const candidates = [
    response?.data?.data?.products,
    response?.data?.data?.categories,
    response?.data?.products,
    response?.data?.categories,
    response?.data?.data,
    response?.data,
    response?.products,
    response?.categories,
    response?.items,
  ];

  return candidates.find(Array.isArray) || [];
}

function dateTimestamp(value) {
  if (!value) return null;

  const result = Date.parse(value);

  return Number.isFinite(result) ? result : null;
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

  children.forEach((items) =>
    items.sort(sortCategories)
  );

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
  const variants = Array.isArray(
    product?.product_variants
  )
    ? product.product_variants
    : [];

  const activeVariants = variants.filter(
    (variant) => variant.is_active !== false
  );

  return (
    activeVariants.find(
      (variant) =>
        variant.is_default === true ||
        variant.attributes?.is_default === true
    ) ||
    activeVariants[0] ||
    product?.variant ||
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
  const price = productPrice(product);
  const original = comparePrice(product);

  return price > 0 && original > price;
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

function isActiveProduct(product) {
  return (
    !product.status ||
    String(product.status).toLowerCase() === "active"
  );
}

/* ============================================================
   DISCOVERY HELPERS

   Best Sellers requires explicit backend sales metadata.
   It is not inferred from reviews or ratings.
============================================================ */

function getSalesCount(product) {
  const possibleValues = [
    product.sales_count,
    product.total_sold,
    product.sold_count,
    product.units_sold,
    product.completed_sales_count,
  ];

  const value = possibleValues.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      item !== ""
  );

  if (value === undefined) {
    return null;
  }

  const count = Number(value);

  return Number.isFinite(count)
    ? Math.max(0, count)
    : null;
}

function hasBestSellerEvidence(product) {
  return (
    product.is_best_seller === true ||
    product.is_bestseller === true ||
    (
      getSalesCount(product) !== null &&
      getSalesCount(product) > 0
    )
  );
}

function isNewArrival(product, now) {
  const createdAt = dateTimestamp(
    product.created_at
  );

  if (createdAt === null) {
    return false;
  }

  const elapsed = now - createdAt;

  return (
    elapsed >= 0 &&
    elapsed <= NEW_ARRIVALS_DAYS * 86400000
  );
}

/* ============================================================
   FILTER SIDEBAR
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

      {/* CATEGORIES */}

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

      {/* PRICE */}

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

      {/* STOCK */}

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

      {/* OFFERS */}

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

      {/* RATING */}

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
                onChange={() =>
                  onRatingChange(rating)
                }
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
   SUBCATEGORIES
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
   PROMOTIONAL SLIDE GENERATION
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
        [...ids].some(
          (id) => categoryIds.has(id)
        );

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

    const selectedProducts =
      matchingProducts.slice(0, 3);

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
  }).filter(
    (slide) => slide.products.length > 0
  );
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
  }, [
    paused,
    reducedMotion,
    slides.length,
  ]);

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
        aria-label={
          `Promotion ${currentIndex + 1} of ${slides.length}`
        }
        aria-roledescription="slide"
      >
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

        <div className="products-catalog-ad__images">
          {currentSlide.products.map(
            (product, index) => (
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
            )
          )}
        </div>
      </div>

      <div className="products-catalog-ad__pagination">
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.id}
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

  const [discoveryMode, setDiscoveryMode] =
    useState("all");

  const [priceLimit, setPriceLimit] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const [mobileFiltersOpen, setMobileFiltersOpen] =
    useState(false);

  const searchQuery =
    searchParams.get("search") || "";

  /* ==========================================================
     LOAD API DATA
  ========================================================== */

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          productResponse,
          categoryResponse,
        ] = await Promise.all([
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
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [retry]);

  /* ==========================================================
     MOBILE DRAWER KEYBOARD SUPPORT
  ========================================================== */

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return undefined;
    }

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

  /* ==========================================================
     CATEGORY TREE
  ========================================================== */

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
    if (selectedRoot === "all") {
      return [];
    }

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
      (categoryId !== selectedRoot
        ? categoryId
        : "");

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

  /* ==========================================================
     CATEGORY COUNTS
  ========================================================== */

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
  }, [
    products,
    normalizedCategories,
    tree,
  ]);

  /* ==========================================================
     PRICE LIMIT
  ========================================================== */

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

  /* ==========================================================
     DATA AVAILABILITY

     These checks avoid misleading customers.
  ========================================================== */

  const hasSalesMetadata = products.some(
    (product) =>
      getSalesCount(product) !== null ||
      typeof product.is_best_seller === "boolean" ||
      typeof product.is_bestseller === "boolean"
  );

  const hasCreationDates = products.some(
    (product) =>
      dateTimestamp(product.created_at) !== null
  );

  /* ==========================================================
     FILTER AND SORT
  ========================================================== */

  const filteredProducts = useMemo(() => {
    let result = products.filter(isActiveProduct);

    /* CATEGORY */

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

    /* SEARCH */

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

    /* PRICE */

    if (priceLimit !== null) {
      result = result.filter(
        (product) =>
          productPrice(product) <= priceLimit
      );
    }

    /* AVAILABILITY */

    if (inStockOnly) {
      result = result.filter(productInStock);
    }

    /* OFFERS */

    if (offersOnly) {
      result = result.filter(productHasOffer);
    }

    /* RATING */

    if (minRating > 0) {
      result = result.filter(
        (product) =>
          productRating(product) >= minRating
      );
    }

    /* DISCOVERY */

    if (discoveryMode === "best-sellers") {
      result = result.filter(
        hasBestSellerEvidence
      );

      result.sort((a, b) => {
        const aCount = getSalesCount(a) ?? 0;
        const bCount = getSalesCount(b) ?? 0;

        if (bCount !== aCount) {
          return bCount - aCount;
        }

        if (
          a.is_best_seller === true &&
          b.is_best_seller !== true
        ) {
          return -1;
        }

        if (
          b.is_best_seller === true &&
          a.is_best_seller !== true
        ) {
          return 1;
        }

        return productRating(b) - productRating(a);
      });
    } else if (discoveryMode === "new-arrivals") {
      const now = Date.now();

      result = result.filter(
        (product) => isNewArrival(product, now)
      );

      result.sort(
        (a, b) =>
          (dateTimestamp(b.created_at) ?? 0) -
          (dateTimestamp(a.created_at) ?? 0)
      );
    } else {
      /* EXISTING SORTING */

      result = [...result].sort((a, b) => {
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
    }

    /* OPTIONAL SORT OVERRIDE FOR DISCOVERY MODES */

    if (
      discoveryMode !== "all" &&
      sortBy !== "popular"
    ) {
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

          default:
            return 0;
        }
      });
    }

    return result;
  }, [
    products,
    effectiveCategory,
    tree,
    searchQuery,
    categoryNames,
    priceLimit,
    inStockOnly,
    offersOnly,
    minRating,
    sortBy,
    discoveryMode,
  ]);

  /* ==========================================================
     CATEGORY ACTIONS
  ========================================================== */

  function changeCategory(id) {
    const params = new URLSearchParams(
      searchParams
    );

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

    const params = new URLSearchParams(
      searchParams
    );

    params.set("category", selectedRoot);

    if (id) {
      params.set("subcategory", id);
    } else {
      params.delete("subcategory");
    }

    setSearchParams(params);
  }

  function removeSearch() {
    const params = new URLSearchParams(
      searchParams
    );

    params.delete("search");
    setSearchParams(params);
  }

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  function clearFilters() {
    setSortBy("popular");
    setDiscoveryMode("all");
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
    priceLimit !== null ||
    inStockOnly ||
    offersOnly ||
    minRating > 0 ||
    discoveryMode !== "all";

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

  /* ==========================================================
     PROMOTIONAL BANNER POSITION
  ========================================================== */

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

  /* ==========================================================
     EMPTY-STATE MESSAGE
  ========================================================== */

  let emptyTitle = "No products found";
  let emptyMessage =
    "Try adjusting your selected filters.";

  if (
    discoveryMode === "best-sellers" &&
    !hasSalesMetadata
  ) {
    emptyTitle = "Best Sellers coming soon";
    emptyMessage =
      "Verified sales rankings are not yet available from the product catalog. Browse all products in the meantime.";
  } else if (
    discoveryMode === "best-sellers"
  ) {
    emptyTitle = "No Best Sellers found";
    emptyMessage =
      "No products match the selected categories and bestseller criteria.";
  } else if (
    discoveryMode === "new-arrivals" &&
    !hasCreationDates
  ) {
    emptyTitle = "New Arrivals coming soon";
    emptyMessage =
      "Product creation dates are not yet included in the catalog response.";
  } else if (
    discoveryMode === "new-arrivals"
  ) {
    emptyTitle = "No new arrivals found";
    emptyMessage =
      "There are no products added within the last 60 days that match your filters.";
  }

  /* ==========================================================
     RENDER
  ========================================================== */

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

          {/* ==================================================
              TOOLBAR — SELECTED ICON PAIR 5
          ================================================== */}

          <div className="products-toolbar">

            <div className="products-toolbar__left">
              <button
                type="button"
                className="products-mobile-filter"
                onClick={() =>
                  setMobileFiltersOpen(true)
                }
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

              {/* BEST SELLERS — AWARD */}

              <button
                type="button"
                className={
                  "products-toolbar-action products-toolbar-action--quick" +
                  (discoveryMode === "best-sellers"
                    ? " is-active"
                    : "")
                }
                onClick={() =>
                  setDiscoveryMode((current) =>
                    current === "best-sellers"
                      ? "all"
                      : "best-sellers"
                  )
                }
                aria-pressed={
                  discoveryMode === "best-sellers"
                }
                title="Discover products with verified bestseller data"
              >
                <Award
                  size={16}
                  strokeWidth={1.8}
                />

                <span className="products-toolbar-action__label">
                  Best Sellers
                </span>
              </button>

              {/* NEW ARRIVALS — FLOWER */}

              <button
                type="button"
                className={
                  "products-toolbar-action products-toolbar-action--quick" +
                  (discoveryMode === "new-arrivals"
                    ? " is-active"
                    : "")
                }
                onClick={() =>
                  setDiscoveryMode((current) =>
                    current === "new-arrivals"
                      ? "all"
                      : "new-arrivals"
                  )
                }
                aria-pressed={
                  discoveryMode === "new-arrivals"
                }
                title="Discover recently added products"
              >
                <Flower2
                  size={16}
                  strokeWidth={1.8}
                />

                <span className="products-toolbar-action__label">
                  New Arrivals
                </span>
              </button>

              {/* SORT */}

              <ProductSort
                value={sortBy}
                onChange={setSortBy}
              />
            </div>
          </div>

          {/* SEARCH */}

          {searchQuery.trim() && (
            <div className="products-search-summary">
              Search results for
              <strong>“{searchQuery}”</strong>
            </div>
          )}

          {/* ACTIVE FILTERS */}

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

              {inStockOnly && (
                <span>In Stock</span>
              )}

              {offersOnly && (
                <span>Offers Only</span>
              )}

              {minRating > 0 && (
                <span>{minRating}★ & above</span>
              )}

              {discoveryMode === "best-sellers" && (
                <span>
                  <Award size={12} />
                  Best Sellers
                </span>
              )}

              {discoveryMode === "new-arrivals" && (
                <span>
                  <Flower2 size={12} />
                  New Arrivals
                </span>
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

              <h3>{emptyTitle}</h3>

              <p>{emptyMessage}</p>

              <button
                type="button"
                onClick={clearFilters}
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="products-catalog-results">
              <ProductGrid
                products={firstProducts}
              />

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
          onClick={() =>
            setMobileFiltersOpen(false)
          }
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
