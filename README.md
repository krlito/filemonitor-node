#filemonitor-node

This node module is a thin wrapper around the [inotifywait][] command. It can be used to monitor and act upon file system events. 
Filemonitor-node can be used to monitor events on files or directories. When a directory is monitored, events are returned
for the directory itself and its files.


##Requirements

Filemonitor-node depends on [inotify-tools]. To install inotify-tools on a Linux (Debian/Ubuntu) system:

    sudo apt-get install inotify-tools

For installing on other linux flavors, go [here][getting-inotify-tools].


##Installation

On your project directory:

    npm install filemonitor


##Events

The following events are captured by the module:

- **access**: A watched file or a file within a watched directory was read from.
- **modify**: A watched file or a file within a watched directory was written to.
- **attrib**: The metadata of a watched file or a file within a watched directory was modified. This includes timestamps, 
  file permissions, extended attributes etc.
- **close_write**: A watched file or a file within a watched directory was closed, after being opened in writeable mode.
  This does not necessarily imply the file was written to.
- **close_nowrite**: A watched file or a file within a watched directory was closed, after being opened in read-only mode.
- **close**: A watched file or a file within a watched directory was closed, regardless of how it was opened. Note that this 
  is actually implemented simply by listening for both close_write and close_nowrite, hence all close events received will 
  be output as one of these, not CLOSE.
- **open**: A watched file or a file within a watched directory was opened.
- **moved_to**: A file or directory was moved into a watched directory. This event occurs even if the file is simply moved 
  from and to the same directory.
- **moved_from**: A file or directory was moved from a watched directory. This event occurs even if the file is simply moved 
  from and to the same directory.
- **move**: A file or directory was moved from or to a watched directory. Note that this is actually implemented simply by 
  listening for both moved_to and moved_from, hence all close events received will be output as one or both of these, not MOVE.
- **move_self**: A watched file or directory was moved. After this event, the file or directory is no longer being watched.
- **create**: A file or directory was created within a watched directory.
- **remove**: A file or directory within a watched directory was deleted.
- **remove_self**: A watched file or directory was deleted. After this event the file or directory is no longer being watched.
  Note that this event can occur even if it is not explicitly being listened for.
- **unmount**: The filesystem on which a watched file or directory resides was unmounted. After this event the file or directory 
  is no longer being watched. Note that this event can occur even if it is not explicitly being listened to.


##Usage

To monitor a file is as easy as:

```javascript
    var filemon = require('filemonitor');
    
    var onFileEvent = function (ev) {
      var filetype = ev.isDir ? "directory" : "file";
      console.log("Event " + ev.eventId + " was captured for " + filetype + " " + ev.filename + " on time: " + ev.timestamp.toString());
    }

    var options = {
      target: "./docs/myfile.txt",
      listeners: {
        all_events: onFileEvent
      }
    }
    
    filemon.watch(options);
```

In the previous example, the module was instantiated. Then, an options object is set including a target file and a callback function in case an event is captured.
Finally, `filemon.watch(options)` is called to start monitoring.


###Event Object
Each time an event is captured, its callback is called passing an event object as argument. This object has the following properties:
- **filename** is a string with the relative path to the watched file/directory.
- **eventId** is a string whose value is one of the events names described in *Events* section.
- **isDir** is `true` if what is being watched is a directory. Otherwise, `false`.
- **timestamp** is a Date object. It has the datetime at which the event was captured.


###Options
The options to configure filemonitor-node include:
- **target** is an array of strings containing files/directories to be watched. (default: current directory `["."]`).
- **recursive** is a boolean. When `true`, nested files in the subdirectories of the *target* directories will be also watched (recursively).
  Normally, these nested files are excluded from any monitoring.  (default: `false`).
- **exclude** is an array of string containg files/directories to be excluded from watching. This is very useful when watching
  directories. (default: empty array `[]`).
- **dismissQueuedEvents** is `true` for dismissing events that are already pending. If a previously captured event has not been. (default: `true`).
- **listeners** is an object for mapping events to callbacks. Listener's keys can be any of the event names described in section *Events*. 
  Each of these keys must have assigned a callback as a value.  The special key `all_events` matches a callback to all event. (default: empty object `{}`).


###More examples

For monitoring a complete directory waiting for newly created files:

```javascript
    var filemon = require('filemonitor');
    
    var onFileEvent = function (ev) {
      console.log("File " + ev.filename + " triggered event " + ev.eventId + " on " + ev.timestamp.toString());
    }

    var onFileCreation = function (ev) {
      console.log("File " + ev.filename + " was created on " + ev.timestamp.toString());
    }

    var options = {
      recursive: false,
      target: "./docs/",
      listeners: {
        all_events: onFileEvent,
        create: onFileCreation
      }
    }
    
    filemon.watch(options);
```


Another example for watching multiple files and excluding some others:
 
```javascript
    var filemon = require('filemonitor');
    
    var onFileChange = function (ev) {
      //... Do Something
    }

    var onFileCreation = function (ev) {
      //... Do Something
    }

    var options = {
      recursive: false,
      target: ["./docs/", "./config/app.config"],
      exclude: ["./docs/myfile1.txt", "./docs/myfile10.txt"],
      listeners: {
        modify: onFileChange,
        create: onFileCreation
      }
    }
    
    filemon.watch(options);
```

###Other comments...
- Once the `watch` function has been called, options cannot be changed.
- Monitoring can be stopped calling function `filemon.stop()`.
- For monitoring a single file, it should be easier to use `watch` 
  in the standard file system node.js API.

[inotifywait]: http://github.com/rvoicilas/inotify-tools/wiki
[inotify-tools]: http://github.com/rvoicilas/inotify-tools/wiki
[getting-inotify-tools]: http://github.com/rvoicilas/inotify-tools/wiki/#wiki-getting

