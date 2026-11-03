
import api from "./api";

import {
    cachedPublicRequest,
    createPublicCacheKey,
    invalidatePublicCache
} from "./publicRequestCache";

/* ============================================================
   AUMVEDA — CUSTOMER PRODUCT SERVICE

   Public product API caching:
   - Products: 5 minutes
   - Categories: 30 minutes
   - Product details: 5 minutes

   Recently Viewed:
   - Record authenticated product views
   - Retrieve customer-specific browsing history
   - No public caching for personal data

   Existing endpoints and response formats preserved.
============================================================ */

const PRODUCT_TTL = 5 * 60 * 1000;
const CATEGORY_TTL = 30 * 60 * 1000;

/* ============================================================
   GET ALL PRODUCTS
============================================================ */

export async function getProducts(params = {}) {
    const cacheKey = createPublicCacheKey(
        "products:list",
        params
    );

    return cachedPublicRequest(
        cacheKey,
        async () => {
            try {
                const response = await api.get(
                    "/products",
                    { params }
                );

                return Array.isArray(response)
                    ? response
                    : response?.data || [];

            } catch (error) {
                console.error(
                    "Get products API failed:",
                    error
                );

                throw error;
            }
        },
        {
            ttl: PRODUCT_TTL,
            persist: true
        }
    );
}

/* ============================================================
   GET CATEGORIES
============================================================ */

export async function getCategories() {
    return cachedPublicRequest(
        "products:categories",
        async () => {
            try {
                const response = await api.get(
                    "/products/categories"
                );

                return Array.isArray(response)
                    ? response
                    : response?.data || [];

            } catch (error) {
                console.error(
                    "Get categories API failed:",
                    error
                );

                throw error;
            }
        },
        {
            ttl: CATEGORY_TTL,
            persist: true
        }
    );
}

/* ============================================================
   GET PRODUCT BY SLUG
============================================================ */

export async function getProductBySlug(slug) {
    if (!slug) {
        throw new Error(
            "Product slug is required"
        );
    }

    const cacheKey = createPublicCacheKey(
        "products:detail",
        { slug }
    );

    return cachedPublicRequest(
        cacheKey,
        async () => {
            try {
                const response = await api.get(
                    `/products/${encodeURIComponent(slug)}`
                );

                return Array.isArray(response)
                    ? response[0]
                    : response?.data || response;

            } catch (error) {
                console.error(
                    "Get product details failed:",
                    error
                );

                throw error;
            }
        },
        {
            ttl: PRODUCT_TTL,
            persist: true
        }
    );
}

/* ============================================================
   RECORD RECENTLY VIEWED PRODUCT

   Endpoint:
   POST /api/v1/recently-viewed/{product_id}

   Authentication is provided by the existing api client.

   The backend derives customer_id from the access token.
============================================================ */

export async function recordRecentlyViewedProduct(productId) {
    if (!productId) {
        throw new Error(
            "Product ID is required to record a view."
        );
    }

    const response = await api.post(
        `/recently-viewed/${encodeURIComponent(productId)}`,
        {}
    );

    return response?.data ?? response;
}

/* ============================================================
   GET RECENTLY VIEWED PRODUCTS

   Endpoint:
   GET /api/v1/recently-viewed

   Important:
   - Authenticated endpoint
   - No localStorage caching
   - No publicRequestCache
   - Customer data is kept account-specific
============================================================ */

export async function getRecentlyViewedProducts() {
    const response = await api.get(
        "/recently-viewed"
    );

    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    return [];
}

/* ============================================================
   INVALIDATE PUBLIC PRODUCT CACHE
============================================================ */

export function invalidateProductCache() {
    invalidatePublicCache("products:");
}
