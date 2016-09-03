var config = {
  port: 8080,

  language: 'en',
  timeFormat: 12,
  units: 'imperial',

  modules: [
    {
      module: 'clock',
      position: 'top_left',
      config: {
        displaySeconds: false
      }
    },
    {
      module: 'hurst/style',
      position: 'top_left'
    },
    {
      module: 'hurst/muni',
      position: 'top_left',
      config: {
        stops: ['48|3463']
      }
    },
    {
      module: 'hurst/memo',
      position: 'bottom_center',
      config: {
        memoUrl: '<your url here>'
      }
    },
    {
      module: 'hurst/hcalendar',
      position: 'top_left',
      config: {
        maximumEntries: 20,
        maximumNumberOfDays: 3,
        displaySymbol: true,
        fadePoint: 10000,
        maxTitleLength: 30,
        fetchInterval: 15 * 60 * 1000,
        calendars: [
          // <your calendars here>
        ],
        timeFormat: 'relative',
        urgency: 7
      }
    },
    {
      module: 'hurst/weather',
      position: 'top_right',
      config: {
        apiKey: 'MUST_PUT_KEY_HERE',
        latLng: '37.700000,-122.400000'
      }
    }
  ]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== 'undefined') {module.exports = config;}
