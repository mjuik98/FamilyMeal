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
        <span>홈</span>
      </Link>

      <Link href="/add" className="nav-item-center">
        <div className={`nav-add-btn ${isActive('/add') ? 'active' : ''}`}>
          <PlusCircle size={26} strokeWidth={2} />
        </div>
        <span className={isActive('/add') ? 'active-label' : ''}>작성</span>
      </Link>

      <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <div className={`nav-icon-wrap ${isActive('/profile') ? 'nav-icon-active' : ''}`}>
          <User size={22} strokeWidth={isActive('/profile') ? 2.2 : 1.8} fill={isActive('/profile') ? 'currentColor' : 'none'} />
        </div>
        <span>프로필</span>
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
          gap: 4px;
          flex: 1;
          height: 100%;
          transition: color 0.2s;
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
          color: var(--muted-foreground);
        }
        .nav-icon-active {
          background: var(--primary);
          color: white;
        }
        .nav-item-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 500;
          gap: 4px;
          flex: 1;
          height: 100%;
          color: var(--muted-foreground);
        }
        .nav-add-btn {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -20px;
          box-shadow: 0 4px 12px rgba(107, 142, 35, 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .nav-add-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(107, 142, 35, 0.45);
        }
        .nav-add-btn.active {
          background: var(--primary-light);
        }
        .active-label {
          color: var(--primary);
          font-weight: 600;
        }
      `}</style>
    </nav>
  );
}
