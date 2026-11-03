
/* ============================================================
   AUMVEDA — SHARED PUBLIC REQUEST CACHE

   - In-flight request deduplication
   - Cache across React page navigation
   - Session cache across browser refreshes
   - Time-based expiration
   - Bounded memory/session storage
   - Failed requests never cached

   PUBLIC, NON-PERSONALIZED GET RESPONSES ONLY.
============================================================ */

const CACHE_PREFIX = "aumveda-public-v2:";

const memoryCache = new Map();
const pendingRequests = new Map();

const MAX_CACHE_ENTRIES = 80;

function getSessionStorage() {
    try {
        return typeof window !== "undefined"
            ? window.sessionStorage
            : null;
    } catch {
        return null;
    }
}

function readSession(key) {
    const storage = getSessionStorage();

    if (!storage) return null;

    try {
        const raw = storage.getItem(
            CACHE_PREFIX + key
        );

        if (!raw) return null;

        const entry = JSON.parse(raw);

        if (
            !entry ||
            typeof entry.expiresAt !== "number" ||
            Date.now() >= entry.expiresAt
        ) {
            storage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return entry;
    } catch {
        return null;
    }
}

function writeSession(key, entry) {
    const storage = getSessionStorage();

    if (!storage) return;

    try {
        storage.setItem(
            CACHE_PREFIX + key,
            JSON.stringify(entry)
        );
    } catch {
        // Session storage may be full or unavailable.
        // In-memory caching continues working.
    }
}

function removeSession(key) {
    const storage = getSessionStorage();

    if (!storage) return;

    try {
        storage.removeItem(CACHE_PREFIX + key);
    } catch {
        // Ignore unavailable storage.
    }
}

function enforceMemoryLimit() {
    while (memoryCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = memoryCache.keys().next().value;

        if (oldestKey === undefined) {
            break;
        }

        memoryCache.delete(oldestKey);
        removeSession(oldestKey);
    }
}

/* ============================================================
   CACHE KEY BUILDER

   Equivalent objects with reordered keys produce
   the same key.
============================================================ */

function stableValue(value) {
    if (Array.isArray(value)) {
        return value.map(stableValue);
    }

    if (
        value &&
        typeof value === "object" &&
        Object.getPrototypeOf(value) === Object.prototype
    ) {
        const sorted = {};

        for (const key of Object.keys(value).sort()) {
            if (value[key] !== undefined) {
                sorted[key] = stableValue(value[key]);
            }
        }

        return sorted;
    }

    return value;
}

export function createPublicCacheKey(prefix, params = {}) {
    return (
        prefix +
        ":" +
        JSON.stringify(stableValue(params))
    );
}

/* ============================================================
   GET OR FETCH
============================================================ */

export async function cachedPublicRequest(
    key,
    fetcher,
    {
        ttl = 300000,
        persist = true
    } = {}
) {
    const currentTime = Date.now();

    const memoryEntry = memoryCache.get(key);

    if (
        memoryEntry &&
        currentTime < memoryEntry.expiresAt
    ) {
        // LRU: recently used keys go to the end.
        memoryCache.delete(key);
        memoryCache.set(key, memoryEntry);

        return memoryEntry.data;
    }

    memoryCache.delete(key);

    if (persist) {
        const sessionEntry = readSession(key);

        if (sessionEntry) {
            memoryCache.set(key, sessionEntry);
            enforceMemoryLimit();

            return sessionEntry.data;
        }
    }

    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }

    const request = Promise.resolve()
        .then(fetcher)
        .then(data => {
            const entry = {
                data,
                expiresAt: Date.now() + ttl
            };

            memoryCache.delete(key);
            memoryCache.set(key, entry);

            enforceMemoryLimit();

            if (persist) {
                writeSession(key, entry);
            }

            return data;
        })
        .finally(() => {
            pendingRequests.delete(key);
        });

    pendingRequests.set(key, request);

    return request;
}

/* ============================================================
   INVALIDATION

   Use this after public catalog data is updated.

   Example:
     invalidatePublicCache("products:");
============================================================ */

export function invalidatePublicCache(prefix = "") {
    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) {
            memoryCache.delete(key);
        }
    }

    const storage = getSessionStorage();

    if (!storage) return;

    try {
        for (
            let index = storage.length - 1;
            index >= 0;
            index--
        ) {
            const key = storage.key(index);

            if (
                key &&
                key.startsWith(
                    CACHE_PREFIX + prefix
                )
            ) {
                storage.removeItem(key);
            }
        }
    } catch {
        // Ignore unavailable session storage.
    }
}
