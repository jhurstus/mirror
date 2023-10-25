'use client';

import Abode from './modules/abode/Abode';
import Calendar from './modules/calendar/calendar';
import Clock from './modules/clock/clock'
import Memo from './modules/memo/memo'
import Muni from './modules/muni/muni'
import { PrivacyProvider } from './modules/privacy/privacy'
import Weasley from './modules/weasley/weasley'
import Weather from './modules/weather/weather';

export default function Home() {
  return (
    <main>
      <PrivacyProvider>

        <Clock />
        <Muni
          updateInterval={1000 * 30}
          dataAgeLimit={1000 * 60 * 5}
          developerKey={process.env.NEXT_PUBLIC_MUNI_KEY!}
          stops={JSON.parse(process.env.NEXT_PUBLIC_MUNI_STOPS!)} />
        <Calendar
          calendars={JSON.parse(process.env.NEXT_PUBLIC_CALENDAR_CALENDARS!)}
          maxTitleLength={40}
          updateInterval={1000 * 60 * 15} />
        <Weasley
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
          <Memo />
        </div>
        <Abode />

      </PrivacyProvider>
    </main>
  )
}
