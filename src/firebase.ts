import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  writeBatch,
  query,
  limit
} from 'firebase/firestore';

// Loaded from our persistent Firebase blueprint configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKfIyHVQBDGyL5BpWuzQ02AMFuGbgZB5Y",
  authDomain: "sincere-buffer-5v8b6.firebaseapp.com",
  projectId: "sincere-buffer-5v8b6",
  storageBucket: "sincere-buffer-5v8b6.firebasestorage.app",
  messagingSenderId: "392331065982",
  appId: "1:392331065982:web:92516dbc07fcaa372df62f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-restaurantinvent-7c4954c0-530d-434f-8ff4-d4f2a477ff41");

// Helper to remove undefined properties before sending to Firestore
function sanitizeData(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item));
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== undefined) {
          sanitized[key] = sanitizeData(value);
        }
      }
    }
    return sanitized;
  }
  return obj;
}

// Generic FireStore persistence loaders
export async function loadCollectionFromFirestore<T>(collectionName: string, defaultValue: T[]): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log(`Firestore collection ${collectionName} is empty. Seeding mockup data...`);
      // Seed initial data
      const batch = writeBatch(db);
      defaultValue.forEach((item: any) => {
        const docId = (item as any).id || `doc-${Math.floor(Math.random() * 1000000)}`;
        const docRef = doc(colRef, docId);
        batch.set(docRef, sanitizeData(item));
      });
      await batch.commit();
      return defaultValue;
    }
    const data: T[] = [];
    snapshot.forEach((doc) => {
      data.push(doc.data() as T);
    });
    return data;
  } catch (error) {
    console.error(`Error loading or seeding collection ${collectionName}:`, error);
    return defaultValue;
  }
}

export async function saveItemToFirestore<T extends { id: string }>(collectionName: string, item: T): Promise<void> {
  try {
    const docRef = doc(db, collectionName, item.id);
    await setDoc(docRef, sanitizeData(item), { merge: true });
    console.log(`Saved item ${item.id} to Firestore collection ${collectionName}`);
  } catch (error) {
    console.error(`Error saving item ${item.id} to Firestore collection ${collectionName}:`, error);
  }
}

export async function saveCollectionToFirestore<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(colRef, item.id);
      batch.set(docRef, sanitizeData(item), { merge: true });
    });
    await batch.commit();
    console.log(`Successfully batch-saved ${items.length} items to Firestore ${collectionName}`);
  } catch (error) {
    console.error(`Error batch-saving to Firestore collection ${collectionName}:`, error);
  }
}
