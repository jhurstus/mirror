// See: https://firebase.google.com/docs/web/learn-more#config-object
export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  storageBucket: string;
  messagingSenderId: string;
};

export type WeasleyProps = {
  firebaseConfig: FirebaseConfig;
  // Firebase email auth.
  email: string;
  password: string;
  // Map of users to track (firebase user id to display name).
  users: Map<string, string>;
  // Location jurisdiction of the display.
  homeCountry: string;
  homeState: string;
  homeCity: string;
};

export default function Weasley({
  firebaseConfig,
  email,
  password,
  users,
  homeCountry,
  homeState,
  homeCity
}: WeasleyProps) {

  // {{#if people.length}}
  // <div>
  //   <ul>
  //   {{#each people}}
  //     <li class="bright normal">
  //       {{this}}
  //     </li>
  //   {{/each}}
  //   </ul>
  // </div>
  // {{/if}}

  return <div>Weasley</div>
};

// Module.register("weasley", {
//   defaults: {
// 
//   start: function() {
//     firebase.initializeApp(this.config.firebaseConfig);
//     var that = this;
//     firebase.auth().signInWithEmailAndPassword(
//         this.config.email, this.config.password).then(
//           function(user) {
//             that.bindDb();
//           },
//           function(error) {
//             Log.error(error);
//           });
// 
//     this.db = null;
//     this.dom = null;
// 
//     this.fences = [];
//     this.locations = [];
//   },
// 
//   getScripts: function() {
//     return [
//       'https://www.gstatic.com/firebasejs/3.4.0/firebase.js',
//     ];
//   },
// 
//   bindDb: function() {
//     this.db = firebase.database();
//     var that = this;
//     this.db.ref('mirror/config/showPrivateInfo').on('value', function(snapshot) {
//       that.showPrivateInfo(snapshot.val());
//     });
//     this.db.ref('mirror/geofences').on('value', function(snapshot) {
//       that.updateGeofences(snapshot.val());
//     });
//     this.db.ref('users').on('value', function(snapshot) {
//       that.updateLocations(snapshot.val());
//     });
//   },
// 
//   showPrivateInfo: function(show) {
//     document.body.classList[show ? 'remove' : 'add']('private');
//   },
// 
//   updateGeofences: function(fences) {
//     this.fences = fences;
//     this.updateDom(this.config.animationDuration);
//   },
// 
//   updateLocations: function(users) {
//     this.locations = [];
//     for (var id in users) {
//       if (this.config.users[id] && users[id].shareLocation) {
//         var loc = users[id].location;
//         var name = this.config.users[id];
//         this.locations.push({name: name, loc: loc});
//       }
//     }
//     this.updateDom(this.config.animationDuration);
//   },
// 
//   getDom: function() {
//     if (!this.db) {
//       return document.createElement('div');
//     }
// 
//     this.dom = document.createElement('div');
//     this.dom.innerHTML = this.mainTemplate(this.getViewModel());
//     return this.dom;
//   },
// 
//   getViewModel: function() {
//     var r = {people: []};
// 
//     var descriptionToNames = {};
//     for (var i = 0; i < this.locations.length; i++) {
//       var desc = this.getLocationDescription(this.locations[i]);
//       if (!descriptionToNames[desc]) {
//         descriptionToNames[desc] = [];
//       }
//       descriptionToNames[desc].push(this.locations[i].name);
//     }
// 
//     for (var d in descriptionToNames) {
//       if (descriptionToNames.hasOwnProperty(d)) {
//         var names = descriptionToNames[d];
//         if (names.length == 1) {
//           r.people.push(names[0] + ' is ' + d);
//         } else if (names.length == 2) {
//           r.people.push(names[0] + ' and ' + names[1] + ' are ' + d);
//         } else {
//           var p = '';
//           for (var i = 0; i < names.length - 2; i++) {
//             p += names[i] + ', ';
//           }
//           p += names[names.length - 2] + ', and ';
//           p += names[names.length - 1] + ' are ' + d;
//           r.people.push(p);
//         }
//       }
//     }
// 
//     return r;
//   },