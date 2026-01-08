import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';

// Firebase configuration
// You'll need to replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Create initial portfolio for new user
    await setDoc(doc(db, 'portfolios', result.user.uid), {
      stocks: [],
      alerts: [],
      lastUpdate: null,
      createdAt: new Date().toISOString()
    });
    return result.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Database functions
export const savePortfolio = async (userId, portfolioData) => {
  try {
    await setDoc(doc(db, 'portfolios', userId), {
      ...portfolioData,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving portfolio:', error);
    throw error;
  }
};

export const getPortfolio = async (userId) => {
  try {
    const docRef = doc(db, 'portfolios', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Create initial portfolio if it doesn't exist
      const initialPortfolio = {
        stocks: [],
        alerts: [],
        lastUpdate: null
      };
      await setDoc(docRef, initialPortfolio);
      return initialPortfolio;
    }
  } catch (error) {
    console.error('Error getting portfolio:', error);
    throw error;
  }
};

export const subscribeToPortfolio = (userId, callback) => {
  const docRef = doc(db, 'portfolios', userId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

export { auth, db };
