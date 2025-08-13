import React, { useState, useEffect } from "react";
import DonationCart from "./CheckoutPage/DonationCart";
import GiftAidAndPersonalInfo from "./CheckoutPage/GiftAidAndPersonalInfo";
import StepIndicator from "./CheckoutPage/StepIndicator";
import { fetchCountriesList } from "../api/countiesApi";
import { encryptData, generateReferenceId } from "../utils/functions";
import { cartTransaction, updateParticipant, getCart } from "../api/cartApi";
import useSessionId from "../hooks/useSessionId";
import StripePayment from "./CheckoutPage/StripePayment";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import PayPalPayment from "./CheckoutPage/PayPalPayment";
import { requiredFields } from "../utils/data";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ShoppingBag, CreditCard, User, Loader2 } from "lucide-react";
import { addNewAddress, getDonorAddress } from "../api/donationApi";
import ErrorBoundary from "./ErrorBoundary";
const Checkout = () => {
  const { user, isAuthenticated } = useAuth();
  const sessionId = useSessionId();
  const [cartData, setCartData] = useState([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const donorId = user?.user_id || JSON.parse(localStorage.getItem('user'))?.user_id;
  const [step, setStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [preferences, setPreferences] = useState({
    giftAid: false,
    email: false,
    phone: false,
    post: false,
    sms: false,
  });
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [reference_no, setReference_no] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("stripe");
  const [donation, setDonation] = useState({
    personalInfo: {
      title: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    }
  });
  const [participantNames, setParticipantNames] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cart, setCart] = useState([]);
  const [countries, setCountries] = useState([]);
  const [addressData, setAddressData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const stripePromise = loadStripe('pk_test_51OpqyISCpAlqBVLzSBLMsm0w76Fvs0TkHkitCp7c5KFFk0DxPpVyU7do8eAJyi2SR4QAFnhNyphoteu9Yd16qswN00dQN0O2Jq');

  // Fetch cart data on component mount
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setIsCartLoading(true);
        let data = [];

        if (isAuthenticated && user?.user_id) {
          data = await getCart({ donor_id: user.user_id, session_id: '' });
        } else if (sessionId) {
          data = await getCart({ session_id: sessionId, donor_id: '' });
        }

        // If API returns no data, try localStorage as fallback
        if (!data || data.length === 0) {
          const localStorageCart = localStorage.getItem('cart');
          if (localStorageCart) {
            try {
              const parsedCart = JSON.parse(localStorageCart);
              data = Array.isArray(parsedCart) ? parsedCart : [parsedCart];
            } catch (parseError) {
              console.error('Error parsing localStorage cart:', parseError);
            }
          }
        }

        setCartData(data || []);
        setCart(data || []);

        // Store in localStorage for backward compatibility
        if (data && data.length > 0) {
          localStorage.setItem('cart', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error fetching cart:', error);

        // Try localStorage as fallback
        const localStorageCart = localStorage.getItem('cart');
        if (localStorageCart) {
          try {
            const parsedCart = JSON.parse(localStorageCart);
            const fallbackData = Array.isArray(parsedCart) ? parsedCart : [parsedCart];
            setCartData(fallbackData);
            setCart(fallbackData);
          } catch (parseError) {
            console.error('Error parsing localStorage cart:', parseError);
            setCartData([]);
            setCart([]);
          }
        } else {
          setCartData([]);
          setCart([]);
        }

        toast.error('Failed to load cart data from server, using cached data');
      } finally {
        setIsCartLoading(false);
      }
    };

    fetchCartData();
  }, [isAuthenticated, user?.user_id, sessionId]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await fetchCountriesList();
        setCountries(countriesData);
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };

    const loadAddressData = async () => {
      if (donorId) {
        try {
          const address = await getDonorAddress(donorId);
          setAddressData(address);
        } catch (error) {
          console.error("Error loading address:", error);
        }
      }
    };

    loadCountries();
    loadAddressData();
  }, [donorId]);

  const handleNext = async () => {
    if (step === 2) {
      // Validate required fields before proceeding to payment
      const missingFields = requiredFields.filter(field => !donation.personalInfo[field]);
      if (missingFields.length > 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      setIsLoading(true);
      try {
        // Generate reference number if not exists
        if (!reference_no) {
          const newReferenceNo = generateReferenceId();
          setReference_no(newReferenceNo);
        }

        // Create transaction first
        const transactionData = {
          cart_id: cartData[0]?.cart_id,
          donor_id: donorId,
          personal_info: donation.personalInfo,
          preferences: preferences,
          participant_names: participantNames,
          reference_no: reference_no,
        };

        const response = await cartTransaction(transactionData);

        if (response.message === "Cart transaction has been created successfully") {
          setIsPaymentGatewayOpen(true);
          // Proceed to next step which will trigger Stripe
          setStep(3);
        } else {
          toast.error(response.message || 'Transaction failed');
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast.error('Error processing payment');
      } finally {
        setIsLoading(false);
      }
    } else if (step < 3) {
      // Normal step progression for steps before payment
      setIsAnimating(true);
      setTimeout(() => {
        setStep(step + 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(step - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const transactionData = {
        cart_id: cartData[0]?.cart_id,
        donor_id: donorId,
        personal_info: donation.personalInfo,
        preferences: preferences,
        participant_names: participantNames,
        reference_no: reference_no,
      };

      const response = await cartTransaction(transactionData);

      if (response.message === "Cart transaction has been created successfully") {
        toast.dismiss();

        if (cartData.some(item => item.donation_period === 'direct-debit') && cartData.some(item => item.donation_period === 'one-off')) {
          setIsPaymentGatewayOpen(true);
        } else if (cartData.some(item => item.donation_period === 'one-off')) {
          setIsPaymentGatewayOpen(true);
        } else {
          const userData = localStorage.getItem("userData");
          const encryptedData = encryptData(userData);
          window.location.href = `/payment-success?data=${encodeURIComponent(encryptedData)}`;
        }
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error("Error processing transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentStep = () => {
    switch (step) {
      case 1:
        return "cart";
      case 2:
        return "personal-info";
      case 3:
        return "payment";
      default:
        return "cart";
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Review Cart";
      case 2:
        return "Personal Information";
      case 3:
        return "Payment";
      default:
        return "Review Cart";
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 1:
        return <ShoppingBag className="w-6 h-6" />;
      case 2:
        return <User className="w-6 h-6" />;
      case 3:
        return <CreditCard className="w-6 h-6" />;
      default:
        return <ShoppingBag className="w-6 h-6" />;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <DonationCart
            cartData={cartData}
            setCart={setCart}
            participantNames={participantNames}
            setParticipantNames={setParticipantNames}
            onNext={handleNext}
            countries={countries}
            isLoading={isCartLoading}
          />
        );
      case 2:
        return (
          <GiftAidAndPersonalInfo
            donation={donation}
            setDonation={setDonation}
            preferences={preferences}
            setPreferences={setPreferences}
            participantNames={participantNames}
            setParticipantNames={setParticipantNames}
            onNext={handleNext}
            onPrevious={handlePrevious}
            addressData={addressData}
            countries={countries}
          />
        );
      case 3:
        return (
          <Elements stripe={stripePromise}>
            <StripePayment
              cartData={cartData}
              donation={donation}
              setIsPaymentGatewayOpen={setIsPaymentGatewayOpen}
              isPaymentGatewayOpen={isPaymentGatewayOpen}
              personalInfo={donation.personalInfo}
              preferences={preferences}
              participantNames={participantNames}
              reference_no={reference_no}
            />
          </Elements>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">

        <StepIndicator currentStep={step} />

        <div className="mt-8">
          <div className="flex items-center space-x-4 mb-6">
            {getStepIcon()}
            <h1 className="text-2xl font-bold text-gray-900">{getStepTitle()}</h1>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
