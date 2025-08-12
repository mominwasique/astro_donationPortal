import { motion } from 'framer-motion';
import { ChevronRight, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteFromCart, getCart, updateCart } from '../api/cartApi';
import useSessionId from '../hooks/useSessionId';
import { useAuth } from '../context/AuthContext';

// Cart Component
const Cart = ({ isOpen, onClose }) => {
  const sessionId = useSessionId();
  const { user, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = async () => {
    setIsLoading(true);
    try {
      let data;
      if (isAuthenticated && user?.user_id) {
        data = await getCart({ donor_id: user.user_id, session_id: '' });
      } else {
        data = sessionId ? await getCart({ session_id: sessionId, donor_id: '' }) : [];
      }
      setCartItems(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen, isAuthenticated, user?.user_id, sessionId]);

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      toast.loading("Updating cart...");
      await updateCart({ id, newQuantity });
      toast.dismiss();
      toast.success("Cart updated successfully!");
      fetchCart();
    } catch (error) {
      toast.dismiss();
      toast.error(`Error updating cart: ${error.message}`);
    }
  };

  const handleDelete = async (cartId) => {
    try {
      toast.loading("Removing item...");
      await deleteFromCart(cartId);
      toast.dismiss();
      toast.success("Item removed from cart");
      fetchCart();
    } catch (error) {
      toast.dismiss();
      toast.error(`Error removing item: ${error.message}`);
    }
  };

  return (
    <CartSidebar
      isOpen={isOpen}
      onClose={onClose}
      cartItems={cartItems}
      isLoading={isLoading}
      updateQuantity={updateQuantity}
      onDelete={handleDelete}
    />
  );
};

// Sidebar Component
const CartSidebar = ({ isOpen, onClose, cartItems, updateQuantity, onDelete, isLoading }) => {
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.amount * item.quantity), 0);
  };

  const handleCheckout = () => {
    window.location.href = '/checkout';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      )}

      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <ShoppingCart className="w-6 h-6 mr-2" />
              Shopping Cart
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonLoader key={i} />
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onDelete={onDelete}
                  />
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-semibold">£{calculateTotal().toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  Proceed to Checkout
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
};

// Cart Item Component
const CartItem = ({ item, onUpdateQuantity, onDelete }) => {
  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium">{item.title || 'Donation Item'}</h3>
        <p className="text-sm text-gray-600">£{item.amount}</p>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// Skeleton Loader
const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="h-20 bg-gray-200 rounded-lg"></div>
  </div>
);

export default Cart;