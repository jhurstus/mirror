import Image from 'next/image';
import styles from './abode.module.css';

export default function Abode() {
  return (
    <Image
      className={styles.abode}
      src="/modules/abode/home.svg"
      alt="home security system armed"
      width={50}
      height={50} />
  );
}