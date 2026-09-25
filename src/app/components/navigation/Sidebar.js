"use client";

import { ChevronRight, Clock3, ArrowRight, Home as HomeIcon, ReceiptText, UserRound, Utensils } from "lucide-react";
import { defaultUser } from "@/data/user";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useOrder } from "@/lib/OrderContext";

const navItems = [
  { label: "Today", icon: HomeIcon, href: "/" },
  { label: "Menu", icon: Utensils, href: "/menu" },
  { label: "Orders", icon: ReceiptText, href: "/orders" },
  { label: "Profile", icon: UserRound, href: "/profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { getActiveOrders } = useOrder();
  const activeOrdersCount = getActiveOrders().length;

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark">+</span>
        <span>plate<span className="brand-dot">.</span></span>
      </Link>
      
      <div className="campus-switcher">
        <span className="campus-avatar">{defaultUser.initials}</span>
        <span>
          <b>{defaultUser.institution} · {defaultUser.campus}</b>
          <small>Student kitchen</small>
        </span>
        <ChevronRight size={15} />
      </div>
      
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map(({ label, icon: Icon, href }) => (
          <Link 
            href={href}
            className={pathname === href ? "nav-link active" : "nav-link"} 
            key={label}
          >
            <Icon size={18} />
            <span>{label}</span>
            {label === "Orders" && activeOrdersCount > 0 && <i>{activeOrdersCount}</i>}
          </Link>
        ))}
      </nav>
      
      <div className="sidebar-note">
        <span className="note-icon"><Clock3 size={17} /></span>
        <p>
          <b>Order before the rush</b>
          <br />We prepare what students choose.
        </p>
      </div>
      
      <button className="help-link">
        Need a hand? <ArrowRight size={15} />
      </button>
    </aside>
  );
}