type LocationMutable = {
  // Latitude/longitude of location.
  lat: number;
  lng: number;
  // Display name of the user with this location.
  name: string;
  // UTC timestamp at which the location was fixed.
  timestamp: number;
  // Jurisdictions of the location.
  country: string;
  state: string;
  city: string;
};
export type Location = Readonly<LocationMutable>;

export type FirebaseDbUsersVal = {
  [key: string]: { shareLocation: boolean; location: Location; }
};
export function isFirebaseDbUsersVal(o: any): o is FirebaseDbUsersVal {
  if (o?.constructor != Object) return false;
  for (const name in o) {
    if (!o.hasOwnProperty(name)) continue;
    const user = o[name];
    if (typeof user.shareLocation != 'boolean') return false;
    if (user.location?.constructor != Object) return false;
    const l = user.location;
    if (typeof l.lat != 'number' ||
      typeof l.lng != 'number' ||
      // skip 'name' check, which is spliced into db value later
      typeof l.timestamp != 'number' ||
      typeof l.country != 'string' ||
      typeof l.state != 'string' ||
      typeof l.city != 'string') return false;
  }
  return true;
}

type GeofenceMutable = {
  // Latitude/longitude of the center of a circular geofence.
  lat: number;
  lng: number;
  // Radius of the geofence, in meters.
  radius: number;
  // A textual description of the geofence.
  label: string;
};
export type Geofence = Readonly<GeofenceMutable>;
export function isFirebaseDbGeofencesVal(o: any): o is Geofence[] {
  if (o?.constructor != Array) return false;
  for (const g of o) {
    if (typeof g.lat != 'number' ||
      typeof g.lng != 'number' ||
      typeof g.radius != 'number' ||
      typeof g.label != 'string') return false;
  }
  return true;
}

export function getAggregatedLocationDescriptions(
  locations: Location[],
  fences: Geofence[],
  homeCity: string,
  homeState: string,
  homeCountry: string): string[] {
  // Map of textual location descriptions to the users at that location.
  const locationDescriptionToName = new Map<string, string[]>();
  for (const loc of locations) {
    var desc = getLocationDescription(loc, fences, homeCity, homeState, homeCountry);
    if (!locationDescriptionToName.has(desc)) {
      locationDescriptionToName.set(desc, []);
    }
    locationDescriptionToName.get(desc)?.push(loc.name);;
  }

  const ret: string[] = [];
  for (const [locationDescription, names] of locationDescriptionToName.entries()) {
    names.sort();
    if (names.length == 1) {
      ret.push(`${names[0]} is ${locationDescription}`);
    } else if (names.length == 2) {
      ret.push(`${names[0]} and ${names[1]} are ${locationDescription}`);
    } else {
      let p = '';
      for (let i = 0; i < names.length - 2; i++) {
        p += `${names[i]}, `;
      }
      p += `${names[names.length - 2]}, and `;
      p += `${names[names.length - 1]} are ${locationDescription}`;
      ret.push(p);
    }
  }

  return ret;
}

/**
 * Gets a textual description of the passed location.
 */
function getLocationDescription(
  loc: Location,
  fences: Geofence[],
  homeCity: string,
  homeState: string,
  homeCountry: string): string {
  let description: string;

  const fence = isInGeofence(loc, fences);
  const isHome = fence && (fence.label.toLowerCase() == 'home');
  const minutesOld = locationEventTimeStampToMinutes(loc.timestamp);

  if ((isHome && (minutesOld > (60 * 11))) ||
    (!isHome && (minutesOld > 45))) {
    // Tolerate longer stale times for home, when phones might be turned off
    // overnight.
    description = 'off the grid';
  } else if (fence) {
    if (isHome) {
      description = fence.label;
    } else {
      description = `at ${fence.label}`;
    }
  } else if (loc.country == homeCountry && loc.city == homeCity) {
    description = 'out and about';
  } else if (loc.country == homeCountry && loc.state == homeState) {
    description = `in ${loc.city}`;
  } else if (loc.country == homeCountry) {
    description = `in ${loc.city}, ${loc.state}`;
  } else {
    description = `in ${loc.city}, ${loc.country}`;
  }

  return description;
}

// Returns the first geofence from 'fences' containing the passed location, or
// null if no fences contain the location.
function isInGeofence(loc: Location, fences: Geofence[]): Geofence | null {
  for (const fence of fences) {
    const distanceOfLocationFromFenceCenter =
      haversineDistance(loc.lat, loc.lng, fence.lat, fence.lng);
    if (distanceOfLocationFromFenceCenter <= fence.radius) {
      return fence;
    }
  }
  return null;
}

// Converts degrees to radians.
function toRadians(deg: number): number {
  return deg * Math.PI / 180;
}

// Returns distance between two lat/lng coordinates, in meters.
// See: https://en.wikipedia.org/wiki/Haversine_formula
function haversineDistance(
  lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371;  // approx. radius of earth, km
  const x1 = lat2 - lat1;
  const dLat = toRadians(x1);
  const x2 = lng2 - lng1;
  const dLng = toRadians(x2);
  const a = Math.pow(Math.sin(dLat / 2), 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.pow(Math.sin(dLng / 2), 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 1000 * r * c;
}

// Changes a location event timestamp (UTC) to how far in the past it
// occurred, in minutes.
function locationEventTimeStampToMinutes(t: number): number {
  const now = Date.now();
  return Math.round(Math.max(0, (now - t) / (60 * 1000)));
}