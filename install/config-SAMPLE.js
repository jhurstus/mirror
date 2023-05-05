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
        // Get a key at: https://511.org/open-data/token
        key: 'required_your_key_here',
        // Stop list: http://api.511.org/transit/stops?api_key=[your_key]&operator_id=SF
        stops: [{line: '48', direction: 'IB', stop: '13463'}]
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
      module: 'hurst/ambientweather',
      position: 'top_right',
      config: {
        visualCrossingApiKey: 'MUST_PUT_KEY_HERE',
        address: '742 Evergreen Terrace, Springfield, IL, USA',
        purpleAirReadKey: 'MUST_PUT_KEY_HERE',
        purpleAirNorthwestLatLng: '37.710000,-122.500000',
        purpleAirSoutheastLatLng: '37.700000,-122.400000'
      }
    },
    {
      module: 'hurst/iframe',
      position: 'bottom_center',
      config: {
        src: 'https://www.google.com/',
        height: '100px',
        width: '100px',
        updateInterval: 1000 * 60 * 5
      }
    }

  ]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== 'undefined') {module.exports = config;}
