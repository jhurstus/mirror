'use client'

import { useEffect, useState } from 'react';
import styles from './memo.module.css'
import { Response } from '@/pages/api/modules/memo/memo'

// Hack to avoid JSX syntax ambiguity.
type Nullable<T> = T | null;

export type MemoProps = {
  // URL from which to download memo content.
  url: string;
  // Time in milliseconds between memo updates.
  updateInterval?: number
};

export default function Memo({
  url,
  updateInterval = 10 * 1000
}: MemoProps) {
  const [memoData, setMemoData] = useState<Nullable<Response>>(null);

  useEffect(() => {
    function fetchMemo() {
      fetch(`/api/modules/memo/memo?url=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((json) => {
          setMemoData(json);
        }).catch((e) => console.error(e));
    }
    fetchMemo();

    const fetchMemoIntervalId = window.setInterval(fetchMemo, updateInterval);

    return () => window.clearInterval(fetchMemoIntervalId);
  }, []);

  // 'https://fonts.googleapis.com/css?family=Amatic+SC:400,700&subset=latin-ext&.css',

  if (!memoData) return <></>;
  if ('error' in memoData) {
    console.error(memoData.error);
    return <></>;
  }
  return <pre className={styles.memo}>{memoData.memo}</pre>;
}