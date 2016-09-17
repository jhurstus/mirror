Module.register("weasley", {
  defaults: {
    firebaseConfig: {},
    email: '',
    password: '',
    // Duration in milliseconds for animating in new locations.
    animationDuration: 500  // 0.5 seconds
  },

  start: function() {
    this.mainTemplate = Handlebars.compile(templates.weasley.main);

    firebase.initializeApp(this.config.firebaseConfig);
    var that = this;
    firebase.auth().signInWithEmailAndPassword(
        this.config.email, this.config.password).then(
          function(user) {
            that.bindDb();
          },
          function(error) {
            Log.error(error);
          });

    this.db = null;
    this.dom = null;
  },

  getScripts: function() {
    return [
      'https://www.gstatic.com/firebasejs/3.4.0/firebase.js',
      '/modules/hurst/shared/vendor/handlebars.js',
      '/weasley/templates.js'
    ];
  },

  getStyles: function() {
    return [this.file('styles.css')];
  },

  bindDb: function() {
    this.db = firebase.database();
    var that = this;
    this.db.ref('mirror/config/showPrivateInfo').on('value', function(snapshot) {
      that.showPrivateInfo(snapshot.val());
    });
  },

  showPrivateInfo: function(show) {
    document.body.classList[show ? 'remove' : 'add']('private');
  },

  getDom: function() {
    if (!this.db) {
      return document.createElement('div');
    }

    this.dom = document.createElement('div');
    this.dom.innerHTML = this.mainTemplate({});
    return this.dom;
  }

});
