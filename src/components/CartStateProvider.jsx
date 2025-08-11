import React, { useState } from 'react';
import HeaderWrapper from './HeaderWrapper';
import CartWrapper from './CartWrapper';
import HomeWrapper from './HomeWrapper';
import { CartAnimation } from '../context/CartContext';
import { Toaster } from 'react-hot-toast';

const CartStateProvider = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <CartWrapper isOpen={isCartOpen} setIsOpen={setIsCartOpen} />
      <HeaderWrapper setIsOpen={setIsCartOpen} />
      <HomeWrapper />
      <CartAnimation />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </>
  );
};

export default CartStateProvider;
