"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/",            label: "Dashboard"   },
  { href: "/calibration", label: "Calibration" },
  { href: "/latency",     label: "Latency"     },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 px-4 py-2 border-b border-white/5 bg-background">
      {TABS.map(({ href, label }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`font-mono text-xs px-3 py-1.5 rounded-sm transition-colors ${
              active
                ? "bg-secondary text-primary"
                : "text-neutral hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
