'use client';

import { useEffect, useState } from 'react';
import styles from './calendar.module.css';

interface CalendarData {
  days: [CalendarDay, CalendarDay]
}
interface CalendarDay {
  label: string;
  events: CalendarEvent[];
}
interface CalendarEvent {
  title: string;
  time: string;
  italic?: boolean;
  id: string;
}

export default function Calendar() {
  const [data, setData] = useState<CalendarData>();

  useEffect(() => {
    setData(STUB_DATA);
  }, [setData]);

  const STUB_DATA: CalendarData = {
    days: [
      {
        label: 'Today',
        events: [
          { title: 'Bananas', time: 'All day', italic: true, id: '1' },
        ],
      },
      {
        label: 'Tomorrow',
        events: [
          { title: 'And oranges', time: 'All day', id: '2' },
        ]
      }
    ]
  };

  if (!data) return <></>;

  if (data.days[0].events.length == 0 && data.days[1].events.length == 0) {
    return <div className={styles.none}>No upcoming events</div>
  }

  return (
    <table className={styles.calendar}>
      <Day {...data.days[0]} />
      <Day {...data.days[1]} />
    </table>
  )
}

function Day(day: CalendarDay) {
  if (day.events.length == 0) return <></>;

  return (
    <>
      <tr><th className={styles.label} colSpan={2}>{day.label}</th></tr>
      {day.events.map((event) => {
        return (
          <tr key={event.id}>
            <td className={styles.time}>{event.time}</td>
            <td className={styles.title} style={{ fontStyle: event.italic ? 'italic' : 'normal' }}>{event.title}</td>
          </tr>
        );
      })}
    </>
  );
}