import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { ReactNode, createContext, useEffect, useState } from 'react';

export const IsInPrivacyModeContext = createContext<boolean>(false);

// See: https://firebase.google.com/docs/web/learn-more#config-object
export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  storageBucket: string;
  messagingSenderId: string;
};

export type PrivacyProviderProps = {
  firebaseConfig: FirebaseConfig;
  // Firebase email auth.
  email: string;
  password: string;
  children: ReactNode;
}

export function PrivacyProvider({
  firebaseConfig,
  email,
  password,
  children,
}: PrivacyProviderProps) {
  const [isInPrivacyMode, setIsInPrivacyMode] = useState<boolean>(false);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth();
    signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
      const database = getDatabase(app);
      const privacyRef = ref(database, 'mirror/config/showPrivateInfo');
      onValue(privacyRef, (snapshot) => {
        setIsInPrivacyMode(!snapshot.val());
      });
    }).catch((error) => {
      console.error(error.message);
    });

    return () => {
      auth.signOut();
    };
  }, [email, firebaseConfig, password]);


  return (
    <IsInPrivacyModeContext.Provider value={isInPrivacyMode}>
      {children}
    </IsInPrivacyModeContext.Provider>
  );
}