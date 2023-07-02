import Image from 'next/image';
import styles from './abode.module.css';
import { useEffect, useState } from 'react';
import getFirebaseDb from '@/app/lib/firebase';
import { onValue, ref } from 'firebase/database';

export default function Abode() {
  const [armed, setArmed] = useState<boolean>(false);

  useEffect(() => {
    getFirebaseDb().then((database) => {
      const isArmedRef = ref(database, 'home/isArmed');
      onValue(isArmedRef, (snapshot) => {
        setArmed(snapshot.val());
      });
    }).catch((error) => {
      console.error(error.message);
    });
  }, []);

  if (!armed) return <></>;

  return (
    <Image
      className={styles.abode}
      src="/modules/abode/home.svg"
      alt="home security system armed"
      width={50}
      height={50} />
  );
}