import Image from 'next/image';
import styles from './abode.module.css';
import { useEffect, useState } from 'react';
import getFirebaseDb from '@/app/lib/firebase';
import { onValue, ref } from 'firebase/database';

export default function Abode() {
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [isGarageOpen, setIsGarageOpen] = useState<boolean>(false);

  useEffect(() => {
    getFirebaseDb().then((database) => {
      const isArmedRef = ref(database, 'home/isArmed');
      onValue(isArmedRef, (snapshot) => {
        setIsArmed(snapshot.val());
      });
      const isGarageOpenRef = ref(database, 'home/isGarageOpen');
      onValue(isGarageOpenRef, (snapshot) => {
        setIsGarageOpen(snapshot.val());
      });
    }).catch((error) => {
      console.error(error.message);
    });
  }, []);

  return (
    <div className={styles.abode}>
      {isArmed &&
        <Image
          className={styles.img}
          src="/modules/abode/home.svg"
          alt="home security system armed"
          width={35}
          height={35} />}
      {isGarageOpen &&
        <Image
          className={styles.img}
          src="/modules/abode/garage.svg"
          alt="garage door open"
          width={35}
          height={35} />
      }
    </div>
  );
}