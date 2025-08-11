import React, { useState, useEffect } from "react";
import DonationCart from "./CheckoutPage/DonationCart";
import GiftAidAndPersonalInfo from "./CheckoutPage/GiftAidAndPersonalInfo";
import StepIndicator from "./CheckoutPage/StepIndicator";
import { fetchCountriesList } from "../api/countiesApi";
import { encryptData, generateReferenceId } from "../utils/functions";
import { cartTransaction, updateParticipant } from "../api/cartApi";
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

const Checkout = () => {
  const { user, isAuthenticated } = useAuth();
  const cartData = JSON.parse(localStorage.getItem('cart')) || [];
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

  const stripePromise = loadStripe(import.meta.env.ASTRO_STRIPE_PUBLISH_KEY);
  const session = useSessionId();

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

  const handleNext = () => {
    if (step < 3) {
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
            onNext={handleNext}
            countries={countries}
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>Complete Payment</span>
              </button>
            </div>

            {paymentGateway === "stripe" ? (
              <Elements stripe={stripePromise}>
                <StripePayment
                  cartData={cartData}
                  personalInfo={donation.personalInfo}
                  preferences={preferences}
                  participantNames={participantNames}
                  reference_no={reference_no}
                />
              </Elements>
            ) : (
              <PayPalPayment
                cartData={cartData}
                personalInfo={donation.personalInfo}
                preferences={preferences}
                participantNames={participantNames}
                reference_no={reference_no}
              />
            )}
          </div>
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
