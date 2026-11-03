
import { useLayoutEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  useLocation
} from "react-router-dom";

import {
  motion,
  AnimatePresence
} from "framer-motion";

import MainLayout from "../layouts/MainLayout";

import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import Products from "../pages/Products";
import ProductDetails from "../pages/ProductDetails";
import Wishlist from "../pages/Wishlist";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import Profile from "../pages/Profile";
import Orders from "../pages/Orders";
import About from "../pages/About";
import Contact from "../pages/Contact";

/* ============================================================
   AUMVEDA CUSTOMER WEB
   APP ROUTER — UPDATED WITH MY ORDERS
============================================================ */

function AnimatedRoutes() {
  const location = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const html = document.documentElement;
    const body = document.body;

    html.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";

    html.scrollTop = 0;
    body.scrollTop = 0;

    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${location.pathname}${location.search}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.28,
          ease: "easeOut"
        }}
      >
        <Routes location={location}>
          {/* HOME */}
          <Route
            path="/"
            element={<HomePage />}
          />

          {/* AUTHENTICATION */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/signup"
            element={<SignupPage />}
          />

          {/* PRODUCTS */}
          <Route
            path="/products"
            element={<Products />}
          />

          <Route
            path="/products/:slug"
            element={<ProductDetails />}
          />

          {/* WISHLIST */}
          <Route
            path="/wishlist"
            element={<Wishlist />}
          />

          {/* CART */}
          <Route
            path="/cart"
            element={<Cart />}
          />

          {/* CHECKOUT */}
          <Route
            path="/checkout"
            element={<Checkout />}
          />

          {/* PROFILE */}
          <Route
            path="/profile"
            element={<Profile />}
          />

          {/* MY ORDERS */}
          <Route
            path="/orders"
            element={<Orders />}
          />

          {/* ABOUT */}
          <Route
            path="/about"
            element={<About />}
          />

          {/* CONTACT */}
          <Route
            path="/contact"
            element={<Contact />}
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={<HomePage />}
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================
   APP ROUTER
============================================================ */

function AppRouter() {
  return (
    <BrowserRouter>
      <MainLayout>
        <AnimatedRoutes />
      </MainLayout>
    </BrowserRouter>
  );
}

export default AppRouter;
