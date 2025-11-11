'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatUserName } from '@/lib/utils/user';
import { useState } from 'react';

export function Header() {
  const { isAuthenticated, profile, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">WV</span>
            </div>
            <span className="font-semibold text-lg text-secondary">Waremme Volley</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {!loading && (
              <>
                {isAuthenticated ? (
                  <>
                    <Link href="/" className="text-gray-700 hover:text-primary transition-colors font-medium">
                      Événements
                    </Link>
                    <Link href="/templates" className="text-gray-700 hover:text-primary transition-colors font-medium">
                      Modèles
                    </Link>
                        <Link href="/teams" className="text-gray-700 hover:text-primary transition-colors font-medium">
                          Équipes
                        </Link>
                        <Link href="/users" className="text-gray-700 hover:text-primary transition-colors font-medium">
                          Utilisateurs
                        </Link>
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                      <span className="text-gray-600 text-sm">
                        {formatUserName(profile)}
                      </span>
                      <button
                        onClick={signOut}
                        className="btn-secondary text-sm py-1.5 px-3"
                      >
                        Déconnexion
                      </button>
                    </div>
                  </>
                ) : (
                  <Link href="/login" className="btn-primary text-sm">
                    Connexion
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="md:hidden pb-4 border-t border-gray-200 mt-2 pt-4 space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Événements
            </Link>
            <Link
              href="/templates"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Modèles
            </Link>
                <Link
                  href="/teams"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Équipes
                </Link>
                <Link
                  href="/users"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Utilisateurs
                </Link>
                <div className="px-4 py-2 border-t border-gray-200 mt-2 pt-2">
              <div className="text-sm text-gray-600 mb-2">
                {formatUserName(profile)}
              </div>
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="btn-secondary w-full text-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}


