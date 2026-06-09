'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './muni.module.css'
import { Response } from '@/pages/api/modules/muni/muni';

export type MuniProps = {
  // Public transit agency from which to retrieve data from UmoIQ.  This is the
  // agency id used in the UmoIQ request path, e.g. 'sfmta-cis' for SF Muni.
  agency?: string;
  // List of routeName+stopId pairs for which to show arrival predictions.
  // For example:
  // [{routeName: 'J', stopId: '3995'}, ...]
  stops: [RouteConfig, ...RouteConfig[]];
  // Time in milliseconds between prediction updates.
  updateInterval?: number;
  // The maximum age in milliseconds for which predictions will be displayed.
  // If data cannot be updated before this limit, the UI will be hidden, so as
  // to prevent the display of stale prediction data.  This value MUST be
  // greater than 'updateInterval'.
  dataAgeLimit?: number;
  // Whether to update arrival times locally based on the last prediction times
  // received from UmoIQ.
  // True: Counts down arrival times between 'updateInterval' refreshes.
  // False: Only updates arrival times with values directly retrieved from UmoIQ.
  localCountdown?: boolean;
  // Duration in milliseconds for animating in new prediction data.
  animationDuration?: number;
};

// 'routeName' is the UmoIQ route id (e.g. 'J', '48') and 'stopId' is the UmoIQ
// internal stop id (e.g. '3995'), as used in the request path:
// https://api.prd-1.iq.live.umoiq.com/v2.0/riders/agencies/[agency]/nstops/[routeName]:[stopId]/predictions
// The stop id is direction-specific, so no separate direction is needed.
export type RouteConfig = {
  routeName: string;
  stopId: string;
};

// Hack to avoid JSX syntax ambiguity.
type Nullable<T> = T | null;

export default function Muni({
  agency = 'sfmta-cis',
  stops,
  updateInterval = 1000 * 20,
  dataAgeLimit = 1000 * 60 * 1,
  localCountdown = true,
  animationDuration = 0,
}: MuniProps) {
  const [data, setData] = useState<Nullable<Response>>(null);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(0);
  const [, forceRender] = useState({});

  useEffect(() => {
    function fetchMuniData() {
      fetch(
        `/api/modules/muni/muni?agency=${agency}&stops=${encodeURIComponent(JSON.stringify(stops))}`)
        .then((res) => res.json())
        .then((json) => {
          setLastUpdatedTimestamp(Date.now());
          setData(json);
        }).catch((e) => console.error(e));
    }
    fetchMuniData();

    const fetchMuniDataIntervalId =
      window.setInterval(fetchMuniData, updateInterval);

    let localCountdownIntervalId = -1;
    if (localCountdown) {
      // In local countdown mode, force a re-render every second.  While
      // predicted arrival times (in props) don't change in this interval, the
      // distance between those predictions and wall time is constantly
      // changing, so a manual re-render makes sense.
      // Forced re-rendering accomplished by setting a noop state value to a new
      // object within the interval.
      localCountdownIntervalId =
        window.setInterval(() => { forceRender({}); }, 1000);
    }

    return () => {
      window.clearInterval(fetchMuniDataIntervalId);
      window.clearInterval(localCountdownIntervalId);
    };
  }, [agency, localCountdown, stops, updateInterval]);

  // Hide UI when data is missing or stale.
  if (!data) return <></>;
  if ('error' in data) {
    console.error(data.error);
    return <></>;
  }
  if ((Date.now() - lastUpdatedTimestamp) > dataAgeLimit) {
    return <></>;
  }

  return (
    <ul className={styles.muni}>
      {data.map((d, i) => <TransitStop routeName={d.routeName} arrivalTimes={d.arrivalTimes} key={d.stopId} />)}
    </ul>
  )
}

type TransitStopProps = {
  // Name of the route at this stop.
  routeName: string;
  // Timestamps of expected arrivals for this stop.
  arrivalTimes: number[];
};
function TransitStop({ routeName, arrivalTimes }: TransitStopProps) {
  const { iconPath, iconText } = getIcon(routeName);
  const now = Date.now();
  // Hide arrival time if it occurred over a minute in the past.  The
  // bus/train likely already departed.
  const futureishArrivalTimes = arrivalTimes.filter((t) => (t - now) >= -60000);
  return (
    <li className="normal">
      <Image src={iconPath} height="40" width="40" alt="" />
      {iconText && <span className={styles.routeName}>{iconText}</span>}
      <span className={styles.times}>
        {futureishArrivalTimes.map((time, i) => {
          // Arrival times have no suitable UUID, so just use index for key.
          return <ArrivalTime
            predictedArrivalTimestamp={time}
            isLastTime={i == arrivalTimes.length - 1}
            key={i} />
        })}
      </span>
    </li>
  )
}

type ArrivalTimeProps = {
  // Timestamp of expected arrival.
  predictedArrivalTimestamp: number;
  // Whether this is the last arrival time listed for a particular stop.
  isLastTime: boolean;
};
function ArrivalTime({ predictedArrivalTimestamp, isLastTime }: ArrivalTimeProps) {
  const now = new Date();
  const minutesToArrival =
    Math.round(Math.max(
      0,
      (predictedArrivalTimestamp - now.getTime()) / (60 * 1000)));

  return (
    <span data-timestamp={predictedArrivalTimestamp}>
      {minutesToArrival}
      {!isLastTime && (',' + String.fromCharCode(160)/*&nbsp;*/ + ' ')}
    </span>
  )
}

// Maps muni route names to their associated icon URLs.
function getIcon(iconName: string): { iconPath: string, iconText: string } {
  // Use 'J' icon for KJ joint line.  This is only correct for J line stops,
  // but that's always the case for my use case.
  if (iconName == 'KJ') {
    iconName = 'J';
  }

  const specialIcons = ['J', 'K', 'L', 'M', 'N', 'S', 'T'];
  let iconFile, iconText;
  if (specialIcons.includes(iconName)) {
    iconFile = iconName.toLowerCase();
    iconText = '';
  } else {
    iconFile = 'generic';
    iconText = iconName;
  }
  return {
    iconPath: '/modules/muni/icons/muni_' + iconFile + '.png',
    iconText
  };
}
