import Clock from './modules/clock/clock'
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
    </main>
  )
}
