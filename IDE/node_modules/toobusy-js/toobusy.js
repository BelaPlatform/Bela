'use strict';

var events = require('events');

//
// Constants
//
var STANDARD_HIGHWATER = 70;
var STANDARD_INTERVAL = 500;
var LAG_EVENT = "LAG_EVENT";

// A dampening factor.  When determining average calls per second or
// current lag, we weigh the current value against the previous value 2:1
// to smooth spikes.
// See https://en.wikipedia.org/wiki/Exponential_smoothing
var SMOOTHING_FACTOR = 1/3;

//
// Vars
//

var lastTime = Date.now();
var highWater = STANDARD_HIGHWATER;
var interval = STANDARD_INTERVAL;
var smoothingFactor = SMOOTHING_FACTOR;
var currentLag = 0;
var checkInterval;
var lagEventThreshold = -1;
var eventEmitter = new events.EventEmitter();

/**
 * Main export function.
 * @return {Boolean} True if node process is too busy.
 */
var toobusy = function(){
  // If current lag is < 2x the highwater mark, we don't always call it 'too busy'. E.g. with a 50ms lag
  // and a 40ms highWater (1.25x highWater), 25% of the time we will block. With 80ms lag and a 40ms highWater,
  // we will always block.
  var pctToBlock = (currentLag - highWater) / highWater;
  return Math.random() < pctToBlock;
};

/**
 * Sets or gets the current check interval.
 * If you want more sensitive checking, set a faster (lower) interval. A lower maxLag can also create a more
 * sensitive check.
 * @param  {Number} [newInterval] New interval to set. If not provided, will return the existing interval.
 * @return {Number}               New or existing interval.
 */
toobusy.interval = function(newInterval) {
  if (!newInterval) return interval;
  if (typeof newInterval !== "number") throw new Error("Interval must be a number.");

  newInterval = Math.round(newInterval);
  if(newInterval < 16) throw new Error("Interval should be greater than 16ms.");

  toobusy.shutdown();
  interval = newInterval;
  start();
  return interval;
};

/**
 * Returns last lag reading from last check interval.
 * @return {Number} Lag in ms.
 */
toobusy.lag = function(){
  return Math.round(currentLag);
};

/**
 * Set or get the current max latency threshold. Default is 70ms.
 *
 * Note that if event loop lag goes over this threshold, the process is not always 'too busy' - the farther
 * it goes over the threshold, the more likely the process will be considered too busy.
 *
 * The percentage is equal to the percent over the max lag threshold. So 1.25x over the maxLag will indicate
 * too busy 25% of the time. 2x over the maxLag threshold will indicate too busy 100% of the time.
 * @param  {Number} [newLag] New maxLag (highwater) threshold.
 * @return {Number}          New or existing maxLag (highwater) threshold.
 */
toobusy.maxLag = function(newLag){
  if(!newLag) return highWater;

  // If an arg was passed, try to set highWater.
  if (typeof newLag !== "number") throw new Error("MaxLag must be a number.");
  newLag = Math.round(newLag);
  if(newLag < 10) throw new Error("Maximum lag should be greater than 10ms.");

  highWater = newLag;
  return highWater;
};

/**
 * Set or get the smoothing factor. Default is 0.3333....
 *
 * The smoothing factor per the standard exponential smoothing formula "αtn + (1-α)tn-1"
 * See: https://en.wikipedia.org/wiki/Exponential_smoothing
 *
 * @param  {Number} [newFactor] New smoothing factor.
 * @return {Number}             New or existing smoothing factor.
 */
toobusy.smoothingFactor = function(newFactor){
  if(!newFactor) return smoothingFactor;

  if (typeof newFactor !== "number") throw new Error("NewFactor must be a number.");
  if(newFactor <= 0 || newFactor > 1) throw new Error("Smoothing factor should be in range ]0,1].");

  smoothingFactor = newFactor;
  return smoothingFactor;
};

/**
 * Shuts down toobusy.
 *
 * Not necessary to call this manually, only do this if you know what you're doing. `unref()` is called
 * on toobusy's check interval, so it will never keep the server open.
 */
toobusy.shutdown = function(){
  currentLag = 0;
  checkInterval = clearInterval(checkInterval);
};

toobusy.started = function() {
  return !!checkInterval;
};

/**
 * Registers an event listener for lag events,
 * optionally specify a minimum value threshold for events being emitted
 * @param {Function}  fn  Function of form onLag(value: number) => void
 * @param {number}  [threshold=maxLag] Optional minimum lag value for events to be emitted
 */
toobusy.onLag = function (fn, threshold) {

  if (typeof threshold === "number") {
    lagEventThreshold = threshold;
  } else {
    lagEventThreshold = toobusy.maxLag();
  }

  eventEmitter.on(LAG_EVENT, fn);
};

/**
 * Private - starts checking lag.
 */
function start() {
  checkInterval = setInterval(function(){
    var now = Date.now();
    var lag = now - lastTime;
    lag = Math.max(0, lag - interval);
    // Dampen lag. See SMOOTHING_FACTOR initialization at the top of this file.
    currentLag = smoothingFactor * lag + (1 - smoothingFactor) * currentLag;
    lastTime = now;

    if (lagEventThreshold !== -1 && currentLag > lagEventThreshold) {
      eventEmitter.emit(LAG_EVENT, currentLag);
    }

  }, interval);

  // Don't keep process open just for this timer.
  checkInterval.unref();
}

// Kickoff the checking!
start();

module.exports = toobusy;
