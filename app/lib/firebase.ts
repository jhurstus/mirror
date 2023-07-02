import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase } from "firebase/database";

// See: https://firebase.google.com/docs/web/learn-more#config-object
type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  storageBucket: string;
  messagingSenderId: string;
};

let firebaseDbSingleton: ReturnType<typeof getDatabase> | undefined;

// Gets a page-singleton Firebase DB instance, initializing it if necessary.
export default async function getFirebaseDb(): Promise<ReturnType<typeof getDatabase>> {
  const firebaseConfig: FirebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!);
  const email: string = process.env.NEXT_PUBLIC_FIREBASE_EMAIL!;
  const password: string = process.env.NEXT_PUBLIC_FIREBASE_PASSWORD!;

  if (!firebaseConfig || !email || !password) {
    throw new Error('NEXT_PUBLIC_FIREBASE_{CONFIG,EMAIL,PASSWORD} must be set in .env to use Firebase');
  }

  if (!firebaseDbSingleton) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password);
    firebaseDbSingleton = getDatabase(app);
  }
  return firebaseDbSingleton;
}
