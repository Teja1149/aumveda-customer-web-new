
import Navbar from "../components/home/Navbar";
import UtilityBar from "../components/home/UtilityBar";
import Footer from "../components/home/Footer";

/* ============================================================
   AUMVEDA — MAIN WEBSITE LAYOUT

   STRUCTURE:

   01 — Utility Bar       (100% browser width)
   02 — Navbar            (100% browser width)
   03 — Page Content
         - Homepage uses centered 1440px container
         - Other pages retain their own layouts
   04 — Footer            (100% browser width)

   IMPORTANT:
   - No changes to authentication or routing
   - No changes to existing homepage components
   - Footer renders once on every page using MainLayout
============================================================ */

function MainLayout({ children }) {
  return (
    <div
      className="aumveda-app"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {/* 01 — FULL-WIDTH UTILITY BAR */}
      <UtilityBar />

      {/* 02 — FULL-WIDTH NAVBAR */}
      <Navbar />

      {/* 03 — PAGE CONTENT */}
      <main
        className="aumveda-page-content"
        style={{
          flex: "1 0 auto",
          width: "100%",
          minWidth: 0,
        }}
      >
        {children}
      </main>

      {/* 04 — FULL-WIDTH FOOTER */}
      <Footer />
    </div>
  );
}

export default MainLayout;
