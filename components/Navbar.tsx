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
        <Home size={24} />
        <span>홈</span>
      </Link>

      <Link href="/add" className={`nav-item ${isActive('/add') ? 'active' : ''}`}>
        <PlusCircle size={24} />
        <span>작성</span>
      </Link>

      <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <User size={24} />
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
          height: 70px;
          background: var(--card);
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
          font-size: 0.75rem;
          gap: 4px;
          flex: 1;
          height: 100%;
        }
        .nav-item.active {
          color: var(--primary);
        }
      `}</style>
    </nav>
  );
}
