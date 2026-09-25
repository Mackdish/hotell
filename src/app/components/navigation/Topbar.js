"use client";

import { CalendarDays, Search, Bell } from "lucide-react";
import { defaultUser } from "@/data/user";

export default function Topbar() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="topbar">
      <div className="mobile-brand">
        <span className="brand-mark">+</span>plate<span className="brand-dot">.</span>
      </div>
      
      <div className="date-label">
        <CalendarDays size={16} /> {formattedDate}
      </div>
      
      <div className="top-actions">
        <button className="icon-button" aria-label="Search">
          <Search size={19} />
        </button>
        <button className="icon-button notification" aria-label="Notifications">
          <Bell size={19} />
          <span />
        </button>
        <div className="profile-avatar">{defaultUser.initials}</div>
      </div>
    </header>
  );
}