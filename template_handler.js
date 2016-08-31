var fs = require('fs');

// Express request handler that responds with a JS program that contains all
// templates/*.html files as strings in a top-level 'templates' objects.  This
// allows template files to be loaded as strings in MagicMirror module scripts.
//
// For example, if templates/foobar.html exists, the response would be like:
// templates.moduleName={foobar:'...content of foobar.html...'};
// ... for a request to /moduleName/templates.js.
//
// expressApp: the express app instance to bind request handler to
// name: name of the associated MagicMirror module
// path: path of the associated MagicMirror module
var TemplateHandler = function(expressApp, name, path) {
  this.expressApp = expressApp;
  this.name = name;
  this.path = path;
};

// Install express app request handler.  This must be called from the associated
// module's node_helper.js #start method.
TemplateHandler.prototype.installTemplateHandler = function() {
  this.expressApp.get(
      '/' + this.name + '/templates.js', this.handleRequest.bind(this));
};

TemplateHandler.prototype.handleRequest = function(req, res) {
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
};

module.exports = TemplateHandler;
