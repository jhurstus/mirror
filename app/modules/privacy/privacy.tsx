import getFirebaseDb from '@/app/lib/firebase';
import { onValue, ref } from 'firebase/database';
import { ReactNode, createContext, useEffect, useState } from 'react';

export const IsInPrivacyModeContext = createContext<boolean>(false);

export type PrivacyProviderProps = {
  children: ReactNode;
}

export function PrivacyProvider({
  children,
}: PrivacyProviderProps) {
  const [isInPrivacyMode, setIsInPrivacyMode] = useState<boolean>(false);

  useEffect(() => {
    getFirebaseDb().then((database) => {
      const privacyRef = ref(database, 'mirror/config/showPrivateInfo');
      onValue(privacyRef, (snapshot) => {
        setIsInPrivacyMode(!snapshot.val());
      });
    }).catch((error) => {
      console.error(error.message);
    });
  }, [])

  return (
    <IsInPrivacyModeContext.Provider value={isInPrivacyMode}>
      {children}
    </IsInPrivacyModeContext.Provider>
  );
}