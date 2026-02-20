"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, User } from 'lucide-react';

import { useUser } from '@/context/UserContext';

export default function Navbar() {
  const pathname = usePathname();
  const { userProfile } = useUser();

  if (!userProfile?.role) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="navbar">
      <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <div className={`nav-icon-wrap ${isActive('/') ? 'nav-icon-active' : ''}`}>
          <Home size={22} strokeWidth={isActive('/') ? 2.2 : 1.8} fill={isActive('/') ? 'currentColor' : 'none'} />
        </div>
        <span className="nav-label">홈</span>
      </Link>

      <Link href="/add" className={`nav-item ${isActive('/add') ? 'active' : ''}`}>
        <div className={`nav-icon-wrap ${isActive('/add') ? 'nav-icon-active' : ''}`}>
          <PlusCircle size={22} strokeWidth={isActive('/add') ? 2.2 : 1.8} fill={isActive('/add') ? 'currentColor' : 'none'} />
        </div>
        <span className="nav-label">작성</span>
      </Link>

      <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <div className={`nav-icon-wrap ${isActive('/profile') ? 'nav-icon-active' : ''}`}>
          <User size={22} strokeWidth={isActive('/profile') ? 2.2 : 1.8} fill={isActive('/profile') ? 'currentColor' : 'none'} />
        </div>
        <span className="nav-label">프로필</span>
      </Link>

      <style jsx>{`
        .navbar {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          height: 72px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-around;
          align-items: center;
          z-index: 50;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--muted-foreground);
          font-size: 0.7rem;
          font-weight: 500;
          gap: 2px;
          flex: 1;
          height: 100%;
          padding: 8px 0;
          transition: color 0.2s, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-item:active {
          transform: scale(0.92);
        }
        .nav-item.active {
          color: var(--foreground);
          font-weight: 700;
        }
        .nav-icon-wrap {
          width: 40px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: inherit;
        }
        .nav-icon-active {
          background: var(--primary);
          color: white;
        }
        .nav-label {
          width: 40px;
          text-align: center;
          line-height: 1.1;
        }
      `}</style>
    </nav>
  );
}
