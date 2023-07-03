'use client';

import styles from './calendar.module.css'
import './calendar_global.css'
import { Duration, EventRenderRange, createPlugin, sliceEvents } from '@fullcalendar/core'
import iCalendarPlugin from '@fullcalendar/icalendar'
import { DateProfile, ViewProps } from '@fullcalendar/core/internal'
import FullCalendar from '@fullcalendar/react'
import moment from 'moment'
import { createContext, createRef, useContext, useEffect } from 'react';
import { IsInPrivacyModeContext } from '../privacy/privacy';

export type CalendarProps = {
  calendars: [CalendarConfigs, ...CalendarConfigs[]];
  maxTitleLength: number;
  updateInterval: number;
};
export type CalendarConfigs = {
  // URL from which ICS for this calendar can be downloaded.
  icsUrl: string;
  // Whether to show events from this calendar in italics.
  italic?: boolean;
};

interface CalendarData {
  // Today and tomorrow.
  days: [CalendarDay, CalendarDay]
}
interface CalendarDay {
  // Label shown at the top of the day.
  label: string;
  events: CalendarEvent[];
}
interface CalendarEvent {
  title: string;
  time: string;
  italic?: boolean;
  id: string;
}

// FullCalendar does not provide a way to pass props to the custom view
// component, so we pass down our props as context instead.
const CalendarViewContext = createContext<CalendarProps | undefined>(undefined);

export default function Calendar(props: CalendarProps) {
  const calendarRef = createRef<FullCalendar>();
  const isInPrivacyMode = useContext(IsInPrivacyModeContext);

  useEffect(() => {
    const interval = window.setInterval(() => {
      calendarRef.current?.getApi().refetchEvents();
    }, props.updateInterval);
    return () => window.clearInterval(interval);
  }, [props.updateInterval, calendarRef]);

  if (isInPrivacyMode) {
    return <></>;
  }

  return (
    // Google Calendar stores times as 'UTC', but actually adjusts for local
    // event timezone.  Correct for that here by setting the display timezone
    // to UTC.
    // For that same reason, day/duration ranges don't line up with local
    // timezone, so request an extra day of data and later filter out events
    // past tomorrow midnight local time.  This works because my local timezone
    // is UTC-X (vs. UTC+X).
    <CalendarViewContext.Provider value={props}>
      <FullCalendar
        ref={calendarRef}
        timeZone='UTC'
        plugins={[iCalendarPlugin, customViewPlugin]}
        initialView="custom"
        initialDate={moment(new Date()).subtract(1, 'day').toDate()}
        headerToolbar={false}
        footerToolbar={false}
        themeSystem="bootstrap5"
        duration={{ days: 4 }}
        eventSources={
          props.calendars.map((c) => {
            return {
              url: `/api/modules/calendar/calendar?url=${encodeURIComponent(c.icsUrl)}`,
              format: 'ics',
              classNames: c.italic ? ['italic'] : [],
            }
          })
        }
      />
    </CalendarViewContext.Provider>
  );
}

// A displayed day in the calendar (either 'today' or 'tomorrow').
function Day(day: CalendarDay) {
  const calendarProps: CalendarProps = useContext(CalendarViewContext)!;

  if (day.events.length == 0) return <></>;

  return (
    <>
      <tr><th className={styles.label} colSpan={2}>{day.label}</th></tr>
      {day.events.map((event) => {
        return (
          <tr key={event.id}>
            <td className={styles.time}>{event.time}</td>
            <td
              className={styles.title}
              style={{ fontStyle: event.italic ? 'italic' : 'normal' }}>{
                event.title.length > calendarProps.maxTitleLength! ?
                  event.title.substring(0, calendarProps.maxTitleLength!) + String.fromCharCode(0x2026) :
                  event.title
              }</td>
          </tr>
        );
      })}
    </>
  );
}

// The main calendar UI, slotted into FullCalendar as a "custom view".
function CustomView(props: ViewProps & { dateProfile: DateProfile, nextDayThreshold: Duration }) {
  const segs = sliceEvents(props, true);
  const customCalProps = fullCalendarDataToProps(segs);

  if (customCalProps.days[0].events.length == 0 && customCalProps.days[1].events.length == 0) {
    return <div className={styles.none}>No upcoming events</div>
  }

  return (
    <table className={styles.calendar}>
      <tbody>
        <Day {...customCalProps.days[0]} />
        <Day {...customCalProps.days[1]} />
      </tbody>
    </table>
  );
}

// View plugin for FullCalendar that displays a custom calendar UI.
const customViewPlugin = createPlugin({
  views: {
    // The props required for a CustomView are slightly (and weirdly) different
    // than those specified in the createPlugin interface.  I don't use those
    // options, so it's not a problem in practice, but have to override TS check
    // for that reason.
    // @ts-ignore
    custom: CustomView
  }
})

// Converts FullCalendar event data to the format used by Day component props.
function fullCalendarDataToProps(data: EventRenderRange[]): CalendarData {
  data = [...data].sort(calendarEventsCompareFn);

  const todayEvents: CalendarEvent[] = [];
  const tomorrowEvents: CalendarEvent[] = [];
  const now = new Date();

  for (const event of data) {
    const start = getEventStartTime(event);
    const end = getEventEndTime(event);

    // As noted above, FullCalendar returns 3 days of data, so filter out events
    // beginning after the end of tomorrow.
    if (start > moment().endOf('day').add(1, 'day').toDate()) {
      continue;
    }
    // Filter out events that have already ended.
    if (end < now) {
      continue;
    }

    if (event.def.allDay) {
      if (start < moment().endOf('day').toDate()) {
        todayEvents.push(eventRenderRangeToCalendarEvent(event));
      }
      if (end > moment().endOf('day').add(1, 'hours').toDate()) {
        tomorrowEvents.push(eventRenderRangeToCalendarEvent(event));
      }
    } else {
      if (start > moment().endOf('day').toDate()) {
        tomorrowEvents.push(eventRenderRangeToCalendarEvent(event));
      } else {
        todayEvents.push(eventRenderRangeToCalendarEvent(event));
      }
    }
  }

  return {
    days: [
      { label: 'Today', events: todayEvents },
      { label: 'Tomorrow', events: tomorrowEvents }
    ] as [CalendarDay, CalendarDay]
  };
}

// Converts FullCalendar's event model to our CalendarEvent model.
function eventRenderRangeToCalendarEvent(event: EventRenderRange): CalendarEvent {
  return {
    title: event.def.title[0].toUpperCase() + event.def.title.substring(1),
    time: event.def.allDay ?
      'All day' :
      moment(event.instance?.range.start).format('h:mma'),
    italic: event.ui.classNames.includes('italic'),
    id: event.instance?.instanceId || event.def.defId,
  };
}

// An Array#sort comparefn that sorts events by:
// 1. All day events (alphabetically by title).
// 2. Timed events (chronologically by start time).
function calendarEventsCompareFn(a: EventRenderRange, b: EventRenderRange): number {
  if (a.def.allDay && !b.def.allDay) {
    return -1;
  } else if (!a.def.allDay && b.def.allDay) {
    return 1;
  } else if (a.def.allDay && b.def.allDay) {
    return a.def.title.localeCompare(b.def.title);
  }

  if (a.instance?.range.start && b.instance?.range.start) {
    return a.instance.range.start.getTime() - b.instance.range.start.getTime();
  }
  return 0;
}

// Gets the corrected start time of a FullCalendar event.
function getEventStartTime(event: EventRenderRange): Date {
  if (event.def.allDay) {
    // All day event start/end times are not timezone adjusted, so do that
    // here.
    return moment(event.instance!.range.start).add(new Date().getTimezoneOffset(), 'minutes').toDate();
  }

  return event.instance!.range.start;
}

// Gets the corrected end time of a FullCalendar event.
function getEventEndTime(event: EventRenderRange): Date {
  if (event.def.allDay) {
    // All day event start/end times are not timezone adjusted, so do that
    // here.
    return moment(event.instance!.range.end).add(new Date().getTimezoneOffset(), 'minutes').toDate();
  }

  return event.instance!.range.end!;
}