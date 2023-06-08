'use client'

import React from 'react';
import './clock.css'

const LOCALE = 'en-US';

// Gets date in the format of "Monday, January 1, 2000".
function formatDate(dateTime: Date): string {
  return dateTime.toLocaleDateString(
    LOCALE,
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
}

// Gets time in the format of "2:23pm".
function formatTime(dateTime: Date): string {
  let hour = dateTime.getHours() % 12;
  if (hour == 0) { hour = 12; }
  const minutes = String(dateTime.getMinutes()).padStart(2, '0');
  const amPm = dateTime.getHours() < 12 ? 'am' : 'pm';

  return `${hour}:${minutes}${amPm}`;
}

// Gets number of milliseconds to wait before attempting the next clock time UI
// update.
function getNextUpdateDelayMilliseconds(): number {
  // To balance performance vs. clock display accuracy, start quadratic zoom in
  // beginning at ~ T-1 second.  This works on the assumption that timer firing
  // should be pretty accurate at second granularity, but suffer greater
  // inaccuracies below that threshold due to event loop overhead and UI thread
  // busyness.  Spamming the scheduler with rAF or setImmediate updates near second
  // boundaries would yield a slightly more precise display, but at much greater
  // processing overhead, which isn't really necessary for a clock that only
  // shows minutes. 
  const date = new Date();
  const remainingSeconds = 60 - date.getSeconds();

  if (remainingSeconds > 1) {
    // Start quadratic zoom-in beginning at ~ T-1.
    return (remainingSeconds - 1) * 1000;
  }
  // N^2 quadratic zoom-in toward 0.
  const remainingMilliseconds = 1000 - date.getMilliseconds();
  return Math.floor(remainingMilliseconds / 2);
}

/**
 * Shows a clock rendering the current day, date, and time.
 */
export default function Clock() {
  const currentDate = new Date();
  const [dateTime, setDateTime] = React.useState(currentDate);

  // The last Date minute value that was rendered.  If current Date minute is
  // different, the component needs to update.  Tracking minute in particular
  // because it is the value updated at the greatest frequency in the UI.
  let lastRenderedMinute = currentDate.getMinutes();

  let updateTimerId: number | undefined;

  function updateLoop(): void {
    const date = new Date();
    if (date.getMinutes() != lastRenderedMinute) {
      lastRenderedMinute = date.getMinutes();
      setDateTime(date);
    }
    updateTimerId = window.setTimeout(updateLoop, getNextUpdateDelayMilliseconds());
  }

  // Stop/start clock update loop on Component un/mount.
  React.useEffect(() => {
    updateLoop();

    return () => {
      window.clearTimeout(updateTimerId);
    };
  }, []);

  return (
    <div>
      <div className="date">{formatDate(dateTime)}</div>
      <div className="time">{formatTime(dateTime)}</div>
    </div>
  )
}