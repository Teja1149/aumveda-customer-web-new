
import { api } from "./api";

import {
  cachedPublicRequest,
  invalidatePublicCache,
} from "./publicRequestCache";

const HERO_TTL = 15 * 60 * 1000;
const CATEGORY_TTL = 30 * 60 * 1000;
const CMS_TTL = 60 * 1000;
const COUPONS_TTL = 30 * 1000;

export async function getHomeHero() {
  return cachedPublicRequest(
    "home:hero",
    async () => {
      const response = await api.get("/home/hero");
      return response.data;
    },
    { ttl: HERO_TTL, persist: true }
  );
}

export async function getHomeCategories() {
  return cachedPublicRequest(
    "home:categories",
    async () => {
      const response = await api.get("/home/categories");
      return response.data;
    },
    { ttl: CATEGORY_TTL, persist: true }
  );
}

export async function getHomeConfiguration() {
  return cachedPublicRequest(
    "home:configuration:v1",
    async () => {
      const response = await api.get(
        "/home/configuration"
      );

      return response.data;
    },
    { ttl: CMS_TTL, persist: false }
  );
}

/* ============================================================
   CUSTOMER WEB — DYNAMIC HOMEPAGE COUPONS

   Existing Customer Backend endpoint:
   GET /home/coupons

   The Admin Backend writes to the same Supabase
   coupons table.

   No Admin API or Admin authentication is required.
============================================================ */

export async function getHomeCoupons() {
  return cachedPublicRequest(
    "home:coupons:v1",
    async () => {
      const response = await api.get("/home/coupons");
      return response.data;
    },
    {
      ttl: COUPONS_TTL,
      persist: false,
    }
  );
}

export function invalidateHomeCouponsCache() {
  invalidatePublicCache("home:coupons:");
}

export function invalidateHomeCache() {
  invalidatePublicCache("home:");
}
