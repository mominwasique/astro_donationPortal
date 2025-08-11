import React, { useEffect, useState, useCallback } from "react";
import ItemCard from "./ItemCard";
import { deleteFromCart, getCart, updateCart } from "../../api/cartApi";
import useSessionId from "../../hooks/useSessionId";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { ShoppingCart, AlertCircle, Loader2, ChevronRight, Info, User, Users } from "lucide-react";
import { motion } from "framer-motion";

const DonationCart = ({ setCart, participantNames, setParticipantNames, onNext }) => {
  const sessionId = useSessionId();
  const { user, isAuthenticated } = useAuth();
  const [selfDonateItems, setSelfDonateItems] = useState({});
  const [guestName, setGuestName] = useState("");
  const [applyToAllItems, setApplyToAllItems] = useState(false);

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        let cartData;
        if (isAuthenticated && user?.user_id) {
          cartData = await getCart({ donor_id: user.user_id, session_id: '' });
        } else if (sessionId) {
          cartData = await getCart({ session_id: sessionId, donor_id: '' });
        } else {
          cartData = [];
        }
        setData(cartData);
      } catch (error) {
        setIsError(true);
        console.error('Error fetching cart:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, user?.user_id, sessionId]);

  // Update cart in localStorage and parent component
  useEffect(() => {
    if (data.length > 0) {
      localStorage.setItem("cart", JSON.stringify(data));
      setCart(data);
    }
  }, [data, setCart]);

  // Initialize participant names when cart changes
  useEffect(() => {
    if (data.length > 0) {
      const initialNames = {};
      const initialSelfDonate = {};
      data.forEach((item) => {
        if (!initialNames[item.cart_id]) {
          const totalParticipants = item.quantity * (item.animal_share || 1);
          initialSelfDonate[item.cart_id] = isAuthenticated && user?.first_name ? true : false;
          if (initialSelfDonate[item.cart_id]) {
            initialNames[item.cart_id] = Array(totalParticipants).fill(user.first_name);
          } else {
            initialNames[item.cart_id] = Array(totalParticipants).fill("");
          }
        }
      });
      setParticipantNames(initialNames);
      setSelfDonateItems(initialSelfDonate);
    }
  }, [data, isAuthenticated, user?.first_name]);

  const handleParticipantNameChange = useCallback((itemId, index, value) => {
    setParticipantNames((prev) => {
      const updated = { ...prev };
      if (!updated[itemId]) {
        updated[itemId] = Array(1).fill("");
      }
      updated[itemId][index] = value;
      return updated;
    });
  }, []);

  // New function to apply guest name to all participant fields
  const applyGuestNameToAll = useCallback(() => {
    if (!guestName.trim()) {
      toast.error("Please enter a name first");
      return;
    }

    if (applyToAllItems) {
      // Apply to all items in cart
      const updatedNames = {};
      data.forEach(item => {
        if (item.participant_required === "Y") {
          const totalParticipants = item.quantity * (item.animal_share || 1);
          updatedNames[item.cart_id] = Array(totalParticipants).fill(guestName);
        }
      });
      setParticipantNames(prev => ({ ...prev, ...updatedNames }));
      
    } else {
      // Apply to empty fields only
      setParticipantNames(prev => {
        const updated = { ...prev };
        data.forEach(item => {
          if (item.participant_required === "Y") {
            if (!updated[item.cart_id]) {
              const totalParticipants = item.quantity * (item.animal_share || 1);
              updated[item.cart_id] = Array(totalParticipants).fill(guestName);
            } else {
              updated[item.cart_id] = updated[item.cart_id].map(name =>
                name.trim() ? name : guestName
              );
            }
          }
        });
        return updated;
      });
    }

    toast.success("Name applied successfully!");
  }, [guestName, applyToAllItems, data]);

  const updateQuantity = useCallback(async (id, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      toast.loading("Updating cart...");
      await updateCart({ id, newQuantity });
      toast.dismiss();
      toast.success("Cart updated successfully!");
      
      // Refetch cart data
      const fetchCart = async () => {
        try {
          let cartData;
          if (isAuthenticated && user?.user_id) {
            cartData = await getCart({ donor_id: user.user_id, session_id: '' });
          } else if (sessionId) {
            cartData = await getCart({ session_id: sessionId, donor_id: '' });
          } else {
            cartData = [];
          }
          setData(cartData);
        } catch (error) {
          console.error('Error fetching cart:', error);
        }
      };
      fetchCart();
    } catch (error) {
      toast.dismiss();
      toast.error(`Error updating cart: ${error.message}`);
    }

    const item = data.find(item => item.cart_id === id);
    const totalParticipants = newQuantity * (item?.animal_share || 1);

    setParticipantNames((prev) => {
      const updated = { ...prev };
      updated[id] = Array(totalParticipants).fill("");
      return updated;
    });
  }, [data, isAuthenticated, user?.user_id, sessionId]);

  const removeItem = useCallback(async (cartId) => {
    try {
      toast.loading("Removing item...");
      await deleteFromCart(cartId);
      toast.dismiss();
      toast.success("Item removed from cart");
      
      // Refetch cart data
      const fetchCart = async () => {
        try {
          let cartData;
          if (isAuthenticated && user?.user_id) {
            cartData = await getCart({ donor_id: user.user_id, session_id: '' });
          } else if (sessionId) {
            cartData = await getCart({ session_id: sessionId, donor_id: '' });
          } else {
            cartData = [];
          }
          setData(cartData);
        } catch (error) {
          console.error('Error fetching cart:', error);
        }
      };
      fetchCart();
    } catch (error) {
      toast.dismiss();
      toast.error(`Error removing item: ${error.message}`);
    }
    
    setParticipantNames((prev) => {
      const updated = { ...prev };
      delete updated[cartId];
      return updated;
    });
  }, [isAuthenticated, user?.user_id, sessionId]);



  const getTotalAmount = useCallback(() => {
    return data.reduce((sum, item) => sum + item.donation_amount * item.quantity, 0);
  }, [data]);

  // Check if all required participant names are filled
  const areAllParticipantNamesFilled = useCallback(() => {
    for (const item of data) {
      if (item.participant_required === "Y") {
        const names = participantNames[item.cart_id] || [];
        if (names.some(name => !name.trim())) {
          return false;
        }
      }
    }
    return true;
  }, [data, participantNames]);

  // Calculate total number of participant fields needed
  const totalParticipantFields = useCallback(() => {
    return data.reduce((sum, item) => {
      if (item.participant_required === "Y") {
        return sum + (item.quantity * (item.animal_share || 1));
      }
      return sum;
    }, 0);
  }, [data]);

  // Calculate filled participant fields
  const filledParticipantFields = useCallback(() => {
    let filled = 0;
    data.forEach(item => {
      if (item.participant_required === "Y") {
        const names = participantNames[item.cart_id] || [];
        filled += names.filter(name => name.trim()).length;
      }
    });
    return filled;
  }, [data, participantNames]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Your Donation Cart
          </h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={`skeleton-${index}`} className="animate-pulse space-y-2 p-4 border border-gray-100 rounded-lg">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              <div className="h-8 bg-gray-100 rounded w-1/4 mt-4"></div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Your Donation Cart
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-red-500">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="text-lg font-medium">Error loading the cart</p>
          <p className="text-sm text-gray-500 mt-2">Please try again later</p>
        </div>
      </motion.div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-black flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Your Donation Cart
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <ShoppingCart className="w-12 h-12 mb-4" />
          <p className="text-lg font-medium">Your cart is empty</p>
          <p className="text-sm mt-2">Add some items to your cart to continue</p>
          <p className="text-xl mt-2">↓</p>
        </div>
      </motion.div>
    );
  }

  // Check if there are any items that require participant names
  const hasParticipantRequiredItems = data.some(item => item.participant_required === "Y");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-black flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Your Donation Cart
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {data.length} {data.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Quick Participant Name Entry for Guest Users */}
      {!isAuthenticated && hasParticipantRequiredItems && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-primary/10 border-l-4 border-l-primary rounded-lg">
          <div className="flex items-start">
            <div className="bg-secondary/10 p-2 rounded-full mr-3">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-medium text-primary">Quick Participant Name Entry</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-3">
            <div className="flex-grow">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-primary/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
              />
            </div>
            <button
              onClick={applyGuestNameToAll}
              disabled={!guestName.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:bg-primary/30 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <span>Apply Name</span>
              <Users className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center">
            <input
              type="checkbox"
              id="apply-to-all"
              checked={applyToAllItems}
              onChange={(e) => setApplyToAllItems(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <label htmlFor="apply-to-all" className="ml-2 text-sm text-gray-600">
              Apply to all fields (overwrite existing names)
            </label>
          </div>

          {hasParticipantRequiredItems && (
            <div className="mt-3 flex items-center text-sm text-gray-600">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary h-2.5 rounded-full"
                  style={{ width: `${Math.min(100, (filledParticipantFields() / totalParticipantFields()) * 100)}%` }}
                ></div>
              </div>
              <span className="ml-2 whitespace-nowrap">
                {filledParticipantFields()}/{totalParticipantFields()} filled
              </span>
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-6">
        {data.map((item, index) => (
          <motion.div
            key={item.cart_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="border border-primary rounded-lg p-4  transition-colors hover:shadow-sm"
          >
            <ItemCard
              isLoading={quantityMutation.isPending || deleteMutation.isPending}
              item={item}
              updateQuantity={updateQuantity}
              removeItem={removeItem}
              showParticipantInput={true}
            />

            {/* Self Donate Option */}
            {isAuthenticated && item.participant_required === "Y" && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selfDonateItems[item.cart_id] || false}
                    onChange={(e) => {
                      setSelfDonateItems(prev => ({
                        ...prev,
                        [item.cart_id]: e.target.checked
                      }));
                      if (e.target.checked && user?.first_name) {
                        setParticipantNames(prev => ({
                          ...prev,
                          [item.cart_id]: Array(item.quantity * (item.animal_share || 1)).fill(user.first_name)
                        }));
                      } else {
                        setParticipantNames(prev => ({
                          ...prev,
                          [item.cart_id]: Array(item.quantity * (item.animal_share || 1)).fill("")
                        }));
                      }
                    }}
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Donate on behalf of myself</span>
                </label>
              </div>
            )}

            {/* Participant Name Inputs */}
            {item.participant_required === "Y" && !selfDonateItems[item.cart_id] && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <label className="block font-medium text-gray-700">
                    Participant Names <span className="text-red-500">*</span>
                  </label>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Please enter the names of all participants for this donation.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: item.quantity * (item.animal_share || 1) }).map((_, index) => (
                    <div key={`${item.cart_id}-participant-${index}`} className="relative">
                      <input
                        type="text"
                        value={participantNames[item.cart_id]?.[index] || ""}
                        onChange={(e) =>
                          handleParticipantNameChange(item.cart_id, index, e.target.value)
                        }
                        placeholder={`Participant ${index + 1}`}
                        className={`w-full px-4 py-2 border ${participantNames[item.cart_id]?.[index]
                          ? 'border-primary focus:ring-primary/50'

                          : 'border-gray-300 focus:ring-primary/20'
                          } rounded-lg focus:ring-2 focus:border-primary outline-none transition-colors`}
                      />
                      {participantNames[item.cart_id]?.[index] && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Copy Button for individual items */}
                {!isAuthenticated && guestName.trim() && (
                  <button
                    onClick={() => {
                      const totalParticipants = item.quantity * (item.animal_share || 1);
                      setParticipantNames(prev => ({
                        ...prev,
                        [item.cart_id]: Array(totalParticipants).fill(guestName)
                      }));
                      toast.success(`Applied name to this item`);
                    }}
                    className="mt-3 text-sm text-primary hover:text-p flex items-center gap-1"
                  >
                    <User className="w-3 h-3" />
                    <span>Apply "{guestName}" to all fields in this item</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-primary">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Items: {data.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total Amount:</p>
          </div>
          <p className="text-2xl font-bold text-primary">
            £{getTotalAmount().toFixed(2)}
          </p>
        </div>
      </div>

      {!areAllParticipantNamesFilled() && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <p className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Please fill in all participant names before proceeding.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DonationCart;