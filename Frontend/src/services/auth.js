// src/services/auth.js
import {
    registerUser,
    loginUser,
    logoutUser,
    getUserData,
    updateUserPassword,
    updateUserPremiumStatus
  } from './firebase';
  
  // Authentication service functions
  export const signUp = async (username, email, password) => {
    try {
      const result = await registerUser(username, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  };
  
  export const signIn = async (username, password) => {
    try {
      const result = await loginUser(username, password);
      return result;
    } catch (error) {
      throw error;
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