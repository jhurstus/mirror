Module.register("weasley", {
  defaults: {
    firebaseConfig: {},
    // Firebase email auth.
    email: '',
    password: '',
    // Map of users to track (user id to display name).
    users: {},
    homeCountry: 'United States',
    homeState: 'California',
    homeCity: 'San Francisco',
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

    this.fences = [];
    this.locations = [];
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
    this.db.ref('mirror/geofences').on('value', function(snapshot) {
      that.updateGeofences(snapshot.val());
    });
    this.db.ref('users').on('value', function(snapshot) {
      that.updateLocations(snapshot.val());
    });
  },

  showPrivateInfo: function(show) {
    document.body.classList[show ? 'remove' : 'add']('private');
  },

  updateGeofences: function(fences) {
    this.fences = fences;
    this.updateDom(this.config.animationDuration);
  },

  updateLocations: function(users) {
    this.locations = [];
    for (var id in users) {
      if (this.config.users[id] && users[id].shareLocation) {
        var loc = users[id].location;
        var name = this.config.users[id];
        this.locations.push({name: name, loc: loc});
      }
      this.locations.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });
    }
    this.updateDom(this.config.animationDuration);
  },

  getDom: function() {
    if (!this.db) {
      return document.createElement('div');
    }

    this.dom = document.createElement('div');
    this.dom.innerHTML = this.mainTemplate(this.getViewModel());
    return this.dom;
  },

  getViewModel: function() {
    var r = {people: []};
    for (var i = 0; i < this.locations.length; i++) {
      r.people.push(this.getLocationDescription(this.locations[i]));
    }
    return r;
  },

  // Gets a textual description of the passed location.
  getLocationDescription: function(loc) {
    var p = loc.name + ' is ';
    var l = loc.loc;

    var fence = this.isInGeofence(l);
    if (fence) {
      if (fence.toLowerCase() == 'home') {
        p += fence;
      } else {
        p += 'at ' + fence;
      }
    } else if (l.country == this.config.homeCountry &&
        l.city == this.config.homeCity) {
      p += 'out and about';
    } else if (l.country == this.config.homeCountry &&
        l.state == this.config.homeState) {
      p += 'in ' + l.city;
    } else if (l.country == this.config.homeCountry) {
      p += 'in ' + l.city + ', ' + l.state;
    } else {
      p += 'in ' + l.city + ', ' + l.country;
    }

    return p;
  },

  // Whether the passed location is in any defined geofence.  If so, the label
  // for that fence.
  isInGeofence: function(l) {
    for (var i = 0; i < this.fences.length; i++) {
      var f = this.fences[i];
      var dist = this.haversineDistance(l.lat, l.lng, f.lat, f.lng);
      if (dist <= f.radius) {
        return f.label;
      }
    }

    return false;
  },

  // Returns distance between two lat/longs, in meters.
  haversineDistance: function(lat1, lng1, lat2, lng2) {
    function toRadians(x) { return x * Math.PI / 180; }
    var r = 6371;  // approx. radius of earth, km
    var x1 = lat2 - lat1;
    var dLat = toRadians(x1);
    var x2 = lng2 - lng1;
    var dLng = toRadians(x2);
    var a = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.pow(Math.sin(dLng / 2), 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 1000 * r * c;
  }

});
