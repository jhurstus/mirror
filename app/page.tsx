import Clock from './modules/clock/clock'
import Memo from './modules/memo/memo'
import Muni from './modules/muni/muni'
import Weasley from './modules/weasley/weasley'

export default function Home() {
  return (
    <main>
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
        homeCity='San Francisco' />
      <Memo
        url={process.env.NEXT_PUBLIC_MEMO_URL!} />
    </main>
  )
}
