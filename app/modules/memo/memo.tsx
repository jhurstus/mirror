'use client'

import { useContext, useEffect, useState } from 'react';
import styles from './memo.module.css'
import { Amatic_SC } from 'next/font/google';
import { IsInPrivacyModeContext } from '../privacy/privacy';
import getFirebaseDb from '@/app/lib/firebase';
import { onValue, ref } from 'firebase/database';

const amaticSc = Amatic_SC({
  subsets: ['latin'],
  weight: ['700'],
});

export default function Memo({}) {
  const isInPrivacyMode = useContext(IsInPrivacyModeContext);

  const [memoData, setMemoData] = useState<string>('');

  useEffect(() => {
    getFirebaseDb().then((database) => {
      const memoRef = ref(database, 'mirror/memo');
      onValue(memoRef, (snapshot) => {
        setMemoData(snapshot.val());
      });
    }).catch((error) => {
      console.error(error.message);
    });
  }, [setMemoData])

  if (isInPrivacyMode || !memoData) return <></>;
  return <pre className={styles.memo + " " + amaticSc.className}>{memoData}</pre>;
}