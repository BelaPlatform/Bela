[![Build Status](https://secure.travis-ci.org/STRML/node-toobusy.png)](http://travis-ci.org/STRML/node-toobusy)

# Is Your Node Process Too Busy?

`toobusy-js` is a fork of lloyd's [node-toobusy](http://github.com/lloyd/node-toobusy) that removes native dependencies
in favor of using the `unref` introduced in [node 0.9.1](http://blog.nodejs.org/2012/08/28/node-v0-9-1-unstable/).

This package is a simpler install without native dependencies, but requires node >= 0.9.1.

## Node-Toobusy

What happens when your service is overwhelmed with traffic?
Your server can do one of two things:

  * Stop working, or...
  * Keep serving as many requests as possible

This library helps you do the latter.

## How it works

`toobusy` polls the node.js event loop and keeps track of "lag",
which is long requests wait in node's event queue to be processed.
When lag crosses a threshold, `toobusy` tells you that you're *too busy*.
At this point you can stop request processing early
(before you spend too much time on them and compound the problem),
and return a "Server Too Busy" response.
This allows your server to stay *responsive* under extreme load,
and continue serving as many requests as possible.

## installation

```
npm install toobusy-js
```


## usage

```javascript
var toobusy = require('toobusy-js'),
    express = require('express');

var app = express();

// middleware which blocks requests when we're too busy
app.use(function(req, res, next) {
  if (toobusy()) {
    res.send(503, "I'm busy right now, sorry.");
  } else {
    next();
  }
});

app.get('/', function(req, res) {
  // processing the request requires some work!
  var i = 0;
  while (i < 1e5) i++;
  res.send("I counted to " + i);
});

var server = app.listen(3000);

process.on('SIGINT', function() {
  server.close();
  // calling .shutdown allows your process to exit normally
  toobusy.shutdown();
  process.exit();
});
```

## tunable parameters

The library exposes a few knobs:

`maxLag` - This number represents the maximum amount of time in milliseconds that the event queue is behind,
before we consider the process *too busy*.
`interval` - The check interval for measuring event loop lag, in ms.

```javascript
var toobusy = require('toobusy-js');

// Set maximum lag to an aggressive value.
toobusy.maxLag(10);

// Set check interval to a faster value. This will catch more latency spikes
// but may cause the check to be too sensitive.
toobusy.interval(250);

// Get current maxLag or interval setting by calling without parameters.
var currentMaxLag = toobusy.maxLag(), interval = toobusy.interval();

toobusy.onLag(function(currentLag) {
  console.log("Event loop lag detected! Latency: " + currentLag + "ms");
});
```

The default maxLag value is 70ms, and the default check interval is 500ms.
This allows an "average" server to run at 90-100% CPU
and keeps request latency at around 200ms.
For comparison, a maxLag value of 10ms results in 60-70% CPU usage,
while latency for "average" requests stays at about 40ms.

These numbers are only examples,
and the specifics of your hardware and application can change them drastically,
so experiment!
The default of 70 should get you started.

## Events

As of `0.5.0`, `toobusy-js` exposes an `onLag` method. Pass it a callback to be notified when
a slow event loop tick has been detected.

## references

> There is nothing new under the sun. (Ecclesiastes 1:9)

Though applying "event loop latency" to node.js was not directly inspired by anyone else's work,
this concept is not new.  Here are references to others who apply the same technique:

  * [Provos, Lever, and Tweedie 2000](http://www.kegel.com/c10k.html#tips) - "notes that dropping incoming connections when the server is overloaded improved the shape of the performance curve."

## license

[WTFPL](http://wtfpl.org)
