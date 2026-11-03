
import {
  Leaf,
  Rabbit,
  ShieldCheck,
  Sparkles,
  Recycle,
} from "lucide-react";

import "../../styles/trust-benefits.css";

/* ============================================================
   AUMVEDA — TRUST & BENEFITS

   Five existing brand benefits.
   Responsive, compact benefits strip.
   No backend or homepage integration changes.
============================================================ */

const BENEFITS = [
  {
    id: "natural",
    icon: Leaf,
    title: "100% Natural",
    description: "Pure & safe ingredients",
  },
  {
    id: "cruelty-free",
    icon: Rabbit,
    title: "Cruelty Free",
    description: "Kind to animals",
  },
  {
    id: "no-harmful-chemicals",
    icon: ShieldCheck,
    title: "No Harmful Chemicals",
    description: "Safe for your family",
  },
  {
    id: "traditional-wellness",
    icon: Sparkles,
    title: "Traditional Wellness",
    description: "Inspired by timeless care",
  },
  {
    id: "eco-friendly",
    icon: Recycle,
    title: "Eco Friendly",
    description: "Better for the planet",
  },
];

export default function TrustBenefits() {
  return (
    <section
      className="trust-benefits"
      aria-label="AUMVEDA product benefits"
    >
      <div className="trust-benefits__container">
        <div className="trust-benefits__grid">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.id}
                className="trust-benefits__item"
              >
                <span
                  className="trust-benefits__icon"
                  aria-hidden="true"
                >
                  <Icon size={21} strokeWidth={1.8} />
                </span>

                <div className="trust-benefits__copy">
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
