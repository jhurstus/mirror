var nodeHelper = require('node_helper'),
    request = require('request'),
    console = require('console'),
    fs = require('fs');

module.exports = nodeHelper.create({
  start: function() {
    // Serve js-ified templates on /muni/templates.js
    this.expressApp.get(
        '/' + this.name + '/templates.js', this.templatesHandler.bind(this));
  },

  // Respond with a JS program that contains all templates/*.html files as
  // strings in a top-level 'templates' objects.  This allows template files
  // to be loaded as strings in the module script.
  //
  // For example, if templates/foobar.html exists, the response would be:
  // templates={foobar:'...content of foobar.html...'};
  templatesHandler: function(req, res) {
    var templates = {};
    var path = this.path + '/templates/';
    var fileNames = fs.readdirSync(path);
    fileNames.forEach(function(fn) {
      if (!fn.endsWith('.html')) return;
      var content = fs.readFileSync(path + fn, 'utf-8');
      var shortFn = fn.replace(/\.html$/, '');
      templates[shortFn] = content;
    });
    res.send('templates=window.templates||{};templates.' +
        this.name + '=' + JSON.stringify(templates));
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'predictions') {
      var url = 'http://webservices.nextbus.com' +
          '/service/publicXMLFeed' +
          '?command=predictionsForMultiStops' +
          '&a=' + payload.agency;
      for (var i = 0; i < payload.stops.length; i++) {
        url += '&stops=' + payload.stops[i];
      }

      var self = this;
      request(url, (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        if (response.statusCode != 200) {
          console.log(
              'predictions response status code ' + response.statusCode);
          return;
        }
        self.sendSocketNotification('predictions', body);
      });
    }
  }
});
