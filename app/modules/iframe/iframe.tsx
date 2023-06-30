'use client';

import { useEffect, useState } from 'react';
import styles from './iframe.module.css'

export type IframeProps = {
  // URL of the iframe to display.
  src: string;
  // Height and width of the iframe, in CSS units.
  height: string;
  width: string;
  // Time in milliseconds between iframe updates.
  updateInterval: number;
};

export default function Iframe({
  src, height, width, updateInterval = 1000 * 60 * 5
}: IframeProps) {
  const [iframeSrc, setIframeSrc] = useState<string>(src);

  useEffect(() => {
    let timeoutId: number;

    function reloadIframe(): void {
      setIframeSrc('');
      // Yield to let the src unset take effect.
      timeoutId = window.setTimeout(() => setIframeSrc(src), 1000);
    }

    let intervalId = window.setInterval(reloadIframe, updateInterval);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [updateInterval, src]);

  return (
    <div className={styles.container} style={{ height: height }}>
      <iframe height={height} width={width} className={styles.iframe} src={iframeSrc} />
    </div>
  )
}
