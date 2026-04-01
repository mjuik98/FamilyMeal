"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User } from "lucide-react";

import { useUser } from "@/context/UserContext";

export default function Navbar() {
  const pathname = usePathname();
  const { userProfile } = useUser();

  if (!userProfile?.role) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="navbar" data-testid="bottom-dock">
      <Link
        href="/"
        data-testid="bottom-dock-home"
        className={`nav-item ${isActive("/") ? "active" : ""}`}
      >
        <div className={`nav-icon-wrap ${isActive("/") ? "nav-icon-active" : ""}`}>
          <Home
            size={22}
            strokeWidth={isActive("/") ? 2.2 : 1.8}
            fill={isActive("/") ? "currentColor" : "none"}
          />
        </div>
        <span className="nav-label">홈</span>
      </Link>

      <Link
        href="/add"
        data-testid="bottom-dock-add"
        className={`nav-item ${isActive("/add") ? "active" : ""}`}
      >
        <div className={`nav-icon-wrap ${isActive("/add") ? "nav-icon-active" : ""}`}>
          <PlusCircle
            size={22}
            strokeWidth={isActive("/add") ? 2.2 : 1.8}
            fill={isActive("/add") ? "currentColor" : "none"}
          />
        </div>
        <span className="nav-label">작성</span>
      </Link>

      <Link
        href="/profile"
        data-testid="bottom-dock-profile"
        className={`nav-item ${isActive("/profile") ? "active" : ""}`}
      >
        <div className={`nav-icon-wrap ${isActive("/profile") ? "nav-icon-active" : ""}`}>
          <User
            size={22}
            strokeWidth={isActive("/profile") ? 2.2 : 1.8}
            fill={isActive("/profile") ? "currentColor" : "none"}
          />
        </div>
        <span className="nav-label">프로필</span>
      </Link>
    </nav>
  );
}
