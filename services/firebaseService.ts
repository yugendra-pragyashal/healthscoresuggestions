
import type { User, HealthData } from '../types';

// --- MOCK FIREBASE STORE ---
// In a real app, this would be a connection to a remote Firestore database.
// Here, we use localStorage to persist data across sessions for a single user.
const DB_KEY = 'health_score_ai_db';

let user: User | null = null;
let healthData: HealthData | null = null;
let onSnapshotCallback: ((data: HealthData | null) => void) | null = null;

const loadFromLocalStorage = () => {
  try {
    const storedData = localStorage.getItem(DB_KEY);
    if (storedData) {
      healthData = JSON.parse(storedData);
    }
  } catch (error) {
    console.error("Failed to load data from localStorage", error);
    healthData = null;
  }
};

const saveToLocalStorage = () => {
  try {
    if (healthData) {
      localStorage.setItem(DB_KEY, JSON.stringify(healthData));
    } else {
      localStorage.removeItem(DB_KEY);
    }
  } catch (error) {
    console.error("Failed to save data to localStorage", error);
  }
};

// Initial load
loadFromLocalStorage();

// Mock Firebase Auth
const auth = {
  signInAnonymously: async (): Promise<{ user: User }> => {
    if (!user) {
      // Create a stable anonymous user ID for the session
      user = { uid: `anon-user-${Date.now()}` };
    }
    console.log("Mock sign-in successful. UID:", user.uid);
    return Promise.resolve({ user });
  },
  getCurrentUser: (): User | null => {
    return user;
  },
};

// Mock Firestore
const firestore = {
  onSnapshot: (
    docId: string,
    callback: (data: HealthData | null) => void
  ): (() => void) => {
    // In a real app, docId would be used to listen to a specific document.
    // Here we just have one data object.
    console.log(`Setting up mock onSnapshot for doc: ${docId}`);
    onSnapshotCallback = callback;
    // Immediately call back with the current data.
    setTimeout(() => onSnapshotCallback?.(healthData), 0);

    // Return an unsubscribe function
    return () => {
      onSnapshotCallback = null;
      console.log(`Unsubscribed from mock onSnapshot for doc: ${docId}`);
    };
  },

  setDoc: async (docId: string, data: HealthData): Promise<void> => {
     // In a real app, docId would be used to write to a specific document.
    console.log(`Mock setDoc called for doc: ${docId}`);
    healthData = data;
    saveToLocalStorage();
    // Trigger the snapshot listener to simulate a real-time update
    if (onSnapshotCallback) {
      setTimeout(() => onSnapshotCallback?.(healthData), 0);
    }
    return Promise.resolve();
  },

  updateDoc: async (docId: string, data: Partial<HealthData>): Promise<void> => {
     // In a real app, docId would be used to update a specific document.
    console.log(`Mock updateDoc called for doc: ${docId}`);
    if (healthData) {
      healthData = { ...healthData, ...data };
      saveToLocalStorage();
      // Trigger the snapshot listener
      if (onSnapshotCallback) {
         setTimeout(() => onSnapshotCallback?.(healthData), 0);
      }
    } else {
        // If no data exists, this could be an error or you might want to create it.
        // For simplicity, we'll log an error.
        console.error("Update failed: No existing document to update.");
        return Promise.reject(new Error("No existing document to update."));
    }
    return Promise.resolve();
  },
};

export const firebaseService = { auth, firestore };
