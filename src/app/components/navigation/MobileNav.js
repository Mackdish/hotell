"use client";

import { Home as HomeIcon, ReceiptText, UserRound, Utensils } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useOrder } from "@/lib/OrderContext";

const navItems = [
  { label: "Today", icon: HomeIcon, href: "/" },
  { label: "Menu", icon: Utensils, href: "/menu" },
  { label: "Orders", icon: ReceiptText, href: "/orders" },
  { label: "Profile", icon: UserRound, href: "/profile" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { getActiveOrders } = useOrder();
  const activeOrdersCount = getActiveOrders().length;

  return (
    <nav className="mobile-nav">
      {navItems.map(({ label, icon: Icon, href }) => (
        <Link 
          href={href}
          className={pathname === href ? "mobile-nav-link active" : "mobile-nav-link"} 
          key={label}
        >
          <Icon size={20} />
          <span>{label}</span>
          {label === "Orders" && activeOrdersCount > 0 && <i>{activeOrdersCount}</i>}
        </Link>
      ))}
    </nav>
  );
}