var spawn = require('child_process').spawn;

var options = {
  recursive: false,
  listeners: {},
  excludes: [],
  targets: [],
  dismissQueuedEvents: true
};

var inotify, queuedEvents = {};

var filemonitor = module.exports = {
         
  configure: function (opts) {
    if (typeof opts.recursive === "boolean") {
      options.recursive = opts.recursive;
    }

    if (typeof opts.listeners === "object") {
      options.listeners = opts.listeners;
    }

    if (Array.isArray(opts.excludes)) {
      options.excludes = opts.excludes;
    }

    if (typeof opts.excludes === "string") {
      options.excludes = [ opts.excludes ];
    }

    if (Array.isArray(opts.targets)) {
      options.targets = opts.targets;
    }              

    if (typeof opts.targets === "string") {
      options.targets = [ opts.targets ];
    }

    if (typeof opts.dismissQueuedEvents === "boolean") {
      options.dismissQueuedEvents = opts.dismissQueuedEvents;
    }
  },

  watch: function (opts) {
    if (opts) { filemonitor.configure(opts); }

    inotify = spawn("inotifywait", inotifywaitArgs());

    inotify.stdout.on('data', watchEvents);
    inotify.stderr.on('data', function (data) { throw new Error(data.toString()); });
    inotify.on('exit', function (code) { if (parseInt(code) !== 0) { throw new Error("Exit code: " + code); } });

  },

  stop: function (opts) {
    process.nextTick(inotify.kill);
  }
};

function inotifywaitArgs() {
  var listener,
      args = ["-m", "-q",
      options.recursive ? "-r" : "",
      "--timefmt",
      "%d %b %Y %T %z",
      "--format",
      ",{\"filename\": \"%w%f\", \"eventIds\": \"%e\", \"timestamp\": \"%T\"}"];

  if (!options.listeners.all_events) {
    for (listener in options.listeners) {
      if (options.listeners.hasOwnProperty(listener)) {
        args.push("-e " + listener);
      }
    }
  }

  options.excludes.forEach(function (exclude) { args.push("@" + exclude); });

  args.push.apply(args, options.targets);

  return args;
}

function watchEvents (data) {
  var events = JSON.parse("[" + data.toString().substr(1) + "]");
  
  events.forEach(function (ev) {
    ev.eventIds = ev.eventIds.toLowerCase().split(",");
    ev.timestamp = new Date(ev.timestamp);

    ev.eventIds.forEach(function (eventId) {
      if (!options.dismissQueuedEvents || !queuedEvents[ev.filename + ":" + eventId]) {
        queuedEvents[ev.filename + ":" + eventId] = true;
        process.nextTick(function () {
          if (options.listeners.all_events(ev)) { options.listeners.all_events(ev); };
          if (options.listeners[eventId]) { options.listeners[eventId](ev); };
          queuedEvents[ev.filename + ":" + eventId] = null; 
        });
      }
    });
  });
}
