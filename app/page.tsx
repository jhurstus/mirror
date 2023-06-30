'use client';

import Clock from './modules/clock/clock'
import Memo from './modules/memo/memo'
import Muni from './modules/muni/muni'
import { PrivacyProvider } from './modules/privacy/privacy'
import Weasley from './modules/weasley/weasley'
import Weather from './modules/weather/weather';

export default function Home() {
  return (
    <main>
      <PrivacyProvider
        firebaseConfig={JSON.parse(process.env.NEXT_PUBLIC_WEASLEY_FIREBASE!)}
        email={process.env.NEXT_PUBLIC_WEASLEY_EMAIL!}
        password={process.env.NEXT_PUBLIC_WEASLEY_PASSWORD!}>

        <Clock />
        <Muni
          updateInterval={1000 * 30}
          dataAgeLimit={1000 * 60 * 5}
          developerKey={process.env.NEXT_PUBLIC_MUNI_KEY!}
          stops={JSON.parse(process.env.NEXT_PUBLIC_MUNI_STOPS!)} />
        <Weasley
          firebaseConfig={JSON.parse(process.env.NEXT_PUBLIC_WEASLEY_FIREBASE!)}
          email={process.env.NEXT_PUBLIC_WEASLEY_EMAIL!}
          password={process.env.NEXT_PUBLIC_WEASLEY_PASSWORD!}
          usersArr={JSON.parse(process.env.NEXT_PUBLIC_WEASLEY_USERS!)}
          homeCountry='United States'
          homeState='California'
          homeCity='San
           Francisco' />
        <Weather
          visualCrossingApiKey={process.env.NEXT_PUBLIC_WEATHER_VISUAL_CROSSING_API_KEY!}
          address={process.env.NEXT_PUBLIC_WEATHER_ADDRESS!}
          ambientWeatherApiKey={process.env.NEXT_PUBLIC_WEATHER_AMBIENT_WEATHER_API_KEY!}
          ambientWeatherApplicationKey={process.env.NEXT_PUBLIC_WEATHER_AMBIENT_WEATHER_APPLICATION_KEY!}
          ambientWeatherDeviceMAC={process.env.NEXT_PUBLIC_WEATHER_AMBIENT_WEATHER_DEVICE_MAC!}
          purpleAirReadKey={process.env.NEXT_PUBLIC_WEATHER_PURPLE_AIR_READ_KEY!}
          purpleAirNorthwestLatLng={JSON.parse(process.env.NEXT_PUBLIC_WEATHER_PURPLE_AIR_NORTHWEST_LATLNG!)}
          purpleAirSoutheastLatLng={JSON.parse(process.env.NEXT_PUBLIC_WEATHER_PURPLE_AIR_SOUTHEAST_LATLNG!)} />
        <div style={{ position: 'absolute', bottom: 0, textAlign: 'center', width: '100%' }}>
          {/*<Iframe
            src="https://www.purpleair.com/map?opt=1/m/i/mAQI/a10/cC5#11.19/37.7269/-122.4377"
            height="783px"
            width="556px"
            updateInterval={1000 * 60 * 30} />*/}
          <Memo
            url={process.env.NEXT_PUBLIC_MEMO_URL!} />
        </div>

      </PrivacyProvider>
    </main>
  )
}
