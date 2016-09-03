Module.register("style", {
  defaults: {
  },

  start: function() {
  },

  getStyles: function() {
    // Noop '&.css' CGI param needed to trick magicmirror loader into thinking
    // the URL points to a CSS file.
    return [
      this.file('styles.css')
    ];
  },

  getDom: function() {
    return document.createElement('span');
  }

});
