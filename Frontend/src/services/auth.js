// src/services/auth.js
import {
    registerUser,
    loginUser,
    logoutUser,
    getUserData,
    updateUserPassword,
    updateUserPremiumStatus
  } from './firebase';

  /** Map Firebase/auth errors to user-facing messages (including 400 from signUp) */
  export function getAuthErrorMessage(error) {
    const code = error?.code || '';
    const message = error?.message || '';
    if (code === 'auth/configuration-not-found' || message.includes('configuration-not-found')) {
      return (
        'Auth is not set up for this domain. Add this site\'s URL in Firebase Console → ' +
        'Authentication → Authorized domains (e.g. your Vercel domain or localhost).'
      );
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized for sign-in. Add it in Firebase Console → Authentication → Authorized domains.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method → Email/Password.';
    }
    if (code === 'auth/email-already-in-use') return 'An account with this email already exists.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters (Firebase requirement).';
    if (code === 'auth/user-not-found' || message.includes('User not found')) return 'User not found.';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Invalid username or password.';
    return error?.message || 'Something went wrong. Please try again.';
  }
  
  // Authentication service functions
  export const signUp = async (username, email, password) => {
    try {
      const result = await registerUser(username, email, password);
      return result;
    } catch (error) {
      throw Object.assign(error, { message: getAuthErrorMessage(error) });
    }
  };
  
  export const signIn = async (username, password) => {
    try {
      const result = await loginUser(username, password);
      return result;
    } catch (error) {
      throw Object.assign(error, { message: getAuthErrorMessage(error) });
    }
  };
  
  export const signOut = async () => {
    try {
      await logoutUser();
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  export const getCurrentUser = async (uid) => {
    try {
      const userData = await getUserData(uid);
      return userData;
    } catch (error) {
      throw error;
    }
  };
  
  export const resetPassword = async (email) => {
    try {
      await updateUserPassword(email);
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  export const upgradeToPremium = async (uid) => {
    try {
      await updateUserPremiumStatus(uid, true);
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  export const downgradeFromPremium = async (uid) => {
    try {
      await updateUserPremiumStatus(uid, false);
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  // Check if user is premium
  export const isPremiumUser = (userData) => {
    return userData?.isPremium === true;
  };
  
  // Check if user has reached query limit
  export const hasReachedQueryLimit = (userData) => {
    if (isPremiumUser(userData)) {
      return false;
    }
    
    return userData?.dailyQueries >= 20;
  };