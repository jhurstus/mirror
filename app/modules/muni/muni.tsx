'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import styles from './muni.module.css'
import { Response } from '@/pages/api/modules/muni/muni';

export type MuniProps = {
  // 511 developer key used to fetch transit prediction data.  See:
  // https://511.org/open-data/token
  developerKey: string;
  // Public transit agency from which to retrieve data from 511.
  // http://api.511.org/transit/gtfsoperators?api_key=[your_key] for a list of
  // supported values.
  agency?: string;
  // List of 511 routeName+direction+stopIds for which to show arrival predictions.
  // For example:
  // [{routeName: 'J', direction: 'IB', stopId: '13463'}, ...]
  stops: [RouteConfig, ...RouteConfig[]];
  // Time in milliseconds between prediction updates.
  updateInterval?: number;
  // The maximum age in milliseconds for which predictions will be displayed.
  // If data cannot be updated before this limit, the UI will be hidden, so as
  // to prevent the display of stale prediction data.  This value MUST be
  // greater than 'updateInterval'.
  dataAgeLimit?: number;
  // Whether to update arrival times locally based on the last prediction times
  // received from 511.
  // True: Counts down arrival times between 'updateInterval' refreshes.
  // False: Only updates arrival times with values directly retrieved from 511.
  localCountdown?: boolean;
  // Duration in milliseconds for animating in new prediction data.
  animationDuration?: number;
};

// See:
// http://api.511.org/transit/stops?api_key=[your_key]&operator_id=[operator_id]
// ... for a list of stops for a given agency/operator.  See:
// https://api.511.org/transit/StopMonitoring?api_key=[your_key]&stopcode=[stop_id]&agency=[operator_id]
// ... for a sample of routeName (<LineRef>) and direction (<DirectionRef>) values
// for a given stop.
export type RouteConfig = {
  routeName: string;
  direction: string;
  stopId: string;
};

// Hack to avoid JSX syntax ambiguity.
type Nullable<T> = T | null;

export default function Muni({
  developerKey,
  agency = 'SF',
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
        `/api/modules/muni/muni?key=${developerKey}&agency=${agency}&stops=${encodeURIComponent(JSON.stringify(stops))}`)
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
  }, [agency, developerKey, localCountdown, stops, updateInterval]);

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
