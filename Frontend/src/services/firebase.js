import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  enableNetwork,
  disableNetwork,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager 
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDGT14SiCyZZeacCUMfvh10ZEVlipHn5PI",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "fyp-dt-1f493.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "fyp-dt-1f493",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "fyp-dt-1f493.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "134618746457",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:134618746457:web:908ab3c517cedad1d9eb48",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-5BP9YLL94W"
};

// Debug: Log Firebase config to console
console.log("Firebase Config:", firebaseConfig);

// Initialize Firebase with error handling
let app, auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Fallback configuration
  const fallbackConfig = {
    apiKey: "AIzaSyDGT14SiCyZZeacCUMfvh10ZEVlipHn5PI",
    authDomain: "fyp-dt-1f493.firebaseapp.com",
    projectId: "fyp-dt-1f493",
    storageBucket: "fyp-dt-1f493.firebasestorage.app",
    messagingSenderId: "134618746457",
    appId: "1:134618746457:web:908ab3c517cedad1d9eb48",
    measurementId: "G-5BP9YLL94W"
  };
  app = initializeApp(fallbackConfig);
  auth = getAuth(app);
  console.log("Firebase initialized with fallback config");
}

// Initialize Firestore with explicit settings to prevent "Unexpected state" errors
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager()
  })
});

// Network connection handling
export const connectFirestore = async () => {
  try {
    await enableNetwork(db);
    console.log('Firestore network connection enabled');
  } catch (error) {
    console.error('Error enabling Firestore network:', error);
  }
};

export const disconnectFirestore = async () => {
  try {
    await disableNetwork(db);
    console.log('Firestore network connection disabled');
  } catch (error) {
    console.error('Error disabling Firestore network:', error);
  }
};

// Error handling wrapper for Firestore operations
const handleFirestoreError = async (operation) => {
  try {
    // Only enable network if it's expected to be connected
    return await operation();
  } catch (error) {
    console.error('Firestore operation failed:', error);
    
    // If error is related to connectivity or state issues, try reconnecting
    if (error.message && (
        error.message.includes('INTERNAL ASSERTION FAILED') || 
        error.message.includes('network error') || 
        error.message.includes('operation was rejected')
      )) {
      try {
        await enableNetwork(db);
        return await operation();
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
};

// User authentication functions
export const registerUser = async (username, email, password) => {
  return handleFirestoreError(async () => {
    // Check if username already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error("Username already exists");
    }
    
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Add user to Firestore
    await setDoc(doc(db, "users", user.uid), {
      username,
      email,
      isPremium: false,
      dailyQueries: 0,
      lastQueryDate: new Date().toISOString().split('T')[0],
      uid: user.uid
    });
    
    return { user };
  });
};

export const loginUser = async (username, password) => {
  return handleFirestoreError(async () => {
    // Find user by username
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("User not found");
    }
    
    const userData = querySnapshot.docs[0].data();
    
    // Login with email and password
    const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
    const user = userCredential.user;
    
    // Reset daily queries if it's a new day
    const today = new Date().toISOString().split('T')[0];
    const userDocRef = doc(db, "users", user.uid);
    
    if (userData.lastQueryDate !== today && !userData.isPremium) {
      await updateDoc(userDocRef, {
        dailyQueries: 0,
        lastQueryDate: today
      });
    }
    
    return { user, userData };
  });
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

// User data functions
export const getUserData = async (uid) => {
  return handleFirestoreError(async () => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error("User data not found");
    }
  });
};

export const updateUserPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

export const updateUserPremiumStatus = async (uid, isPremium) => {
  return handleFirestoreError(async () => {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { isPremium });
    return true;
  });
};

export const updateQueryCount = async (uid) => {
  return handleFirestoreError(async () => {
    const userData = await getUserData(uid);
    
    if (!userData.isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const userDocRef = doc(db, "users", uid);
      
      // Reset count if it's a new day
      if (userData.lastQueryDate !== today) {
        await updateDoc(userDocRef, {
          dailyQueries: 1,
          lastQueryDate: today
        });
      } else {
        // Increment query count
        await updateDoc(userDocRef, {
          dailyQueries: userData.dailyQueries + 1
        });
      }
    }
    
    return true;
  });
};


export const saveChatHistory = async (uid, chat) => {
  return handleFirestoreError(async () => {
    const userDocRef = doc(db, "chats", uid);
    const docSnap = await getDoc(userDocRef);
    
    // Add debugging to see exactly what we're receiving
    console.log("Saving chat:", JSON.stringify(chat));
    
    // Handle both single message and array of messages
    const chatEntries = Array.isArray(chat) ? chat : [chat];
    const processedChatEntries = [];
    
    for (const chatItem of chatEntries) {
      // Validate chat object
      if (!chatItem || typeof chatItem !== 'object') {
        console.error("Invalid chat format: chat should be an object.");
        continue; // Skip invalid entries instead of failing completely
      }
      
      // Create a sanitized chat entry
      const chatEntry = {
        id: chatItem.id || Date.now(), // Use current timestamp as fallback ID
        sender: chatItem.sender || "SK",
        timestamp: chatItem.timestamp || new Date().toISOString(),
      };
      
      // Handle text field based on its type and sender
      if (chatItem.sender === 'bot') {
        if (typeof chatItem.text === 'object') {
          // Store bot's response object directly
          chatEntry.text = chatItem.text;
        } else {
          // For string or primitive values, wrap in response object
          chatEntry.text = { response: chatItem.text || "" };
        }
      } else {
        // For user messages or other senders, preserve the original format
        chatEntry.text = chatItem.text || "";
      }
      
      // Final validation to ensure no undefined values
      for (const key in chatEntry) {
        if (chatEntry[key] === undefined) {
          console.warn(`Field ${key} is undefined in chat entry, using empty string instead`);
          chatEntry[key] = ""; // Replace undefined with empty string
        }
      }
      
      console.log("Processed chat entry:", chatEntry);
      processedChatEntries.push(chatEntry);
    }
    
    // Skip if all entries were invalid
    if (processedChatEntries.length === 0) {
      console.error("No valid chat entries to save");
      return false;
    }
    
    // Store in Firestore
    if (docSnap.exists()) {
      const chatHistory = docSnap.data().history || [];
      
      // Ensure chatHistory is an array
      if (!Array.isArray(chatHistory)) {
        console.error("Invalid chat history format in Firestore.");
        // Initialize as empty array instead of failing
        await updateDoc(userDocRef, { history: processedChatEntries });
        return true;
      }
      
      await updateDoc(userDocRef, { 
        history: [...chatHistory, ...processedChatEntries] 
      });
    } else {
      await setDoc(userDocRef, { history: processedChatEntries });
    }
    
    return true;
  });
};


export const getChatHistory = async (uid) => {
  try {
    const docRef = doc(db, "chats", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const chatHistory = docSnap.data().history || [];
      console.log("Retrieved chat history:", chatHistory);

      // Process each chat entry to ensure consistent format
      const processedChatHistory = chatHistory.map(chat => {
        // Create a copy of the chat object
        const processedChat = { ...chat };
        
        // Make sure all chats have required fields
        if (!processedChat.id) processedChat.id = Date.now();
        if (!processedChat.timestamp) processedChat.timestamp = new Date().toISOString();
        
        // Handle sender field, mapping 'SK' to 'user' if needed
        if (processedChat.sender === 'SK') {
          processedChat.sender = 'user';
        }
        
        // Ensure text field exists
        if (processedChat.text === undefined || processedChat.text === null) {
          processedChat.text = processedChat.sender === 'bot' ? { response: '' } : '';
        }
        
        // Handle bot messages consistently
        if (processedChat.sender === 'bot') {
          if (typeof processedChat.text === 'string') {
            // Check if it's a JSON string that might represent an object
            if (processedChat.text.startsWith('{') || processedChat.text.startsWith('[')) {
              try {
                // Try to parse it as JSON
                const parsedObj = JSON.parse(processedChat.text);
                processedChat.text = parsedObj;
              } catch (e) {
                // If parsing fails, wrap in response object
                processedChat.text = { response: processedChat.text };
              }
            } else {
              // Plain text bot message, wrap in response object
              processedChat.text = { response: processedChat.text };
            }
          } else if (typeof processedChat.text === 'object' && processedChat.text !== null) {
            // If it's already an object, ensure it has a response property if needed
            if (!Object.keys(processedChat.text).length) {
              processedChat.text = { response: '' };
            } else if (!processedChat.text.response && !Object.keys(processedChat.text).some(key => 
                typeof processedChat.text[key] === 'string' || 
                typeof processedChat.text[key] === 'number')) {
              // If no response property and no string/number values, add an empty one
              processedChat.text.response = '';
            }
          } else {
            // Fallback for any other type
            processedChat.text = { response: String(processedChat.text || '') };
          }
        }
        
        // Final validation pass to ensure no undefined values
        for (const key in processedChat) {
          if (processedChat[key] === undefined) {
            console.warn(`Field ${key} is undefined in processed chat, using empty value instead`);
            processedChat[key] = key === 'text' ? 
              (processedChat.sender === 'bot' ? { response: '' } : '') : 
              '';
          }
        }
        
        return processedChat;
      });

      console.log("Processed chat history:", processedChatHistory);
      return processedChatHistory;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting chat history:", error);
    return [];
  }
};

export const clearChatHistory = async (uid) => {
  return handleFirestoreError(async () => {
    const userDocRef = doc(db, "chats", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      await updateDoc(userDocRef, { history: [] });
    } else {
      // If no chat doc exists, create an empty one
      await setDoc(userDocRef, { history: [] });
    }
    return true;
  });
};

export { auth, db };