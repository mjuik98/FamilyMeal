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
    <nav className="navbar" data-testid="bottom-dock">
      <Link href="/" data-testid="bottom-dock-home" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <div className={`nav-icon-wrap ${isActive('/') ? 'nav-icon-active' : ''}`}>
          <Home size={22} strokeWidth={isActive('/') ? 2.2 : 1.8} fill={isActive('/') ? 'currentColor' : 'none'} />
        </div>
        <span className="nav-label">홈</span>
      </Link>

      <Link
        href="/add"
        data-testid="bottom-dock-add"
        className={`nav-item nav-item-primary ${isActive('/add') ? 'active' : ''}`}
      >
        <div className={`nav-icon-wrap nav-icon-wrap-primary ${isActive('/add') ? 'nav-icon-active' : ''}`}>
          <PlusCircle size={22} strokeWidth={isActive('/add') ? 2.2 : 1.8} fill={isActive('/add') ? 'currentColor' : 'none'} />
        </div>
        <span className="nav-label">작성</span>
      </Link>

      <Link href="/profile" data-testid="bottom-dock-profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <div className={`nav-icon-wrap ${isActive('/profile') ? 'nav-icon-active' : ''}`}>
          <User size={22} strokeWidth={isActive('/profile') ? 2.2 : 1.8} fill={isActive('/profile') ? 'currentColor' : 'none'} />
        </div>
        <span className="nav-label">프로필</span>
      </Link>
      <style jsx>{`
        .navbar {
          position: fixed;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 20px);
          max-width: 448px;
          min-height: 78px;
          padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(232, 232, 224, 0.94);
          border-radius: 26px;
          box-shadow: 0 20px 44px rgba(35, 37, 28, 0.16);
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 80;
        }
        .nav-item {
          display: grid;
          grid-template-rows: 38px 16px;
          justify-items: center;
          align-content: center;
          color: var(--muted-foreground);
          font-size: 0.7rem;
          font-weight: 600;
          row-gap: 4px;
          flex: 1;
          height: 100%;
          min-height: 60px;
          padding: 6px 0;
          transition: color 0.2s, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-item-primary {
          transform: translateY(-8px);
        }
        .nav-item:active {
          transform: scale(0.92);
        }
        .nav-item-primary:active {
          transform: translateY(-8px) scale(0.92);
        }
        .nav-item.active {
          color: var(--foreground);
          font-weight: 700;
        }
        .nav-icon-wrap {
          width: 44px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: inherit;
        }
        .nav-icon-wrap-primary {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: linear-gradient(140deg, #5f7d21 0%, #87aa35 100%);
          color: white;
          box-shadow: 0 16px 28px rgba(107, 142, 35, 0.3);
        }
        .nav-icon-active {
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
          color: white;
          box-shadow: 0 8px 20px rgba(107, 142, 35, 0.22);
        }
        .nav-item-primary.active .nav-icon-wrap-primary {
          box-shadow: 0 18px 32px rgba(107, 142, 35, 0.36);
        }
        .nav-label {
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1.1;
          white-space: nowrap;
        }
      `}</style>
    </nav>
  );
}
