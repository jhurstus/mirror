'use client';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Geofence, Location, getAggregatedLocationDescriptions, isFirebaseDbGeofencesVal, isFirebaseDbUsersVal } from './geo_utils';

// See: https://firebase.google.com/docs/web/learn-more#config-object
export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  storageBucket: string;
  messagingSenderId: string;
};

export type WeasleyProps = {
  firebaseConfig: FirebaseConfig;
  // Firebase email auth.
  email: string;
  password: string;
  // Users to track (firebase user id to display name), in the format of 'Map'
  // constructor args, i.e. [[userId, name], ...].
  usersArr: [string, string][];
  // Location jurisdiction of the display.
  homeCountry: string;
  homeState: string;
  homeCity: string;
};

export default function Weasley({
  firebaseConfig,
  email,
  password,
  usersArr,
  homeCountry,
  homeState,
  homeCity
}: WeasleyProps) {
  const [fences, setGeofences] = useState<Geofence[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const users = new Map<string, string>(usersArr);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth();

    signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
      const database = getDatabase(app);

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

    return () => {
      auth.signOut();
    };
  }, []);

  if (fences.length == 0 || locations.length == 0) {
    return <></>;
  }

  const locationDescriptions = getAggregatedLocationDescriptions(
    locations, fences, homeCity, homeState, homeCountry);
  return (
    <ul>
      {locationDescriptions.map((desc) => <li key={desc}>{desc}</li>)}
    </ul>
  );
}

//   bindDb: function() {
//     this.db.ref('mirror/config/showPrivateInfo').on('value', function(snapshot) {
//       that.showPrivateInfo(snapshot.val());
//     });
//   },
// 
//   showPrivateInfo: function(show) {
//     document.body.classList[show ? 'remove' : 'add']('private');
//   },