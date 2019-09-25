(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

var BackgroundView = function (_View) {
	_inherits(BackgroundView, _View);

	function BackgroundView(className, models, renderer) {
		_classCallCheck(this, BackgroundView);

		var _this = _possibleConstructorReturn(this, (BackgroundView.__proto__ || Object.getPrototypeOf(BackgroundView)).call(this, className, models));

		var saveCanvas = document.getElementById('saveCanvas');
		_this.canvas = document.getElementById('scopeBG');
		saveCanvas.addEventListener('click', function () {
			_this.canvas.getContext('2d').drawImage(renderer.view, 0, 0);
			saveCanvas.href = _this.canvas.toDataURL();
			_this.repaintBG();
		});
		return _this;
	}

	_createClass(BackgroundView, [{
		key: 'repaintBG',
		value: function repaintBG(xTime, data) {
			var canvas = this.canvas;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			var ctx = canvas.getContext('2d');
			ctx.rect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = "white";
			ctx.fill();
			//ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (data.plotMode == 1) {
				this.FFTBG(canvas, ctx, data);
				return;
			}

			var xPixels = xTime * this.models[0].getKey('sampleRate') / 1000;
			var numVLines = Math.floor(canvas.width / xPixels);
			var mspersample = xTime * data.downSampling / data.upSampling;

			//console.log(xTime);

			//faint lines
			ctx.strokeStyle = '#000000';
			ctx.fillStyle = "grey";
			ctx.font = "14px inconsolata";
			ctx.textAlign = "center";
			ctx.lineWidth = 0.2;
			ctx.setLineDash([]);
			ctx.beginPath();
			ctx.fillText(0, canvas.width / 2, canvas.height / 2 + 11);
			for (var i = 1; i < numVLines; i++) {
				ctx.moveTo(canvas.width / 2 + i * xPixels, 0);
				ctx.lineTo(canvas.width / 2 + i * xPixels, canvas.height);
				ctx.fillText((i * mspersample).toPrecision(2), canvas.width / 2 + i * xPixels, canvas.height / 2 + 11);
				ctx.moveTo(canvas.width / 2 - i * xPixels, 0);
				ctx.lineTo(canvas.width / 2 - i * xPixels, canvas.height);
				ctx.fillText((-i * mspersample).toPrecision(2), canvas.width / 2 - i * xPixels, canvas.height / 2 + 11);
			}

			var numHLines = 6;
			for (var i = 1; i < numHLines; i++) {
				if (i != numHLines / 2) {
					ctx.moveTo(0, canvas.height * i / numHLines);
					ctx.lineTo(canvas.width, canvas.height * i / numHLines);
				}
			}

			//ticks
			var numTicks = 10;
			var tickSize;
			for (var i = 0; i < numVLines; i++) {
				for (var j = 1; j < numTicks; j++) {
					tickSize = 7;
					if (j === Math.floor(numTicks / 2)) {
						tickSize = 10;
					}
					ctx.moveTo(canvas.width / 2 + i * xPixels + xPixels * j / numTicks, canvas.height / 2 + tickSize);
					ctx.lineTo(canvas.width / 2 + i * xPixels + xPixels * j / numTicks, canvas.height / 2 - tickSize);
					if (i) {
						ctx.moveTo(canvas.width / 2 - i * xPixels + xPixels * j / numTicks, canvas.height / 2 + tickSize);
						ctx.lineTo(canvas.width / 2 - i * xPixels + xPixels * j / numTicks, canvas.height / 2 - tickSize);
					}
				}
			}

			numTicks = 10;
			for (var i = 0; i < numHLines; i++) {
				for (var j = 1; j < numTicks; j++) {
					tickSize = 7;
					if (j === Math.floor(numTicks / 2)) {
						tickSize = 10;
					}
					ctx.moveTo(canvas.width / 2 - tickSize, canvas.height * i / numHLines + canvas.height * j / (numTicks * numHLines));
					ctx.lineTo(canvas.width / 2 + tickSize, canvas.height * i / numHLines + canvas.height * j / (numTicks * numHLines));
				}
			}
			ctx.stroke();

			//dashed lines
			ctx.beginPath();
			ctx.setLineDash([2, 5]);

			ctx.moveTo(0, canvas.height * 3 / 4);
			ctx.lineTo(canvas.width, canvas.height * 3 / 4);
			ctx.moveTo(0, canvas.height * 1 / 4);
			ctx.lineTo(canvas.width, canvas.height * 1 / 4);

			ctx.stroke();
			ctx.setLineDash([]);

			//fat lines
			ctx.lineWidth = 1;
			ctx.beginPath();
			var numVLines = 2;
			for (var i = 0; i <= numVLines; i++) {
				ctx.moveTo(canvas.width * i / numVLines, 0);
				ctx.lineTo(canvas.width * i / numVLines, canvas.height);
			}

			var numHLines = 2;
			for (var i = 0; i <= numHLines; i++) {
				ctx.moveTo(0, canvas.height * i / numHLines);
				ctx.lineTo(canvas.width, canvas.height * i / numHLines);
			}

			ctx.stroke();

			//trigger line
			/*ctx.strokeStyle = '#0000ff';
   ctx.lineWidth = 0.2;
   ctx.beginPath();
   ctx.moveTo(0, (canvas.height/2)*(1-(this.yOffset+this.triggerLevel)/this.yAmplitude) );
   ctx.lineTo(canvas.width, (canvas.height/2)*(1-(this.yOffset+this.triggerLevel)/this.yAmplitude) );
   ctx.stroke();*/
		}
	}, {
		key: 'FFTBG',
		value: function FFTBG(canvas, ctx, data) {

			var numVlines = 10;

			//faint lines
			ctx.strokeStyle = '#000000';
			ctx.fillStyle = "grey";
			ctx.font = "14px inconsolata";
			ctx.textAlign = "center";
			ctx.lineWidth = 0.3;
			ctx.setLineDash([]);
			ctx.beginPath();

			for (var i = 0; i <= numVlines; i++) {
				ctx.moveTo(i * window.innerWidth / numVlines, 0);
				ctx.lineTo(i * window.innerWidth / numVlines, canvas.height);
				if (i && i !== numVlines) {
					var val;
					if (parseInt(this.models[0].getKey('FFTXAxis')) === 0) {
						// linear x axis
						val = (i * this.models[0].getKey('sampleRate') / (numVlines * 2) * data.upSampling / data.downSampling).toFixed(0);
						//console.log(val);
					} else {
						val = (Math.pow(Math.E, -Math.log(1 / window.innerWidth) * i / numVlines) * (this.models[0].getKey('sampleRate') / (2 * window.innerWidth)) * (data.upSampling / data.downSampling)).toFixed(0);
					}

					ctx.fillText(val, i * window.innerWidth / numVlines, canvas.height - 2);
				}
			}

			var numHLines = 6;
			for (var i = 1; i < numHLines; i++) {
				ctx.moveTo(0, canvas.height * i / numHLines);
				ctx.lineTo(canvas.width, canvas.height * i / numHLines);
			}

			ctx.stroke();

			//fat lines
			ctx.lineWidth = 1;
			ctx.beginPath();

			ctx.moveTo(0, 0);
			ctx.lineTo(0, canvas.height);

			ctx.moveTo(0, canvas.height);
			ctx.lineTo(canvas.width, canvas.height);

			ctx.stroke();
		}
	}, {
		key: '__xTimeBase',
		value: function __xTimeBase(value, data) {
			//console.log(value);
			this.repaintBG(value, data);
		}
	}, {
		key: '_plotMode',
		value: function _plotMode(value, data) {
			this.repaintBG(data.xTimeBase, data);
		}
	}, {
		key: '_FFTXAxis',
		value: function _FFTXAxis(value, data) {
			this.repaintBG(data.xTimeBase, data);
		}
	}, {
		key: '_upSampling',
		value: function _upSampling(value, data) {
			this.repaintBG(data.xTimeBase, data);
		}
	}, {
		key: '_downSampling',
		value: function _downSampling(value, data) {
			this.repaintBG(data.xTimeBase, data);
		}
	}, {
		key: '_triggerLevel',
		value: function _triggerLevel(value, data) {
			//console.log(value, data);
		}
	}]);

	return BackgroundView;
}(View);

module.exports = BackgroundView;

},{"./View":7}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

function ChannelConfig() {
  this.yAmplitude = 1;
  this.yOffset = 0;
  this.color = '0xff0000';
  this.lineWeight = 1.5;
}

var channelConfig = [new ChannelConfig()];
var colours = ['0xff0000', '0x0000ff', '0x00ff00', '0xffff00', '0x00ffff', '0xff00ff'];

var tdGainVal = 1,
    tdOffsetVal = 0,
    tdGainMin = 0.5,
    tdGainMax = 2,
    tdOffsetMin = -5,
    tdOffsetMax = 5;
var FFTNGainVal = 1,
    FFTNOffsetVal = -0.005,
    FFTNGainMin = 0.5,
    FFTNGainMax = 2,
    FFTNOffsetMin = -1,
    FFTNOffsetMax = 1;
var FFTDGainVal = 1 / 70,
    FFTDOffsetVal = 69,
    FFTDGainMin = 0.00001,
    FFTDGainMax = 1.5,
    FFTDOffsetMin = 0,
    FFTDOffsetMax = 100;
var sliderPowExponent = Math.log2(100.1);
var yAmplitudeMin = 0.0001;

var ChannelView = function (_View) {
  _inherits(ChannelView, _View);

  function ChannelView(className, models) {
    _classCallCheck(this, ChannelView);

    return _possibleConstructorReturn(this, (ChannelView.__proto__ || Object.getPrototypeOf(ChannelView)).call(this, className, models));
  }

  // UI events


  _createClass(ChannelView, [{
    key: 'inputChanged',
    value: function inputChanged($element, e) {
      var key = $element.data().key;
      var channel = $element.data().channel;
      var value = key === 'color' ? $element.val().replace('#', '0x') : parseFloat($element.val());
      if (!(key === 'color') && isNaN(value)) return;
      if ("yAmplitude" === key || "yAmplitudeSlider" === key) {
        if ("yAmplitudeSlider" === key) {
          // remap the slider position to a log scale
          value = Math.pow(value, sliderPowExponent);
          key = "yAmplitude";
        } else {
          // remap the textbox input to the slider scale
          var sliderValue = Math.pow(value, 1 / sliderPowExponent);
          this.$elements.filterByData('key', "yAmplitudeSlider").filterByData('channel', channel).val(sliderValue);
        }
      }
      if (key === 'yAmplitude' && value < yAmplitudeMin) value = yAmplitudeMin; // prevent amplitude hitting zero
      this.$elements.not($element).filterByData('key', key).filterByData('channel', channel).val(value);
      channelConfig[channel][key] = value;
      this.emit('channelConfig', channelConfig);
    }
  }, {
    key: 'setChannelGains',
    value: function setChannelGains(value, min, max) {
      this.$elements.filterByData('key', 'yAmplitudeSlider').prop('min', min).prop('max', max);
      this.$elements.filterByData('key', 'yAmplitude').val(value);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = channelConfig[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var item = _step.value;

          item.yAmplitude = value;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.emit('channelConfig', channelConfig);
      // console.log(value, this.$elements.filterByData('key', 'yAmplitude').val());
    }
  }, {
    key: 'setChannelOffsets',
    value: function setChannelOffsets(value, min, max) {
      this.$elements.filterByData('key', 'yOffset').not('input[type=number]').prop('min', min).prop('max', max);
      this.$elements.filterByData('key', 'yOffset').val(value);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = channelConfig[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var item = _step2.value;

          item.yOffset = value;
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      this.emit('channelConfig', channelConfig);
    }
  }, {
    key: 'resetAll',
    value: function resetAll() {
      for (var i = 0; i < channelConfig.length; i++) {
        this.$elements.filterByData('key', 'yAmplitude').filterByData('channel', i).val(channelConfig[i].yAmplitude);
        this.$elements.filterByData('key', 'yOffset').filterByData('channel', i).val(channelConfig[i].yOffset);
      }
    }
  }, {
    key: '_numChannels',
    value: function _numChannels(val) {
      var numChannels = val;
      if (numChannels < channelConfig.length) {
        while (numChannels < channelConfig.length) {
          $('.channel-view-' + channelConfig.length).remove();
          channelConfig.pop();
        }
      } else if (numChannels > channelConfig.length) {
        while (numChannels > channelConfig.length) {
          channelConfig.push(new ChannelConfig());
          channelConfig[channelConfig.length - 1].color = colours[(channelConfig.length - 1) % colours.length];
          var el = $('.channel-view-0').clone(true).prop('class', 'channel-view-' + channelConfig.length).appendTo($('.control-section.channel'));
          el.find('h3').html('Channel ' + channelConfig.length);
          el.find('input').each(function () {
            $(this).data('channel', channelConfig.length - 1);
          });
          el.find('input[type=color]').val(colours[(channelConfig.length - 1) % colours.length].replace('0x', '#'));
        }
      }
      this.emit('channelConfig', channelConfig);
      this.$elements = $('.' + this.className);
    }
  }, {
    key: '_plotMode',
    value: function _plotMode(val, data) {

      if (val == 0) {
        // time domain

        this.setChannelGains(tdGainVal, tdGainMin, tdGainMax);
        this.setChannelOffsets(tdOffsetVal, tdOffsetMin, tdOffsetMax);
      } else {
        // FFT

        if (data.FFTYAxis == 0) {
          // normalised

          this.setChannelGains(FFTNGainVal, FFTNGainMin, FFTNGainMax);
          this.setChannelOffsets(FFTNOffsetVal, FFTNOffsetMin, FFTNOffsetMax);
        } else {
          // decibels

          this.setChannelGains(FFTDGainVal, FFTDGainMin, FFTDGainMax);
          this.setChannelOffsets(FFTDOffsetVal, FFTDOffsetMin, FFTDOffsetMax);
        }
      }
    }
  }, {
    key: '_FFTYAxis',
    value: function _FFTYAxis(val, data) {

      if (data.plotMode == 1) {

        if (val == 0) {
          // normalised

          this.setChannelGains(FFTNGainVal, FFTNGainMin, FFTNGainMax);
          this.setChannelOffsets(FFTNOffsetVal, FFTNOffsetMin, FFTNOffsetMax);
        } else {
          // decibels

          this.setChannelGains(FFTDGainVal, FFTDGainMin, FFTDGainMax);
          this.setChannelOffsets(FFTDOffsetVal, FFTDOffsetMin, FFTDOffsetMax);
        }
      }
    }
  }]);

  return ChannelView;
}(View);

module.exports = ChannelView;

$.fn.filterByData = function (prop, val) {
  return this.filter(function () {
    return $(this).data(prop) == val;
  });
};

},{"./View":7}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

var controls,
    xTime,
    sampleRate,
    upSampling = 1,
    downSampling = 1;

var ControlView = function (_View) {
  _inherits(ControlView, _View);

  function ControlView(className, models) {
    _classCallCheck(this, ControlView);

    var _this = _possibleConstructorReturn(this, (ControlView.__proto__ || Object.getPrototypeOf(ControlView)).call(this, className, models));

    $('#controlsButton, .overlay').on('click', function () {
      return _this.toggleControls();
    });
    $('body').on('keydown', function (e) {
      return _this.keyHandler(e);
    });
    return _this;
  }

  _createClass(ControlView, [{
    key: 'toggleControls',
    value: function toggleControls() {
      if (controls) {
        controls = false;
        $('#control-panel').addClass('hidden');
        $('.overlay').removeClass('active');
      } else {
        controls = true;
        $('#control-panel').removeClass('hidden');
        $('.overlay').addClass('active');
      }
    }
  }, {
    key: 'keyHandler',
    value: function keyHandler(e) {
      if (e.key === 'Escape') {
        this.toggleControls();
      }
    }

    // UI events

  }, {
    key: 'selectChanged',
    value: function selectChanged($element, e) {
      var key = $element.data().key;
      var value = $element.val();
      //if (this[key]) this[key](value);
      this.emit('settings-event', key, parseFloat(value));
      this.$elements.not($element).filterByData('key', key).val(value);
    }
  }, {
    key: 'inputChanged',
    value: function inputChanged($element, e) {
      var key = $element.data().key;
      var value = $element.val();
      this.emit('settings-event', key, parseFloat(value));
      this.$elements.not($element).filterByData('key', key).val(value);
    }
  }, {
    key: 'buttonClicked',
    value: function buttonClicked($element, e) {
      if ($element.data().key === 'upSampling') {
        if (downSampling > 1) {
          downSampling -= 1;
          this.emit('settings-event', 'downSampling', downSampling);
        } else {
          upSampling += 1;
          this.emit('settings-event', 'upSampling', upSampling);
        }
        // this._upSampling();
      } else if ($element.data().key === 'downSampling') {
        if (upSampling > 1) {
          upSampling -= 1;
          this.emit('settings-event', 'upSampling', upSampling);
        } else {
          downSampling += 1;
          this.emit('settings-event', 'downSampling', downSampling);
        }
        // this._downSampling();
      } else {
        this.emit('settings-event', $element.data().key);
      }
    }

    // settings model events

  }, {
    key: 'modelChanged',
    value: function modelChanged(data, changedKeys) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = changedKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          if (this['_' + key]) {
            this['_' + key](data[key], data);
          } else {
            if (key === 'plotMode') this.plotMode(data[key], data);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'setControls',
    value: function setControls(data) {
      for (var key in data) {
        this.$elements.filterByData('key', key).val(data[key]);
      }
    }
  }, {
    key: 'plotMode',
    value: function plotMode(val, data) {
      this.emit('plotMode', val, data);
      if (val == 0) {
        if ($('#control-underlay').hasClass('')) $('#control-underlay').addClass('hidden');
        if ($('#triggerControls').hasClass('hidden')) $('#triggerControls').removeClass('hidden');
        if (!$('#FFTControls').hasClass('hidden')) $('#FFTControls').addClass('hidden');
        $('.xAxisUnits').html('<p>ms</p>');
        $('.xUnit-display').html('<p>' + (xTime * downSampling / upSampling).toPrecision(2) + '</p>');
        $('#zoomUp').html('Zoom in');
        $('#zoomDown').html('Zoom out');
      } else if (val == 1) {
        if ($('#control-underlay').hasClass('hidden')) $('#control-underlay').removeClass('hidden');
        if (!$('#trigger-controls').hasClass('hidden')) $('#triggerControls').addClass('hidden');
        if ($('#FFTControls').hasClass('hidden')) $('#FFTControls').removeClass('hidden');
        $('.xAxisUnits').html('Hz');
        $('.xUnit-display').html(sampleRate / 20 * upSampling / downSampling);
        $('#zoomUp').html('Zoom out');
        $('#zoomDown').html('Zoom in');
      }
    }
  }, {
    key: '_upSampling',
    value: function _upSampling(value, data) {
      upSampling = value;
      if (data.plotMode == 0) {
        $('.xUnit-display').html('<p>' + (xTime * downSampling / upSampling).toPrecision(2) + '</p>');
      } else if (data.plotMode == 1) {
        $('.xUnit-display').html(data.sampleRate / 20 * data.upSampling / data.downSampling);
      }
      $('.zoom-display').html((100 * upSampling / downSampling).toPrecision(4) + '%');
    }
  }, {
    key: '_downSampling',
    value: function _downSampling(value, data) {
      downSampling = value;
      if (data.plotMode == 0) {
        $('.xUnit-display').html('<p>' + (xTime * downSampling / upSampling).toPrecision(2) + '</p>');
      } else if (data.plotMode == 1) {
        $('.xUnit-display').html('<p>' + (xTime * downSampling / upSampling).toPrecision(2) + '</p>');
      }
    }
  }, {
    key: '_xTimeBase',
    value: function _xTimeBase(value, data) {
      xTime = data.xTimeBase;
      sampleRate = data.sampleRate;
      if (data.plotMode == 0) {
        $('.xUnit-display').html('<p>' + (xTime * downSampling / upSampling).toPrecision(2) + '</p>');;
      }
    }
  }, {
    key: '__numChannels',
    value: function __numChannels(val, data) {
      var el = this.$elements.filterByData('key', 'triggerChannel');
      el.empty();
      for (var i = 0; i < val; i++) {
        var opt = $('<option></option>').html(i + 1).val(i).appendTo(el);
        if (i === data.triggerChannel) opt.prop('selected', 'selected');
      }
    }
  }, {
    key: '_triggerMode',
    value: function _triggerMode(value) {
      this.$elements.filterByData('key', 'triggerMode').val(value);
    }
  }, {
    key: '_triggerChannel',
    value: function _triggerChannel(value) {
      this.$elements.filterByData('key', 'triggerChannel').val(value);
    }
  }, {
    key: '_triggerDir',
    value: function _triggerDir(value) {
      this.$elements.filterByData('key', 'triggerDir').val(value);
    }
  }, {
    key: '_triggerLevel',
    value: function _triggerLevel(value) {
      this.$elements.filterByData('key', 'triggerDir').find('input').val(value);
    }
  }]);

  return ControlView;
}(View);

module.exports = ControlView;

$.fn.filterByData = function (prop, val) {
  return this.filter(function () {
    return $(this).data(prop) == val;
  });
};

},{"./View":7}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var Model = function (_EventEmitter) {
	_inherits(Model, _EventEmitter);

	function Model(data) {
		_classCallCheck(this, Model);

		var _this = _possibleConstructorReturn(this, (Model.__proto__ || Object.getPrototypeOf(Model)).call(this));

		var _data = data || {};
		_this._getData = function () {
			return _data;
		};
		return _this;
	}

	_createClass(Model, [{
		key: 'getKey',
		value: function getKey(key) {
			return this._getData()[key];
		}
	}, {
		key: 'setData',
		value: function setData(newData) {
			if (!newData) return;
			var newKeys = [];
			for (var key in newData) {
				if (!_equals(newData[key], this._getData()[key], false)) {
					newKeys.push(key);
					this._getData()[key] = newData[key];
				}
			}
			if (newKeys.length) {
				//console.log('changed setdata');
				this.emit('change', this._getData(), newKeys);
			}
			this.emit('set', this._getData(), Object.keys(newData));
		}
	}, {
		key: 'setKey',
		value: function setKey(key, value) {
			if (!_equals(value, this._getData()[key], false)) {
				this._getData()[key] = value;
				//console.log('changed setkey');
				this.emit('change', this._getData(), [key]);
			}
			this.emit('set', this._getData(), [key]);
		}
	}, {
		key: 'pushIntoKey',
		value: function pushIntoKey(key, value) {
			this._getData()[key].push(value);
			this.emit('change', this._getData(), [key]);
			this.emit('set', this._getData(), [key]);
		}
	}, {
		key: 'spliceFromKey',
		value: function spliceFromKey(key, index) {
			this._getData()[key].splice(index, 1);
			this.emit('change', this._getData(), [key]);
			this.emit('set', this._getData(), [key]);
		}
	}, {
		key: 'print',
		value: function print() {
			console.log(this._getData());
		}
	}]);

	return Model;
}(EventEmitter);

module.exports = Model;

function _equals(a, b, log) {
	if (log) console.log('a:', a, 'b:', b);
	if (a instanceof Array && b instanceof Array) {
		if (log) console.log('arrays', 'a:', a, 'b:', b, a.length === b.length, a.every(function (element, index) {
			return _equals(element, b[index], log);
		}));
		return a.length === b.length && a.every(function (element, index) {
			return _equals(element, b[index], log);
		});
	} else if (a instanceof Object && b instanceof Object) {
		if (log) console.log('objects', 'a:', a, 'b:', b);
		for (var c in a) {
			if (log) console.log('a[c]:', a[c], 'b[c]:', b[c], 'c:', c);
			if (!_equals(a[c], b[c], log)) return false;
		}
		return true;
	} else {
		if (log) console.log('a:', a, 'b:', b, Object.is(a, b), a === b);
		return Object.is(a, b);
	}
}

},{"events":1}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

var SliderView = function (_View) {
	_inherits(SliderView, _View);

	function SliderView(className, models) {
		_classCallCheck(this, SliderView);

		var _this = _possibleConstructorReturn(this, (SliderView.__proto__ || Object.getPrototypeOf(SliderView)).call(this, className, models));

		_this.on('set-slider', function (args) {
			$('#scopeSlider' + args.slider).find('input[type=range]').prop('min', args.min).prop('max', args.max).prop('step', args.step).val(args.value).siblings('input[type=number]').prop('min', args.min).prop('max', args.max).prop('step', args.step).val(args.value).siblings('h1').html(args.name == 'Slider' ? 'Slider ' + args.slider : args.name);

			var inputs = $('#scopeSlider' + args.slider).find('input[type=number]');
			inputs.filterByData('key', 'min').val(args.min);
			inputs.filterByData('key', 'max').val(args.max);
			inputs.filterByData('key', 'step').val(args.step);
		});

		return _this;
	}

	_createClass(SliderView, [{
		key: 'inputChanged',
		value: function inputChanged($element, e) {

			var key = $element.data().key;
			var slider = $element.data().slider;
			var value = $element.val();

			if (key === 'value') {
				this.emit('slider-value', parseInt(slider), parseFloat(value));
			} else {
				$element.closest('div.sliderView').find('input[type=range]').prop(key, value).siblings('input[type=number]').prop(key, value);
			}

			$element.siblings('input').val(value);
		}
	}, {
		key: '_numSliders',
		value: function _numSliders(val) {
			var _this2 = this;

			var el = $('#scopeSlider0');

			$('#sliderColumn').empty();

			if (val == 0) {
				el.appendTo($('#sliderColumn')).css('display', 'none');
			}

			for (var i = 0; i < val; i++) {
				var slider = el.clone(true).prop('id', 'scopeSlider' + i).appendTo($('#sliderColumn')).css('display', 'block');

				slider.find('input').data('slider', i).on('input', function (e) {
					return _this2.inputChanged($(e.currentTarget), e);
				});
			}
		}
	}]);

	return SliderView;
}(View);

module.exports = SliderView;

$.fn.filterByData = function (prop, val) {
	return this.filter(function () {
		return $(this).data(prop) == val;
	});
};

},{"./View":7}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;

var View = function (_EventEmitter) {
	_inherits(View, _EventEmitter);

	function View(CSSClassName, models, settings) {
		_classCallCheck(this, View);

		var _this = _possibleConstructorReturn(this, (View.__proto__ || Object.getPrototypeOf(View)).call(this));

		_this.className = CSSClassName;
		_this.models = models;
		_this.settings = settings;
		_this.$elements = $('.' + CSSClassName);
		_this.$parents = $('.' + CSSClassName + '-parent');

		if (models) {
			for (var i = 0; i < models.length; i++) {
				models[i].on('change', function (data, changedKeys) {
					_this.modelChanged(data, changedKeys);
				});
				models[i].on('set', function (data, changedKeys) {
					_this.modelSet(data, changedKeys);
				});
			}
		}

		_this.$elements.filter('select').on('change', function (e) {
			return _this.selectChanged($(e.currentTarget), e);
		});
		_this.$elements.filter('input').on('input', function (e) {
			return _this.inputChanged($(e.currentTarget), e);
		});
		_this.$elements.filter('button').on('click', function (e) {
			return _this.buttonClicked($(e.currentTarget), e);
		});

		return _this;
	}

	_createClass(View, [{
		key: 'modelChanged',
		value: function modelChanged(data, changedKeys) {
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = changedKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var value = _step.value;

					if (this['_' + value]) {
						this['_' + value](data[value], data, changedKeys);
					}
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}
		}
	}, {
		key: 'modelSet',
		value: function modelSet(data, changedKeys) {
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = changedKeys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var value = _step2.value;

					if (this['__' + value]) {
						this['__' + value](data[value], data, changedKeys);
					}
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}
		}
	}, {
		key: 'selectChanged',
		value: function selectChanged(element, e) {}
	}, {
		key: 'buttonClicked',
		value: function buttonClicked(element, e) {}
	}, {
		key: 'printElements',
		value: function printElements() {
			console.log('elements:', this.$elements, 'parents:', this.$parents);
		}
	}]);

	return View;
}(EventEmitter);

module.exports = View;

},{"events":1}],8:[function(require,module,exports){
'use strict';

var scope = require('./scope-browser');

},{"./scope-browser":9}],9:[function(require,module,exports){
'use strict';

// worker

var _settings$setData;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var worker = new Worker("js/scope-worker.js");

// models
var Model = require('./Model');
var settings = new Model();

// Pixi.js renderer and stage
var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, { transparent: true });
renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;
$('.scopeWrapper').append(renderer.view);
var stage = new PIXI.Container();

// views
var controlView = new (require('./ControlView'))('scope-controls', [settings]);
var backgroundView = new (require('./BackgroundView'))('scopeBG', [settings], renderer);
var channelView = new (require('./ChannelView'))('channelView', [settings]);
var sliderView = new (require('./SliderView'))('sliderView', [settings]);

// main bela socket
var belaSocket = io('/IDE');

// scope websocket
var ws;

var wsAddress = "ws://" + location.host + ":5432/scope_control";
ws = new WebSocket(wsAddress);
var ws_onerror = function ws_onerror(e) {
  setTimeout(function () {
    ws = new WebSocket(wsAddress);
    ws.onerror = ws_onerror;
    ws.onopen = ws_onopen;
    ws.onmessage = ws_onmessage;
  }, 500);
};
ws.onerror = ws_onerror;

var ws_onopen = function ws_onopen() {
  ws.binaryType = 'arraybuffer';
  console.log('scope control websocket open');
  ws.onclose = ws_onerror;
  ws.onerror = undefined;
};
ws.onopen = ws_onopen;

var ws_onmessage = function ws_onmessage(msg) {
  // console.log('recieved scope control message:', msg.data);
  var data;
  try {
    data = JSON.parse(msg.data);
  } catch (e) {
    console.log('could not parse scope control data:', e);
    return;
  }
  if (data.event == 'connection') {
    delete data.event;
    data.frameWidth = window.innerWidth;
    data.frameHeight = window.innerHeight;
    settings.setData(data);

    if (settings.getKey('triggerChannel') >= data.numChannels) settings.setKey('triggerChannel', 0);

    var obj = settings._getData();
    obj.event = "connection-reply";
    var out;
    try {
      out = JSON.stringify(obj);
    } catch (e) {
      console.log('could not stringify settings:', e);
      return;
    }
    if (ws.readyState === 1) ws.send(out);
  } else if (data.event == 'set-slider') {
    sliderView.emit('set-slider', data);
  } else if (data.event == 'set-setting') {
    if (settings.getKey(data.setting) !== undefined) {
      settings.setKey(data.setting, data.value);
    }
  }
};
ws.onmessage = ws_onmessage;

var paused = false,
    oneShot = false;

// view events
controlView.on('settings-event', function (key, value) {
  if (key === 'scopePause') {
    if (paused) {
      paused = false;
      $('.pause-button').html('Pause plotting');
      $('#scopeStatus').html('waiting');
    } else {
      paused = true;
      $('.pause-button').html('Resume plotting');
      $('#scopeStatus').removeClass('scope-status-triggered').addClass('scope-status-waiting').html('paused');
    }
    return;
  } else if (key === 'scopeOneShot') {
    oneShot = true;
    if (paused) {
      paused = false;
      $('#pauseButton').html('pause');
    }
    $('#scopeStatus').removeClass('scope-status-triggered').addClass('scope-status-waiting').html('waiting (one-shot)');
  }
  if (value === undefined) return;
  var obj = {};
  obj[key] = value;
  var out;
  try {
    out = JSON.stringify(obj);
  } catch (e) {
    console.log('error creating settings JSON', e);
    return;
  }
  if (ws.readyState === 1) ws.send(out);
  settings.setKey(key, value);
});

channelView.on('channelConfig', function (channelConfig) {
  worker.postMessage({
    event: 'channelConfig',
    channelConfig: channelConfig
  });
});

sliderView.on('slider-value', function (slider, value) {
  var obj = { event: "slider", slider: slider, value: value };
  var out;
  try {
    out = JSON.stringify(obj);
  } catch (e) {
    console.log('could not stringify slider json:', e);
    return;
  }
  if (ws.readyState === 1) ws.send(out);
});

belaSocket.on('cpu-usage', CPU);

// model events
settings.on('set', function (data, changedKeys) {
  if (changedKeys.indexOf('frameWidth') !== -1) {
    var xTimeBase = Math.max(Math.floor(1000 * (data.frameWidth / 8) / data.sampleRate), 1);
    settings.setKey('xTimeBase', xTimeBase);
    var out;
    try {
      out = JSON.stringify({ frameWidth: data.frameWidth });
    } catch (e) {
      console.log('unable to stringify framewidth', e);
      return;
    }
    if (ws.readyState === 1) ws.send(out);
  } else {
    worker.postMessage({
      event: 'settings',
      settings: data
    });
  }
});

// window events
$(window).on('resize', function () {
  settings.setKey('frameWidth', window.innerWidth);
  settings.setKey('frameHeight', window.innerHeight);
});

$(window).on('mousemove', function (e) {
  if (settings.getKey('plotMode') === undefined) return;
  var plotMode = settings.getKey('plotMode');
  var scale = settings.getKey('downSampling') / settings.getKey('upSampling');
  var x, y;
  if (plotMode == 0) {
    x = (1000 * scale * (e.clientX - window.innerWidth / 2) / settings.getKey('sampleRate')).toPrecision(4) + 'ms';
    y = (1 - 2 * e.clientY / window.innerHeight).toPrecision(3);
  } else if (plotMode == 1) {
    if (parseInt(settings.getKey('FFTXAxis')) === 0) {
      x = parseInt(settings.getKey('sampleRate') * e.clientX / (2 * window.innerWidth * scale));
    } else {
      x = parseInt(Math.pow(Math.E, -Math.log(1 / window.innerWidth) * e.clientX / window.innerWidth) * (settings.getKey('sampleRate') / (2 * window.innerWidth)) * (settings.getKey('upSampling') / settings.getKey('downSampling')));
    }
    if (x > 1500) x = x / 1000 + 'khz';else x += 'hz';
    if (parseInt(settings.getKey('FFTYAxis')) === 0) {
      y = (1 - e.clientY / window.innerHeight).toPrecision(3);
    } else {
      y = (-70 * e.clientY / window.innerHeight).toPrecision(3) + 'db';
    }
  }
  $('#scopeMouseX').html('x: ' + x);
  $('#scopeMouseY').html('y: ' + y);
});

// CPU usage
function CPU(data) {
  var ide = (data.syntaxCheckProcess || 0) + (data.buildProcess || 0) + (data.node || 0);
  var bela = 0,
      rootCPU = 1;

  if (data.bela != 0 && data.bela !== undefined) {

    // extract the data from the output
    var lines = data.bela.split('\n');
    var taskData = [],
        output = [];
    for (var j = 0; j < lines.length; j++) {
      taskData.push([]);
      lines[j] = lines[j].split(' ');
      for (var k = 0; k < lines[j].length; k++) {
        if (lines[j][k]) {
          taskData[j].push(lines[j][k]);
        }
      }
    }

    for (var j = 0; j < taskData.length; j++) {
      if (taskData[j].length) {
        var proc = {
          'name': taskData[j][8],
          'cpu': taskData[j][7],
          'msw': taskData[j][2],
          'csw': taskData[j][3]
        };
        if (proc.name === '[ROOT]') rootCPU = proc.cpu * 0.01;
        // ignore uninteresting data
        if (proc && proc.name && proc.name !== '[ROOT]' && proc.name !== 'NAME' && proc.name !== '[IRQ16:') {
          output.push(proc);
        }
      }
    }

    for (var j = 0; j < output.length; j++) {
      if (output[j].cpu) {
        bela += parseFloat(output[j].cpu);
      }
    }

    bela += data.belaLinux * rootCPU;
  }

  $('#ide-cpu').html('IDE: ' + (ide * rootCPU).toFixed(1) + '%');
  $('#bela-cpu').html('Bela: ' + (bela ? bela.toFixed(1) + '%' : '--'));

  if (bela && ide * rootCPU + bela > 80) {
    $('#ide-cpu, #bela-cpu').css('color', 'red');
  } else {
    $('#ide-cpu, #bela-cpu').css('color', 'black');
  }
}

// plotting
{
  var plotLoop = function plotLoop() {
    requestAnimationFrame(plotLoop);
    if (plot) {
      plot = false;
      ctx.clear();
      for (var i = 0; i < numChannels; i++) {
        ctx.lineStyle(channelConfig[i].lineWeight, channelConfig[i].color, 1);
        var iLength = i * length;
        ctx.moveTo(0, frame[iLength] + xOff * (frame[iLength + 1] - frame[iLength]));
        for (var j = 1; j - xOff < length; j++) {
          ctx.lineTo(j - xOff, frame[j + iLength]);
        }
      }
      renderer.render(stage);
      triggerStatus();
    } /*else {
      console.log('not plotting');
      }*/
  };

  var triggerStatus = function triggerStatus() {

    inactiveOverlay.removeClass('inactive-overlay-visible');

    if (oneShot) {
      oneShot = false;
      paused = true;
      $('.pause-button').html('resume');
      scopeStatus.removeClass('scope-status-triggered').addClass('scope-status-waiting').html('paused');
    } else {
      scopeStatus.removeClass('scope-status-waiting').addClass('scope-status-triggered').html('triggered');
      if (triggerTimeout) clearTimeout(triggerTimeout);
      triggerTimeout = setTimeout(function () {
        if (!oneShot && !paused) scopeStatus.removeClass('scope-status-triggered').addClass('scope-status-waiting').html('waiting');
      }, 1000);

      if (inactiveTimeout) clearTimeout(inactiveTimeout);
      inactiveTimeout = setTimeout(function () {
        if (!oneShot && !paused) inactiveOverlay.addClass('inactive-overlay-visible');
      }, 5000);
    }
  };

  var ctx = new PIXI.Graphics();
  stage.addChild(ctx);

  var width = void 0,
      height = void 0,
      numChannels = void 0,
      channelConfig = [],
      xOff = 0,
      triggerChannel = 0,
      triggerLevel = 0,
      xOffset = 0,
      upSampling = 1;;
  settings.on('change', function (data, changedKeys) {
    if (changedKeys.indexOf('frameWidth') !== -1 || changedKeys.indexOf('frameHeight') !== -1) {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.resize(width, height);
    }
    if (changedKeys.indexOf('numChannels') !== -1) {
      numChannels = data.numChannels;
    }
    if (changedKeys.indexOf('triggerChannel') !== -1) {
      triggerChannel = data.triggerChannel;
    }
    if (changedKeys.indexOf('triggerLevel') !== -1) {
      triggerLevel = data.triggerLevel;
    }
    if (changedKeys.indexOf('xOffset') !== -1) {
      xOffset = data.xOffset;
    }
    if (changedKeys.indexOf('upSampling') !== -1) {
      upSampling = data.upSampling;
    }
  });
  channelView.on('channelConfig', function (config) {
    return channelConfig = config;
  });

  var frame = void 0,
      length = void 0,
      plot = false;

  worker.onmessage = function (e) {
    frame = e.data;
    length = Math.floor(frame.length / numChannels);
    // if scope is paused, don't set the plot flag
    plot = !paused;

    // interpolate the trigger sample to get the sub-pixel x-offset
    if (settings.getKey('plotMode') == 0) {
      //    if (upSampling == 1){
      var one = Math.abs(frame[Math.floor(triggerChannel * length + length / 2) + xOffset - 1] + height / 2 * ((channelConfig[triggerChannel].yOffset + triggerLevel) / channelConfig[triggerChannel].yAmplitude - 1));
      var two = Math.abs(frame[Math.floor(triggerChannel * length + length / 2) + xOffset] + height / 2 * ((channelConfig[triggerChannel].yOffset + triggerLevel) / channelConfig[triggerChannel].yAmplitude - 1));
      xOff = one / (one + two) - 1.5;
      /*    } else {
            for (var i=0; i<=(upSampling*2); i++){
              let one = frame[Math.floor(triggerChannel*length+length/2)+xOffset*upSampling-i] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1);
              let two = frame[Math.floor(triggerChannel*length+length/2)+xOffset*upSampling+i] + (height/2) * ((channelConfig[triggerChannel].yOffset + triggerLevel)/channelConfig[triggerChannel].yAmplitude - 1);
              if ((one > triggerLevel && two < triggerLevel) || (one < triggerLevel && two > triggerLevel)){
                xOff = i*(Math.abs(one)/(Math.abs(one)+Math.abs(two))-1);
                break;
              }
            }
          }
          console.log(xOff);
      */if (isNaN(xOff)) xOff = 0;
    }
  };

  plotLoop();

  // update the status indicator when triggered
  var triggerTimeout = void 0;
  var inactiveTimeout = setTimeout(function () {
    if (!oneShot && !paused) inactiveOverlay.addClass('inactive-overlay-visible');
  }, 5000);
  var scopeStatus = $('#scopeStatus');
  var inactiveOverlay = $('#inactive-overlay');


  var saveCanvasData = document.getElementById('saveCanvasData');
  saveCanvasData.addEventListener('click', function () {

    var downSampling = settings.getKey('downSampling');
    var upSampling = settings.getKey('upSampling');
    var sampleRate = settings.getKey('sampleRate');
    var plotMode = settings.getKey('plotMode');
    var scale = downSampling / upSampling;
    var FFTAxis = settings.getKey('FFTXAxis');

    // console.log(FFTAxis)

    var out = "data:text/csv;charset=utf-8,";

    for (var i = 0; i < length; i++) {

      if (plotMode === 0) {
        // time domain
        out += scale * i / sampleRate;
      } else if (plotMode === 1) {
        // FFT

        if (parseInt(settings.getKey('FFTXAxis')) === 0) {
          // linear x-axis
          out += sampleRate * i / (2 * length * scale);
          // x = parseInt(settings.getKey('sampleRate')*e.clientX/(2*window.innerWidth*scale));
        } else {
          out += Math.pow(Math.E, -Math.log(1 / length) * i / length) * sampleRate / (2 * length) + upSampling / downSampling;
          // x = parseInt(Math.pow(Math.E, -(Math.log(1/window.innerWidth))*e.clientX/window.innerWidth) * (settings.getKey('sampleRate')/(2*window.innerWidth)) * (settings.getKey('upSampling')/(settings.getKey('downSampling'))));
        }
      }

      for (var j = 0; j < numChannels; j++) {
        out += ',' + ((1 - frame[j * length + i] / (height / 2)) * channelConfig[j].yAmplitude - channelConfig[j].yOffset);
      }
      out += '\n';
    }

    this.href = encodeURI(out);
  });
}

settings.setData((_settings$setData = {
  numChannels: 2,
  sampleRate: 44100,
  numSliders: 0,
  frameWidth: 1280,
  plotMode: 0,
  triggerMode: 0,
  triggerChannel: 0,
  triggerDir: 0,
  triggerLevel: 0,
  xOffset: 0,
  upSampling: 1,
  downSampling: 1,
  FFTLength: 1024,
  FFTXAxis: 0,
  FFTYAxis: 0,
  holdOff: 0
}, _defineProperty(_settings$setData, 'numSliders', 0), _defineProperty(_settings$setData, 'interpolation', 0), _settings$setData));

},{"./BackgroundView":2,"./ChannelView":3,"./ControlView":4,"./Model":5,"./SliderView":6}]},{},[8])

//# sourceMappingURL=bundle.js.map
