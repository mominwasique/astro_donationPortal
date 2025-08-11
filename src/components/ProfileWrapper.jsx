import React from 'react';
import Profile from './Profile';
import { AuthProvider } from '../context/AuthContext';

const ProfileWrapper = () => {
  return (
    <AuthProvider>
      <Profile />
    </AuthProvider>
  );
};

export default ProfileWrapper;
