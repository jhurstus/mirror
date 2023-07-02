'use client';

import { onValue, ref } from 'firebase/database';
import { useContext, useEffect, useState } from 'react';
import { Geofence, Location, getAggregatedLocationDescriptions, isFirebaseDbGeofencesVal, isFirebaseDbUsersVal } from './geo_utils';
import styles from './weasley.module.css';
import { IsInPrivacyModeContext } from '../privacy/privacy';
import getFirebaseDb from '@/app/lib/firebase';

export type WeasleyProps = {
  // Users to track (firebase user id to display name), in the format of 'Map'
  // constructor args, i.e. [[userId, name], ...].
  usersArr: [string, string][];
  // Location jurisdiction of the display.
  homeCountry: string;
  homeState: string;
  homeCity: string;
};

export default function Weasley({
  usersArr,
  homeCountry,
  homeState,
  homeCity,
}: WeasleyProps) {
  const isInPrivacyMode = useContext(IsInPrivacyModeContext);

  const [fences, setGeofences] = useState<Geofence[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const users = new Map<string, string>(usersArr);

    getFirebaseDb().then((database) => {
      const usersRef = ref(database, 'users');
      onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        if (!isFirebaseDbUsersVal(val)) {
          console.error(`${JSON.stringify(val)} does not match expected Firebase DB /users schema.`);
          return;
        }
        const databaseLocations: Location[] = [];
        for (const userId in val) {
          if (users.has(userId) && val[userId].shareLocation) {
            databaseLocations.push(Object.assign({ name: users.get(userId) }, val[userId].location));
          }
        }
        setLocations(databaseLocations);
      });

      const geofencesRef = ref(database, 'mirror/geofences');
      onValue(geofencesRef, (snapshot) => {
        const val = snapshot.val();
        if (!isFirebaseDbGeofencesVal(val)) {
          console.error(`${JSON.stringify(val)} does not match expected Firebase DB /mirror/geofences schema.`);
          return;
        }
        setGeofences(val);
      });
    }).catch((error) => {
      console.error(error.message);
    });
  }, [usersArr]);

  if (isInPrivacyMode) return <></>;

  if (fences.length == 0 || locations.length == 0) {
    return <></>;
  }

  const locationDescriptions = getAggregatedLocationDescriptions(
    locations, fences, homeCity, homeState, homeCountry);
  return (
    <ul className={styles.weasley}>
      {locationDescriptions.map((desc) => <li key={desc}>{desc}</li>)}
    </ul>
  );
}