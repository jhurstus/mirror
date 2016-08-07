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
      module: 'hurst/weather',
      position: 'top_right',
      config: {
      }
    }
  ]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== 'undefined') {module.exports = config;}
