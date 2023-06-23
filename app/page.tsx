import Clock from './modules/clock/clock'
import Memo from './modules/memo/memo'
import Muni from './modules/muni/muni'

export default function Home() {
  return (
    <main>
      <Clock />
      <Muni
        updateInterval={1000 * 30}
        dataAgeLimit={1000 * 60 * 5}
        developerKey={process.env.NEXT_PUBLIC_MUNI_KEY!}
        stops={JSON.parse(process.env.NEXT_PUBLIC_MUNI_STOPS!)} />
      <Memo
        url={process.env.NEXT_PUBLIC_MEMO_URL!} />
    </main>
  )
}
