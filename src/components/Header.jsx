import React, { useState, useEffect } from 'react';
import useSessionId from '../hooks/useSessionId';
import { LogIn, UserPlus, ShoppingCart, User, LogOut, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCart } from '../api/cartApi';

const Header = ({ setIsOpen }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const sessionId = useSessionId();
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Set current path after component mounts to avoid hydration mismatch
    setCurrentPath(window.location.pathname);
  }, []);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        // Only fetch cart if API base URL is configured
        if (import.meta.env.ASTRO_API_BASE_URL && import.meta.env.ASTRO_API_BASE_URL !== 'https://api.example.com') {
          const cartData = await getCart(isAuthenticated ? user?.user_id : sessionId);
          if (cartData) {
            setCartCount(cartData.length);
          }
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
        // Don't show error to user for API issues
      }
    };

    fetchCart();
  }, [isAuthenticated, user?.user_id, sessionId]);

  const handleCartClick = (e) => {
    e.preventDefault();
    setIsOpen(true);
  };

  const MobileNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-200 py-4 px-6 z-40">
      <div className="flex justify-between items-center bg-white">
        <a
          href="/"
          className={`flex flex-col items-center ${currentPath === '/' ? 'text-primary' : 'text-grey'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-1">Home</span>
        </a>

        {isAuthenticated ? (
          <a
            href="/profile"
            className={`flex flex-col items-center ${currentPath === '/profile' ? 'text-primary' : 'text-grey'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">Profile</span>
          </a>
        ) : (
          <>
            <a
              href="/login"
              className={`flex flex-col items-center ${currentPath === '/login' ? 'text-primary' : 'text-grey'}`}
            >
              <LogIn className="w-5 h-5" />
              <span className="text-[10px] mt-1">Login</span>
            </a>

            <a
              href="/signup"
              className={`flex flex-col items-center ${currentPath === '/signup' ? 'text-primary' : 'text-grey'}`}
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-[10px] mt-1">Signup</span>
            </a>
          </>
        )}

        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center text-grey relative"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] mt-1">Cart</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <header className="w-full bg-white shadow-md z-30">
        <div className="container mx-auto px-4 select-none">
          <div className="flex justify-between items-center py-4">
            <a
              href="/"
              className="flex items-center justify-center"
            >
              <img
                src="/logo-icon.png"
                alt="Al Wahab Foundation Logo"
                className="h-12 md:h-20"
              />
            </a>

            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <a
                    href="/profile"
                    className="group relative p-2 text-grey hover:text-secondary transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Profile
                    </span>
                  </a>
                  <button
                    onClick={logout}
                    className="group relative p-2 text-grey hover:text-secondary transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Logout
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="group relative p-2 text-grey hover:text-secondary transition-colors"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Login
                    </span>
                  </a>
                  <a
                    href="/signup"
                    className="group relative p-2 text-grey hover:text-secondary transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Sign up
                    </span>
                  </a>
                </>
              )}
              <button
                onClick={handleCartClick}
                className="group relative p-2 text-grey hover:text-secondary transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Cart
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <MobileNav />
    </>
  );
};

export default Header;