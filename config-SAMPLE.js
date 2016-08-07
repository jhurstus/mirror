/* Magic Mirror Config Sample
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

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
      module: 'hurst/muni',
      position: 'top_left',
      config: {
        stops: ['48|3463']
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
