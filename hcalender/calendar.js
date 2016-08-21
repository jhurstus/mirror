/* global Module */

/* Magic Mirror
 * Module: Calendar
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

Module.register("calendar",{

	// Define module defaults
	defaults: {
		maximumEntries: 10, // Total Maximum Entries
		maximumNumberOfDays: 365,
		displaySymbol: true,
		defaultSymbol: "calendar", // Fontawesome Symbol see http://fontawesome.io/cheatsheet/
		displayRepeatingCountTitle: false,
		defaultRepeatingCountTitle: '',
		maxTitleLength: 25,
		fetchInterval: 5 * 60 * 1000, // Update every 5 minutes.
		animationSpeed: 2000,
		fade: true,
		urgency: 7,
		timeFormat: "relative",
		fadePoint: 0.25, // Start on 1/4th of the list.
		calendars: [
			{
				symbol: "calendar",
				url: "http://www.calendarlabs.com/templates/ical/US-Holidays.ics",
			},
		],
		titleReplace: {
			"De verjaardag van ": "",
			"'s birthday": ""
		},
	},

	// Define required scripts.
	getStyles: function() {
		return ["calendar.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

	// Define required translations.
	getTranslations: function() {
		// The translations for the defaut modules are defined in the core translation files.
		// Therefor we can just return false. Otherwise we should have returned a dictionairy.
		// If you're trying to build your own module including translations, check out the documentation.
		return false;
	},

	// Override start method.
	start: function() {
		Log.log("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			calendar.url = calendar.url.replace("webcal://", "http://");
			this.addCalendar(calendar.url);
		}

		this.calendarData = {};
		this.loaded = false;
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "CALENDAR_EVENTS") {
			if (this.hasCalendarURL(payload.url)) {
				this.calendarData[payload.url] = payload.events;
				this.loaded = true;
			}
		} else if (notification === "FETCH_ERROR") {
			Log.error("Calendar Error. Could not fetch calendar: " + payload.url);
		} else if (notification === "INCORRECT_URL") {
			Log.error("Calendar Error. Incorrect url: " + payload.url);
		} else {
			Log.log("Calendar received an unknown socket notification: " + notification);
		}

		this.updateDom(this.config.animationSpeed);
	},

	// Override dom generator.
	getDom: function() {

		var events = this.createEventList();
		var wrapper = document.createElement("table");
		wrapper.className = "small";

		if (events.length === 0) {
			wrapper.innerHTML = (this.loaded) ? this.translate("EMPTY") : this.translate("LOADING");
			wrapper.className = "small dimmed";
			return wrapper;
		}

    var hasEventToday = false;
    var hasRenderedTodaySeparator = false;
    var lastRenderedDay = null;
		for (var e in events) {
			var event = events[e];

			var eventWrapper = document.createElement("tr");
			eventWrapper.className = "normal";

			var titleWrapper = document.createElement("td"),
				repeatingCountTitle = '';


			if (this.config.displayRepeatingCountTitle) {

				repeatingCountTitle = this.countTitleForUrl(event.url);

				if(repeatingCountTitle !== '') {
					var thisYear = new Date().getFullYear(),
						yearDiff = thisYear - event.firstYear;

					repeatingCountTitle = ', '+ yearDiff + '. ' + repeatingCountTitle;
				}
			}

      if (event.today) {
        hasEventToday = true;
      } else if (hasEventToday && !hasRenderedTodaySeparator) {
        hasRenderedTodaySeparator = true;
        var separator = document.createElement('tr');
        separator.innerHTML = '<td colspan="2"><hr></td>';
        wrapper.appendChild(separator);
      }

      var eventMoment = moment(event.startDate, "x");
      if (lastRenderedDay != eventMoment.day()) {
        lastRenderedDay = eventMoment.day();
        var dayHeader = document.createElement('tr');
        dayHeader.innerHTML =
          '<td class="small" style="font-weight:bold;color:#fff;padding:5px 0;" colspan="2">' +
          (event.today ? 'TODAY' : eventMoment.format("dddd").toUpperCase()) +
          '</td>';
        wrapper.appendChild(dayHeader);
      }

			titleWrapper.innerHTML = this.titleTransform(event.title) + repeatingCountTitle;
      if (event.today) {
        titleWrapper.className = "title bright";
      }
			eventWrapper.appendChild(titleWrapper);

			var timeWrapper =  document.createElement("td");
			//console.log(event.today);
			var now = new Date();
			// Define second, minute, hour, and day variables
			var one_second = 1000; // 1,000 milliseconds
			var one_minute = one_second * 60;
			var one_hour = one_minute * 60;
			var one_day = one_hour * 24;
			if (!event.fullDayEvent) {
				if (event.startDate >= new Date()) {
          var timeMoment = moment(event.startDate, "x");
          if (!(timeMoment.hour() == 0 && timeMoment.minute() == 0)) {
            timeWrapper.innerHTML = timeMoment.format("h:mma");
          }
				} else {
					timeWrapper.innerHTML =  this.translate("RUNNING") + ' ' + moment(event.endDate,"x").fromNow(true);
				}
			}
			//timeWrapper.innerHTML += ' - '+ moment(event.startDate,'x').format('lll');
			//console.log(event);
			timeWrapper.className = "time light";
      timeWrapper.innerHTML = timeWrapper.innerHTML
          .replace(" PM", "pm")
          .replace(" AM", "am");
			eventWrapper.appendChild(timeWrapper);

			wrapper.appendChild(eventWrapper);

			// Create fade effect.
			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = events.length * this.config.fadePoint;
				var steps = events.length - startingPoint;
				if (e >= startingPoint) {
					var currentStep = e - startingPoint;
					eventWrapper.style.opacity = 1 - (1 / steps * currentStep);
				}
			}
		}

		return wrapper;
	},

	/* hasCalendarURL(url)
	 * Check if this config contains the calendar url.
	 *
	 * argument url sting - Url to look for.
	 *
	 * return bool - Has calendar url
	 */
	hasCalendarURL: function(url) {
		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			if (calendar.url === url) {
				return true;
			}
		}

		return false;
	},

	/* createEventList()
	 * Creates the sorted list of all events.
	 *
	 * return array - Array with events.
	 */
	createEventList: function() {
		var events = [];
		var today = moment().startOf("day");
		for (var c in this.calendarData) {
			var calendar = this.calendarData[c];
			for (var e in calendar) {
				var event = calendar[e];
				event.url = c;
				event.today = event.startDate >= today && event.startDate < (today + 24 * 60 * 60 * 1000);
				events.push(event);
			}
		}

		events.sort(function(a, b) {
			return a.startDate - b.startDate;
		});

		return events.slice(0, this.config.maximumEntries);
	},

	/* createEventList(url)
	 * Requests node helper to add calendar url.
	 *
	 * argument url sting - Url to add.
	 */
	addCalendar: function(url) {
		this.sendSocketNotification("ADD_CALENDAR", {
			url: url,
			maximumEntries: this.config.maximumEntries,
			maximumNumberOfDays: this.config.maximumNumberOfDays,
			fetchInterval: this.config.fetchInterval
		});
	},

	/* symbolForUrl(url)
	 * Retrieves the symbol for a specific url.
	 *
	 * argument url sting - Url to look for.
	 *
	 * return string - The Symbol
	 */
	symbolForUrl: function(url) {
		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			if (calendar.url === url && typeof calendar.symbol === "string")  {
				return calendar.symbol;
			}
		}

		return this.config.defaultSymbol;
	},
	/* countTitleForUrl(url)
	 * Retrieves the name for a specific url.
	 *
	 * argument url sting - Url to look for.
	 *
	 * return string - The Symbol
	 */
	countTitleForUrl: function(url) {
		for (var c in this.config.calendars) {
			var calendar = this.config.calendars[c];
			if (calendar.url === url && typeof calendar.repeatingCountTitle === "string")  {
				return calendar.repeatingCountTitle;
			}
		}

		return this.config.defaultRepeatingCountTitle;
	},

	/* shorten(string, maxLength)
	 * Shortens a sting if it's longer than maxLenthg.
	 * Adds an ellipsis to the end.
	 *
	 * argument string string - The string to shorten.
	 * argument maxLength number - The max lenth of the string.
	 *
	 * return string - The shortened string.
	 */
	shorten: function(string, maxLength) {
		if (string.length > maxLength) {
			return string.slice(0,maxLength) + "&hellip;";
		}

		return string;
	},

	/* titleTransform(title)
	 * Transforms the title of an event for usage.
	 * Replaces parts of the text as defined in config.titleReplace.
	 * Shortens title based on config.maxTitleLength
	 *
	 * argument title string - The title to transform.
	 *
	 * return string - The transformed title.
	 */
	titleTransform: function(title) {
		for (var needle in this.config.titleReplace) {
			var replacement = this.config.titleReplace[needle];
			title = title.replace(needle, replacement);
		}

		title = this.shorten(title, this.config.maxTitleLength);
    title = title.toLowerCase();
    return title[0].toUpperCase() + title.substr(1);
	}
});
