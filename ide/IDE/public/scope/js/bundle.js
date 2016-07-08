(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

	function BackgroundView(className, models) {
		_classCallCheck(this, BackgroundView);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(BackgroundView).call(this, className, models));

		var saveCanvas = document.getElementById('saveCanvas');
		_this.canvas = document.getElementById('scopeBG');
		saveCanvas.addEventListener('click', function () {
			_this.canvas.getContext('2d').drawImage(document.getElementById('scope'), 0, 0);
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

			var xPixels = xTime * this.models[0].getKey('sampleRate').value / 1000;
			var numVLines = Math.floor(canvas.width / xPixels);

			//faint lines
			ctx.strokeStyle = '#000000';
			ctx.lineWidth = 0.2;
			ctx.setLineDash([]);
			ctx.beginPath();
			for (var i = 1; i < numVLines; i++) {
				ctx.moveTo(canvas.width / 2 + i * xPixels, 0);
				ctx.lineTo(canvas.width / 2 + i * xPixels, canvas.height);
				ctx.moveTo(canvas.width / 2 - i * xPixels, 0);
				ctx.lineTo(canvas.width / 2 - i * xPixels, canvas.height);
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
		key: '__xTimeBase',
		value: function __xTimeBase(value, data) {
			//console.log(value);
			this.repaintBG(value, data);
		}
	}]);

	return BackgroundView;
}(View);

module.exports = BackgroundView;

},{"./View":6}],3:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

function ChannelConfig() {
	this.yAmplitude = 1;
	this.yOffset = 0;
	this.color = '#ff0000';
}

var channelConfig = [new ChannelConfig()];
var colours = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#00ffff', '#ff00ff'];

var ChannelView = function (_View) {
	_inherits(ChannelView, _View);

	function ChannelView(className, models) {
		_classCallCheck(this, ChannelView);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(ChannelView).call(this, className, models));
	}

	// UI events


	_createClass(ChannelView, [{
		key: 'inputChanged',
		value: function inputChanged($element, e) {
			var key = $element.data().key;
			var channel = $element.data().channel;
			var value = key === 'color' ? $element.val() : parseFloat($element.val());
			this.$elements.filterByData('key', key).filterByData('channel', channel).val(value);
			channelConfig[channel][key] = value;
			this.emit('channelConfig', channelConfig);
		}
	}, {
		key: '_numChannels',
		value: function _numChannels(val) {
			var numChannels = val.value;
			if (numChannels < channelConfig.length) {
				while (numChannels < channelConfig.length) {
					$('#channelViewChannel' + (channelConfig.length - 1)).remove();
					channelConfig.pop();
				}
			} else if (numChannels > channelConfig.length) {
				while (numChannels > channelConfig.length) {
					channelConfig.push(new ChannelConfig());
					channelConfig[channelConfig.length - 1].color = colours[(channelConfig.length - 1) % colours.length];
					var el = $('#channelViewChannel0').clone(true).prop('id', 'channelViewChannel' + (channelConfig.length - 1)).appendTo($(this.$parents[0]));
					el.find('h1').html('Channel ' + (channelConfig.length - 1));
					el.find('input').each(function () {
						$(this).data('channel', channelConfig.length - 1);
					});
					el.find('input[type=color]').val(colours[(channelConfig.length - 1) % colours.length]);
				}
			}
			this.emit('channelConfig', channelConfig);
			this.$elements = $('.' + this.className);
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

},{"./View":6}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

var ControlView = function (_View) {
	_inherits(ControlView, _View);

	function ControlView(className, models) {
		_classCallCheck(this, ControlView);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ControlView).call(this, className, models));

		$('#controlsButton').click(function () {
			return _this.$parents.toggleClass('hidden');
		});
		return _this;
	}

	// UI events


	_createClass(ControlView, [{
		key: 'selectChanged',
		value: function selectChanged($element, e) {
			this.emit('settings-event', $element.data().key, $element.val());
		}
	}, {
		key: 'inputChanged',
		value: function inputChanged($element, e) {
			var key = $element.data().key;
			var value = $element.val();
			this.emit('settings-event', key, value);
			this.$elements.filterByData('key', key).val(value);
		}
	}, {
		key: 'buttonClicked',
		value: function buttonClicked($element, e) {
			this.emit('settings-event', $element.data().key);
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

					if (key === 'upSampling' || key === 'downSampling' || key === 'xTimeBase') {
						this['_' + key](data[key], data);
					} else {
						this.$elements.filterByData('key', key).val(data[key].value);
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
		key: '_upSampling',
		value: function _upSampling(value, data) {
			$('.xTime-display').html((data.xTimeBase * data.downSampling.value / data.upSampling.value).toPrecision(2));
		}
	}, {
		key: '_downSampling',
		value: function _downSampling(value, data) {
			$('.xTime-display').html((data.xTimeBase * data.downSampling.value / data.upSampling.value).toPrecision(2));
		}
	}, {
		key: '_xTimeBase',
		value: function _xTimeBase(value, data) {
			$('.xTime-display').html((data.xTimeBase * data.downSampling.value / data.upSampling.value).toPrecision(2));
		}
	}, {
		key: '__numChannels',
		value: function __numChannels(val, data) {
			var el = this.$elements.filterByData('key', 'triggerChannel');
			el.empty();
			for (var i = 0; i < val.value; i++) {
				var opt = $('<option></option>').html(i).val(i).appendTo(el);
				if (i === data.triggerChannel.value) opt.prop('selected', 'selected');
			}
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

},{"./View":6}],5:[function(require,module,exports){
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

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Model).call(this));

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

var EventEmitter = require('events').EventEmitter;

var View = function (_EventEmitter) {
	_inherits(View, _EventEmitter);

	function View(CSSClassName, models, settings) {
		_classCallCheck(this, View);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(View).call(this));

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

},{"events":1}],7:[function(require,module,exports){
'use strict';

var scope = require('./scope-browser');

},{"./scope-browser":8}],8:[function(require,module,exports){
'use strict';

// worker

var worker = new Worker("js/scope-worker.js");

// models
var Model = require('./Model');
var settings = new Model();

// views
var controlView = new (require('./ControlView'))('scopeControls', [settings]);
var backgroundView = new (require('./BackgroundView'))('scopeBG', [settings]);
var channelView = new (require('./ChannelView'))('channelView', [settings]);

// socket
var socket = io('/BelaScope');

// view events
controlView.on('settings-event', function (key, value) {
	socket.emit('settings-event', key, value);
});
channelView.on('channelConfig', function (channelConfig) {
	worker.postMessage({
		event: 'channelConfig',
		channelConfig: channelConfig
	});
});

// socket events
socket.on('settings', function (newSettings) {
	if (newSettings.frameWidth) newSettings.frameWidth.value = window.innerWidth;
	newSettings.frameHeight = window.innerHeight;
	settings.setData(newSettings);
	//console.log(newSettings);
	//settings.print();
});

// model events
settings.on('set', function (data, changedKeys) {
	if (changedKeys.indexOf('frameWidth') !== -1) {
		var xTimeBase = Math.max(Math.floor(1000 * (data.frameWidth.value / 8) / data.sampleRate.value), 1);
		settings.setKey('xTimeBase', xTimeBase);
		socket.emit('settings-event', 'frameWidth', data.frameWidth.value);
	} else {
		worker.postMessage({
			event: 'settings',
			settings: data
		});
	}
});

// window events
$(window).on('resize', function () {
	settings.setKey('frameWidth', { type: 'integer', value: window.innerWidth });
	settings.setKey('frameHeight', window.innerHeight);
});

// plotting
{
	(function () {
		var plotLoop = function plotLoop() {
			requestAnimationFrame(plotLoop);

			if (plot) {

				plot = false;
				ctx.clearRect(0, 0, width, height);
				//console.log('plotting');

				for (var i = 0; i < numChannels; i++) {

					ctx.strokeStyle = channelConfig[i].color;

					ctx.beginPath();
					ctx.moveTo(0, frame[i * length]);

					for (var j = 1; j < length; j++) {
						ctx.lineTo(j, frame[j + i * length]);
					}

					ctx.stroke();
				}
			} /*else {
     console.log('not plotting');
     }*/
		};

		var canvas = document.getElementById('scope');
		var ctx = canvas.getContext('2d');
		ctx.lineWidth = 2;

		var width = void 0,
		    height = void 0,
		    numChannels = void 0,
		    channelConfig = [];
		settings.on('change', function (data, changedKeys) {
			if (changedKeys.indexOf('frameWidth') !== -1 || changedKeys.indexOf('frameHeight') !== -1) {
				canvas.width = window.innerWidth;
				width = canvas.width;
				canvas.height = window.innerHeight;
				height = canvas.height;
			}
			if (changedKeys.indexOf('numChannels') !== -1) {
				numChannels = data.numChannels.value;
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
			plot = true;
		};

		plotLoop();

		var saveCanvasData = document.getElementById('saveCanvasData');
		saveCanvasData.addEventListener('click', function () {

			var downSampling = settings.getKey('downSampling').value;
			var upSampling = settings.getKey('upSampling').value;
			var sampleRate = settings.getKey('sampleRate').value;

			var out = "data:text/csv;charset=utf-8,";

			for (var i = 0; i < length; i++) {
				out += i * downSampling / (upSampling * sampleRate);
				for (var j = 0; j < numChannels; j++) {
					out += ',' + ((1 - frame[j * length + i] / (height / 2)) * channelConfig[j].yAmplitude - channelConfig[j].yOffset);
				}
				out += '\n';
			}

			this.href = encodeURI(out);
		});
	})();
}

},{"./BackgroundView":2,"./ChannelView":3,"./ControlView":4,"./Model":5}]},{},[7])


//# sourceMappingURL=bundle.js.map
