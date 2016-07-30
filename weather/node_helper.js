var nodeHelper = require('node_helper'),
    console = require('console'),
    fs = require('fs');

module.exports = nodeHelper.create({
  start: function() {
    // Serve js-ified templates on /weather/templates.js
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
    console.log('loading weather templates');
    var templates = {};
    var path = this.path + '/templates/';
    var fileNames = fs.readdirSync(path);
    fileNames.forEach(function(fn) {
      if (!fn.endsWith('.html')) return;
      var content = fs.readFileSync(path + fn, 'utf-8');
      var shortFn = fn.replace(/\.html$/, '');
      templates[shortFn] = content;
    });
    res.send('templates=' + JSON.stringify(templates));
  },

  socketNotificationReceived: function(notification, payload) {
  }
});
