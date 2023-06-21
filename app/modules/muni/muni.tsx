'use client';

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

  useEffect(() => {
    fetch(
      `/api/modules/muni/muni?key=${developerKey}&agency=${agency}&stops=${encodeURIComponent(JSON.stringify(stops))}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      }).catch((e) => console.error(e));
  }, []);

  if (!data) return <div></div>;
  if ('error' in data) {
    console.error(data.error);
    return <div></div>;
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
  return (
    <li className="normal">
      <img src={iconPath} height="40" width="40" />
      {iconText && <span className={styles.routeName}>{iconText}</span>}
      <span className={styles.times}>
        {arrivalTimes.map((time, i) =>
          // Arrival times have no suitable UUID, so just use index for key.
          <ArrivalTime
            predictedArrivalTimestamp={time}
            isLastTime={i == arrivalTimes.length - 1}
            key={i}
          />)}
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


// function start() {
//     this.lastUpdateTimestamp = 0;
//     this.predictionsData = null;
//     this.downloadPredictions();
//     setInterval(
//         this.downloadPredictions.bind(this), this.config.updateInterval);
//     if (this.config.localCountdown) {
//       setInterval(
//         this.localUpdateArrivalTimes.bind(this), 1000);
//     }
//   }
// 
//   function socketNotificationReceived(notification, payload) {
//       try {
//         const xmlDocs = xmlText.map(
//           (x) => new DOMParser().parseFromString(x, "text/xml"));
//         if (this.isPredictionsDataValid(xmlDocs)) {
//           this.predictionsData = xmlDocs;
//           this.lastUpdateTimestamp = Date.now();
//           this.updateDom(this.config.animationDuration);
//         }
//       } catch (err) {
//         Log.error(err);
//       }
//     } else if (notification && notification.startsWith('error')) {
//       Log.error(payload);
//       this.updateDom(this.config.animationDuration);
//     }
//   }
// 
//   function getDom() {
//     if (!this.predictionsData ||
//         (Date.now() - this.lastUpdateTimestamp) > this.config.dataAgeLimit) {
//       return document.createElement('div');
//     }
// 
//     this.dom = document.createElement('div');
//     this.viewModel = this.getViewModel(this.predictionsData);
//     this.dom.innerHTML = this.mainTemplate(this.viewModel);
// 
//     return this.dom;
//   }
// 
//   // Converts 511 api data to view model object passed to handlebar templates.
//   function getViewModel(data) {
//     var r = {predictions:[]};
// 
//     const predictedArrivalTimes = [];
//     for (let i = 0; i < data.length; i++) {
//       predictedArrivalTimes.push(
//         this.getPredictedTimes(
//           data[i],
//           this.config.stops[i].line,
//           this.config.stops[i].direction,
//           this.config.stops[i].stop));
//     }
// 
//     for (let i = 0; i < predictedArrivalTimes.length; i++) {
//       const routeName = this.config.stops[i].line;
//       const icon = this.getIcon(routeName);
//       const m = {
//         iconUrl: icon.url,
//         iconText: icon.text,
//         times: []
//       };
// 
//       const now = new Date();
//       const times = predictedArrivalTimes[i];
//       for (const t of times) {
//         m.times.push({
//           minutes: this.getMinutesToArrival(now, t),
//           timestamp: t.getTime()
//         });
//       }
//       // Show times in ascending order.
//       m.times.sort(function(a, b) {
//         return parseInt(a.minutes, 10) - parseInt(b.minutes, 10);
//       });
//       // Only show three most recent times to keep rows uniform and because
//       // predictions for more distant times are typically very inaccurate.
//       m.times = m.times.slice(0, 3);
// 
//       r.predictions.push(m);
//     }
// 
//     return r;
//   }
// 
// 
//   // Updates displayed arrival times previously retrieved from 511 based on
//   // elapsed wall time.
//   function localUpdateArrivalTimes() {
//     const now = new Date();
//     const times = document.querySelectorAll('.muni .timeNumber');
//     for (const t of times) {
//       const arrivalTime = new Date(parseInt(t.getAttribute('timestamp'), 10));
//       if ((arrivalTime - now) < -60000) {
//         // Hide arrival time if it occurred over a minute in the past.  The
//         // bus/train likely already departed.
//         t.parentNode.style.display = 'none';
//       } else {
//         t.textContent = this.getMinutesToArrival(now, arrivalTime);
//       }
//     }
//   }

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

