/*!
* filemonitor-node
* Copyright(c) 2012 Carlos Campo <carlos@campo.com.co>
* MIT Licensed
*/

//Dependencies
var spawn = require('child_process').spawn;

//filemonitor options
var options = {
  recursive: false,
  listeners: {},
  exclude: [],
  target: ["."],
  dismissQueuedEvents: true
};


// ChildProcess instance
var inotify;

// Event callbacks pending to be run
var queuedEvents = {};

//inotifywait status flag
var watching = false;

// PUBLIC EXPORTS //

var filemonitor = module.exports = {

  /*
   * Set filemonitor options
   */
  configure: function (opts) {
    if (watching) { throw new Error("Already watching."); }

    if (typeof opts.recursive === "boolean") {
      options.recursive = opts.recursive;
    }

    if (typeof opts.listeners === "object") {
      options.listeners = opts.listeners;
    }

    if (Array.isArray(opts.exclude)) {
      options.exclude = opts.exclude;
    }

    if (typeof opts.exclude === "string") {
      options.exclude = [ opts.exclude ];
    }

    if (Array.isArray(opts.target)) {
      options.target = opts.target;
    }

    if (typeof opts.target === "string") {
      options.target = [ opts.target ];
    }

    if (typeof opts.dismissQueuedEvents === "boolean") {
      options.dismissQueuedEvents = opts.dismissQueuedEvents;
    }
  },

  /*
   * Start monitoring
   */
  watch: function (opts) {
    if (watching) { throw new Error("Already watching."); }
    if (opts) { filemonitor.configure(opts); }

    //Call inotifywait
    inotify = spawn("inotifywait", inotifywaitArgs());

    inotify.stdout.on('data', watchEvents);
    inotify.stderr.on('data', function (data) { throw new Error(data.toString()); });
    inotify.on('exit', function (code) { if (code !== null && parseInt(code, 10) !== 0) { throw new Error("Exit code: " + code); } });

    watching = true;
  },

  /*
   * Stop monitoring
   */
  stop: function () {
    process.nextTick(function () {
      inotify.kill();
      watching = false;
    });
  },

  /*
   * Manually trigger an event
   */
  trigger: function(ev) {
    if (!options.dismissQueuedEvents || !queuedEvents[ev.filename + ":" + ev.eventId]) {
      queuedEvents[ev.filename + ":" + ev.eventId] = true;
      
      if(!ev.timestamp) {ev.timestamp = new Date()};
      process.nextTick(function () {
        if (options.listeners.all_events) { options.listeners.all_events(ev); }
        if (options.listeners[ev.eventId]) { options.listeners[ev.eventId](ev); }
        queuedEvents[ev.filename + ":" + ev.eventId] = null;
      });
    }
  }                                                 
};


// PRIVATE FUNCTIONS //

/*
 * Get inotifywait arguments
 */
function inotifywaitArgs() {
  var listener,
    args = ["-m", "-q",
      options.recursive ? "-r" : "",
      "--timefmt",
      "%d %b %Y %T %z",
      "--format",
      ",{\"filename\": \"%w%f\", \"eventId\": \"%e\", \"timestamp\": \"%T\"}"];

  if (!options.listeners.all_events) {
    for (listener in options.listeners) {
      if (options.listeners.hasOwnProperty(listener)) {
        listener = listener.replace("remove", "delete");
        args.push("-e", listener);
      }
    }
  }

  options.exclude.forEach(function (ex) { args.push("@" + ex); });

  args.push.apply(args, options.target);

  return args;
}

/*
 * Catch events and run registered callbacks
 */
function watchEvents(data) {
  var events = JSON.parse("[" + data.toString().substr(1) + "]");

  events.forEach(function (ev) {
    var eventIds = ev.eventId.toLowerCase().split(","),
      isdirIdx = eventIds.indexOf("isdir");

    if (isdirIdx === -1) {
      ev.isDir = false;
    } else {
      eventIds.splice(isdirIdx, 1);
      ev.isDir = true;
    }

    eventIds.forEach(function (eventId) {
      eventId = eventId.replace("delete", "remove");
      if (!options.dismissQueuedEvents || !queuedEvents[ev.filename + ":" + eventId]) {
        queuedEvents[ev.filename + ":" + eventId] = true;

        ev.eventId = eventId;
        ev.timestamp = new Date(ev.timestamp);

        process.nextTick(function () {
          if (options.listeners.all_events) { options.listeners.all_events(ev); }
          if (options.listeners[eventId]) { options.listeners[eventId](ev); }
          queuedEvents[ev.filename + ":" + eventId] = null;
        });
      }
    });
  });
}

