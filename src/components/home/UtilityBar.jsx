
import {
  BadgeCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import "../../styles/utilityBar.css";

/* ============================================================
   AUMVEDA — UTILITY BAR

   Four customer trust messages.
   Full-width botanical green strip.
   Responsive desktop and mobile presentation.
============================================================ */

const ITEMS = [
  {
    id: "natural",
    label: "100% Natural",
    Icon: BadgeCheck,
  },
  {
    id: "shipping",
    label: "Free Shipping above ₹499",
    Icon: Truck,
  },
  {
    id: "payments",
    label: "Secure Payments",
    Icon: ShieldCheck,
  },
  {
    id: "returns",
    label: "Easy Returns",
    Icon: RotateCcw,
  },
];

export default function UtilityBar() {
  return (
    <div
      className="aumveda-utility-bar"
      aria-label="AUMVEDA shopping benefits"
    >
      <div className="aumveda-utility-bar__inner">
        {ITEMS.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`aumveda-utility-bar__item aumveda-utility-bar__item--${id}`}
          >
            <Icon
              size={14}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
