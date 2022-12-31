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
"use strict";

function CircularBuffer(capacity) {
	if (!(this instanceof CircularBuffer)) return new CircularBuffer(capacity);
	if (typeof capacity != "number" || capacity % 1 != 0 || capacity < 1) throw new TypeError("Invalid capacity");

	this._buffer = new Array(capacity);
	this._capacity = capacity;
	this._first = 0;
	this._size = 0;
}

CircularBuffer.prototype = {
	size: function size() {
		return this._size;
	},
	capacity: function capacity() {
		return this._capacity;
	},
	enq: function enq(value) {
		if (this._first > 0) this._first--;else this._first = this._capacity - 1;
		this._buffer[this._first] = value;
		if (this._size < this._capacity) this._size++;
	},
	push: function push(value) {
		if (this._size == this._capacity) {
			this._buffer[this._first] = value;
			this._first = (this._first + 1) % this._capacity;
		} else {
			this._buffer[(this._first + this._size) % this._capacity] = value;
			this._size++;
		}
	},
	deq: function deq() {
		if (this._size == 0) throw new RangeError("dequeue on empty buffer");
		var value = this._buffer[(this._first + this._size - 1) % this._capacity];
		this._size--;
		return value;
	},
	pop: function pop() {
		return this.deq();
	},
	shift: function shift() {
		if (this._size == 0) throw new RangeError("shift on empty buffer");
		var value = this._buffer[this._first];
		if (this._first == this._capacity - 1) this._first = 0;else this._first++;
		this._size--;
		return value;
	},
	get: function get(start, end) {
		if (this._size == 0 && start == 0 && (end == undefined || end == 0)) return [];
		if (typeof start != "number" || start % 1 != 0 || start < 0) throw new TypeError("Invalid start");
		if (start >= this._size) throw new RangeError("Index past end of buffer: " + start);

		if (end == undefined) return this._buffer[(this._first + start) % this._capacity];

		if (typeof end != "number" || end % 1 != 0 || end < 0) throw new TypeError("Invalid end");
		if (end >= this._size) throw new RangeError("Index past end of buffer: " + end);

		if (this._first + start >= this._capacity) {
			//make sure first+start and first+end are in a normal range
			start -= this._capacity; //becomes a negative number
			end -= this._capacity;
		}
		if (this._first + end < this._capacity) return this._buffer.slice(this._first + start, this._first + end + 1);else return this._buffer.slice(this._first + start, this._capacity).concat(this._buffer.slice(0, this._first + end + 1 - this._capacity));
	},
	toarray: function toarray() {
		if (this._size == 0) return [];
		return this.get(0, this._size - 1);
	}
};

module.exports = CircularBuffer;

},{}],3:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

//// IDE controller
module.exports = {};

var Model = require('./Models/Model');
var popup = require('./popup');
var json = require('./site-text.json');
var utils = require('./utils.js');

// set up models
var models = {};
models.project = new Model();
models.settings = new Model();
models.status = new Model();
models.error = new Model();
models.git = new Model();

// hack to prevent first status update causing wrong notifications
models.status.setData({ running: false, building: false });

// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', function () {
	return editorView.emit('resize');
});

// settings view
var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings], models.settings);
settingsView.on('project-settings', function (data) {
	data.currentProject = models.project.getKey('currentProject');
	socket.emit('project-settings', data);
});

settingsView.on('IDE-settings', function (data) {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('IDE-settings', data);
	socket.emit('IDE-settings', data);
});
settingsView.on('run-on-boot', function (project) {
	return socket.emit('run-on-boot', project);
});
settingsView.on('halt', function () {
	socket.emit('shutdown');
	consoleView.emit('warn', 'Shutting down...');
});
settingsView.on('warning', function (text) {
	return consoleView.emit('warn', text);
});
settingsView.on('do-update', function (data) {
	return socket.emit('do-update', data);
});
settingsView.on('error', function (text) {
	return consoleView.emit('warn', text);
});

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project, models.settings]);
projectView.on('message', function (event, data) {
	if (!data.currentProject && models.project.getKey('currentProject')) {
		data.currentProject = models.project.getKey('currentProject');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// file view
var fileView = new (require('./Views/FileView'))('fileManager', [models.project, models.settings], projectView.getProjectList);
fileView.on('message', function (event, data) {
	if (!data.currentProject && models.project.getKey('currentProject')) {
		data.currentProject = models.project.getKey('currentProject');
	}
	if (!data.fileName && models.project.getKey('fileName')) {
		data.fileName = models.project.getKey('fileName');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

fileView.on('file-uploaded', function () {
	var restartUponUpload = parseInt(models.settings.getKey('restartUponUpload'));
	if (restartUponUpload && models.status.getKey('running')) runProject();
});
fileView.on('file-rejected', function (errMsg) {
	var timestamp = performance.now();
	consoleView.emit('openNotification', { func: 'fileRejected', timestamp: timestamp });
	consoleView.emit('closeNotification', { error: errMsg, timestamp: timestamp, skipPopup: true });
});
fileView.on('list-files', doListFiles);

// editor view
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings], models.settings);
editorView.on('upload', function (fileData) {
	socket.emit('process-event', {
		event: 'upload',
		currentProject: models.project.getKey('currentProject'),
		newFile: models.project.getKey('fileName'),
		fileData: fileData,
		checkSyntax: parseInt(models.settings.getKey('liveSyntaxChecking'))
	});
});
editorView.on('check-syntax', function () {
	if (parseInt(models.settings.getKey('liveSyntaxChecking'))) {
		socket.emit('process-event', {
			event: 'checkSyntax',
			currentProject: models.project.getKey('currentProject'),
			newFile: models.project.getKey('fileName')
		});
	}
});
editorView.on('open-notification', function (data) {
	return consoleView.emit('openNotification', data);
});
editorView.on('close-notification', function (data) {
	return consoleView.emit('closeNotification', data);
});
editorView.on('editor-changed', function () {
	if (models.project.getKey('exampleName')) projectView.emit('example-changed');
});
editorView.on('goto-docs', function (word, id, force) {
	if (force || tabView.getOpenTab() === 'refs') {
		documentationView.emit('open', id);
	}
});
editorView.on('compare-files', function (compare) {
	compareFiles = compare;
	// unset the interval
	if (!compare) setModifiedTimeInterval(undefined);
});
editorView.on('console-brief', function (text, id) {
	consoleView.emit('openNotification', {
		func: 'editor',
		timestamp: id,
		text: text
	});
	setTimeout(function (id) {
		consoleView.emit('closeNotification', { timestamp: id, fulfillMessage: '' });
	}.bind(null, id), 500);
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings]);
toolbarView.on('process-event', function (event) {
	if ('run' === event) runProject();else {
		var data = {
			event: event,
			currentProject: models.project.getKey('currentProject')
		};
		if (event === 'stop') {
			consoleView.emit('openProcessNotification', json.ide_browser.stop);
			toolbarView.emit('msw-start-grace', event);
		}
		socket.emit('process-event', data);
	}
});
toolbarView.on('halt', function () {
	socket.emit('shutdown');
	consoleView.emit('warn', 'Shutting down...');
});
toolbarView.on('clear-console', function () {
	return consoleView.emit('clear', true);
});
toolbarView.on('mode-switch-warning', function (num) {
	return consoleView.emit('warn', num + (num != 1 ? json.ide_browser.mode_switches : json.ide_browser.mode_switch));
});

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings], models.settings);
consoleView.on('focus', function (focus) {
	return models.project.setKey('focus', focus);
});
consoleView.on('open-file', function (fileName, focus) {
	var data = {
		func: 'openFile',
		fileName: fileName,
		focus: focus,
		currentProject: models.project.getKey('currentProject')
	};
	socket.emit('project-event', data);
});
consoleView.on('input', function (value) {
	return socket.emit('sh-command', value);
});
consoleView.on('tab', function (cmd) {
	return socket.emit('sh-tab', cmd);
});

// documentation view
var documentationView = new (require('./Views/DocumentationView'))();
documentationView.on('open-example', function (example) {
	if (projectView.exampleChanged) {
		projectView.exampleChanged = false;
		popup.exampleChanged(function () {
			projectView.emit('message', 'project-event', {
				func: 'openExample',
				currentProject: example
			});
			$('.selectedExample').removeClass('selectedExample');
		}, undefined, 0, function () {
			return projectView.exampleChanged = true;
		});
		return;
	}

	projectView.emit('message', 'project-event', {
		func: 'openExample',
		currentProject: example
	});
	$('.selectedExample').removeClass('selectedExample');
});
documentationView.on('add-link', function (link, type) {
	editorView.emit('add-link', link, type);
});
documentationView.on('open', function (id) {
	documentationView.open(id);
});

// git view
var gitView = new (require('./Views/GitView'))('git-manager', [models.git]);
gitView.on('git-event', function (data) {
	data.currentProject = models.project.getKey('currentProject');
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit('git-event', data);
});
gitView.on('console', function (text) {
	return consoleView.emit('log', text, 'git');
});
gitView.on('console-warn', function (text) {
	return consoleView.emit('warn', text);
});

// refresh file list
var listFilesIntervalMs = 5000;
var listFilesInterval = 0;

// setup socket
var _socket = io('/IDE');
// sub- minimal wrapper for socket.io to inject clientId
var socket = {
	on: function on(what, cb) {
		return _socket.on(what, cb);
	},
	io: _socket.io,
	emit: function emit(what, data) {
		socket.id = _socket.id;
		if ("object" === (typeof data === 'undefined' ? 'undefined' : _typeof(data)) && !Array.isArray(data)) data.clientId = socket.id;
		_socket.emit(what, data);
	}

	// socket events
};socket.on('report-error', function (error) {
	return consoleView.emit('warn', error.message || error);
});

function doListFiles() {
	var currentProject = models.project.getKey('currentProject');
	if (currentProject) {
		socket.emit('list-files', currentProject);
	}
}
socket.on('init', function (data) {

	consoleView.connect();

	var timestamp = performance.now();
	socket.emit('project-event', { func: 'openProject', currentProject: data.settings.project, timestamp: timestamp });
	consoleView.emit('openNotification', { func: 'init', timestamp: timestamp });

	models.project.setData({ projectList: data.projects, exampleList: data.examples, libraryList: data.libraries, currentProject: data.settings.project });
	models.settings.setData(data.settings);

	$('[data-run-on-boot]').val(data.boot_project);

	models.settings.setKey('belaCoreVersion', data.bela_core_version);
	models.settings.setKey('belaImageVersion', data.bela_image_version);
	models.settings.setKey('xenomaiVersion', data.xenomai_version);

	console.log('running on', data.board_string);
	models.settings.setKey('boardString', data.board_string);
	tabView.emit('boardString', data.board_string);

	clearInterval(listFilesInterval);
	listFilesInterval = setInterval(doListFiles, listFilesIntervalMs);

	// TODO! models.status.setData(data[5]);

	//models.project.print();
	//models.settings.print();

	socket.emit('set-time', new Date().toString());

	documentationView.emit('init');

	// hack to stop changes to read-only example being overwritten when opening a new tab
	if (data.settings.project === 'exampleTempProject') models.project.once('set', function () {
		return projectView.emit('example-changed');
	});

	// socket.io timeout
	socket.io.engine.pingTimeout = 6000;
	socket.io.engine.pingInterval = 3000;
});

// project events
socket.on('project-data', function (data) {

	// if the file gets to us, it's because we requested it,
	// so we are going to use it regardless of the current state
	models.project.setKey('openElsewhere', false);
	consoleView.emit('closeNotification', data);
	models.project.setData(data);

	if (data.gitData) models.git.setData(data.gitData);
	setModifiedTimeInterval(data.mtime);
	//console.log(data);
	//models.settings.setData(data.settings);
	//models.project.print();
});
socket.on('stop-reply', function (data) {
	consoleView.emit('closeNotification', data);
});
socket.on('project-list', function (project, list) {
	if (project && list.indexOf(models.project.getKey('currentProject')) === -1) {
		// this project has just been deleted
		socket.emit('project-event', { func: 'openProject', currentProject: project });
	}
	models.project.setKey('projectList', list);
});
socket.on('file-list', function (project, list) {
	if (project && project === models.project.getKey('currentProject')) {
		models.project.setKey('fileList', list);
	}
});

socket.on('status', function (status, project) {
	if (project === models.project.getKey('currentProject') || project === undefined) {
		models.status.setData(status);
		//console.log('status', status);
	}
});

socket.on('project-settings-data', function (project, settings) {
	// console.log('project-settings-data', settings);
	if (project === models.project.getKey('currentProject')) models.project.setData(settings);
});
socket.on('IDE-settings-data', function (settings) {
	return models.settings.setData(settings);
});

socket.on('cpu-usage', function (data) {
	return models.status.setKey('CPU', data);
});
//socket.on('mode-switch', data => models.status.setKey('msw', data) );

socket.on('disconnect', function (reason) {
	console.log('disconnect reason:', reason);
	clearInterval(listFilesInterval);
	consoleView.disconnect();
	toolbarView.emit('disconnected');
	models.project.setKey('readOnly', true);
});

socket.on('file-opened', function (data) {
	fileOpenedOrChanged(data, 0);
});

socket.on('file-changed', function (data) {
	fileOpenedOrChanged(data, 1);
});

function fileOpenedOrChanged(data, changed) {
	var str = changed ? 'changed' : 'opened';
	var project = data.currentProject;
	var fileName = data.fileName;
	var clientId = data.clientId;
	// if someone else opened or changed our file
	// and we arenot ignoring it
	if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName') && clientId != socket.id && !models.project.getKey('openElsewhere') && !models.project.getKey('readOnly')) {
		if (changed) fileChangedPopup(fileName);else enterReadonlyPopup(fileName);
	}
}

// run-on-boot
socket.on('run-on-boot-log', function (text) {
	return consoleView.emit('log', text);
});
//socket.on('run-on-boot-project', project => setTimeout( () => $('#runOnBoot').val(project), 100) );

// shell
socket.on('shell-event', function (evt, data) {
	return consoleView.emit('shell-' + evt, data);
});

// generic log and warn
socket.on('std-log', function (text) {
	return consoleView.emit('log', text);
});
socket.on('std-warn', function (text) {
	return consoleView.emit('warn', text);
});

socket.on('syntax-highlighted', function () {
	return editorView.emit('syntax-highlighted');
});

socket.on('force-reload', function () {
	return setTimeout(function () {
		return window.location.reload(true);
	}, 1000);
});
socket.on('update-error', function (err) {
	popup.overlay();
	consoleView.emit('warn', utils.formatString(json.console.update_error, err));
});

socket.on('mtime', setModifiedTimeInterval);
socket.on('mtime-compare', function (data) {
	if (compareFiles && data.currentProject === models.project.getKey('currentProject') && data.fileName === models.project.getKey('fileName')) {
		// console.log(data, data.fileData, editorView.getData());
		if (data.fileData !== editorView.getData()) fileChangedPopup(data.fileName);
	}
});

var checkModifiedTimeInterval;
var compareFiles = false;
function setModifiedTimeInterval(mtime) {
	// console.log('received mtime', mtime);
	if (checkModifiedTimeInterval) clearInterval(checkModifiedTimeInterval);
	if (!mtime || !compareFiles) return;
	checkModifiedTimeInterval = setInterval(function () {
		// console.log('sent compare-mtime', mtime);
		socket.emit('compare-mtime', {
			currentProject: models.project.getKey('currentProject'),
			fileName: models.project.getKey('fileName'),
			mtime: mtime
		});
	}, 5000);
}

// current file changed
var fileChangedPopupVisible = false;
function fileChangedPopup(fileName) {
	if (fileChangedPopupVisible) return;

	var strings = Object.assign({}, json.popups.file_changed); // make a copy ...
	strings.text = fileName + " " + strings.text; // ... so we can modify it
	popup.twoButtons(strings, function (e) {
		fileChangedPopupVisible = false;
		e.preventDefault();
		var data = {
			func: 'openProject',
			currentProject: models.project.getKey('currentProject'),
			timestamp: performance.now()
		};
		socket.emit('project-event', data);
		consoleView.emit('openNotification', data);
	}, function () {
		fileChangedPopupVisible = false;
		editorView.emit('upload', editorView.getData());
	});
	fileChangedPopupVisible = true;
}

function enterReadonlyPopup(fileName) {
	if (fileChangedPopupVisible) return; //	 changed file takes priority
	var strings = {};
	strings.title = json.popups.enter_readonly.title;
	strings.text = json.popups.enter_readonly.text;
	strings.button = json.popups.enter_readonly.button;
	strings.cancel = json.popups.enter_readonly.cancel;

	// Click the OK button to put page in read-only
	popup.oneButton(strings, function () {
		models.project.setKey('openElsewhere', true);
		setReadOnlyStatus(true);
	});
}

function setReadOnlyStatus(status) {
	if (status) {
		$('div.read-only').addClass('active');
		$('div.read-only').click(function () {
			return exitReadonlyPopup();
		});
	} else {
		$('div.read-only').removeClass('active');
	}
}

function exitReadonlyPopup() {
	var strings = {};
	strings.title = json.popups.exit_readonly.title;
	strings.code = '<p>' + json.popups.exit_readonly.text[0] + '</p><p>' + json.popups.exit_readonly.text[1] + '</p>';
	strings.cancel = json.popups.exit_readonly.cancel;
	strings.button = json.popups.exit_readonly.submit;
	popup.twoButtons(strings,
	// on Submit:
	function (e) {
		setReadOnlyStatus(false);
		window.location.reload();
	},
	// on Cancel:
	function () {
		popup.hide();
	});
}

// helper functions
function runProject() {
	editorView.flush();
	socket.emit('process-event', {
		event: 'run',
		currentProject: models.project.getKey('currentProject')
	});
	toolbarView.emit('msw-start-grace', event);
}

// model events
// build errors
models.status.on('set', function (data, changedKeys) {
	if (changedKeys.indexOf('syntaxError') !== -1) {
		parseErrors(data.syntaxError);
	}
});

// top-bar
models.project.on('change', function (data, changedKeys) {

	var projectName = data.exampleName ? data.exampleName + ' (example)' : data.currentProject;
	// set the browser tab title
	$('[data-title]').html((data.fileName ? data.fileName + ', ' : '') + projectName);
	// set the top-line stuff
	$('[data-current-project]').html(projectName ? projectName : '');
	$('[data-current-file]').html(data.fileName ? data.fileName : '');

	if (data.exampleName) {
		$('#top-example-docs').css('visibility', 'visible');
		$('#top-example-docs-link').prop('href', 'documentation/' + data.exampleName + '_2render_8cpp-example.html');
	} else {
		$('#top-example-docs').css('visibility', 'hidden');
	}
});

// status changes reflected here
models.status.on('change', function (data, changedKeys) {
	if (changedKeys.indexOf('running') !== -1 || changedKeys.indexOf('building') !== -1) {
		if (data.running) {
			$('[data-current-status-title]').html('Running: ');
			$('[data-current-status]').html(data.runProject);
		} else if (data.building) {
			$('[data-current-status-title]').html('Building: ');
			$('[data-current-status]').html(data.buildProject);
		} else {
			$('[data-current-status]').html('');
			$('[data-current-status-title]').html('');
		}
	}
});

// history
{
	var lastState = {},
	    poppingState = true;

	// file / project changed
	models.project.on('change', function (data, changedKeys) {
		if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1) {
			var state = { file: data.fileName, project: data.currentProject };
			if (state.project !== lastState.project || state.file !== lastState.file) {

				if (!poppingState) {
					//console.log('push', state);
					history.pushState(state, null, null);
				}
				poppingState = false;
				lastState = state;
			}
		}
	});

	// load previously open file / project when browser's back button is clicked
	window.addEventListener('popstate', function (e) {
		if (e.state) {
			console.log('opening project ' + e.state.project + ' file ' + e.state.file);
			var data = {
				currentProject: e.state.project,
				newFile: e.state.file,
				func: 'openProject',
				timestamp: performance.now()
			};
			consoleView.emit('openNotification', data);
			socket.emit('project-event', data);
			poppingState = true;
		}
	});
}

// local functions
// parse errors from g++
function parseErrors(data) {
	//console.log('parsing', data, data.split('\n'));
	data = data.split('\n');

	var errors = [];
	for (var i = 0; i < data.length; i++) {

		// ignore errors which begin with 'make'
		if (data[i].length > 1 && data[i].slice(0, 4) !== 'make') {

			var msg = data[i].split('\n');

			for (var j = 0; j < msg.length; j++) {

				var str = msg[j].split(':');
				// console.log(str);
				// str[0] -> file name + path
				// str[1] -> row number
				// str[2] -> column number
				// str[3] -> type of error
				// str[4+] > error message

				if (str[3] === ' error') {
					errors.push({
						file: str[0],
						row: str[1] - 1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
						type: "error"
					});
				} else if (str[3] == ' fatal error') {
					errors.push({
						file: str[0],
						row: str[1] - 1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
						type: "error"
					});
				} else if (str[3] == ' warning') {
					errors.push({
						file: str[0],
						row: str[1] - 1,
						column: str[2],
						text: '[warning] ' + str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
						type: "warning"
					});
				} else if (str[0] == 'pasm') {
					errors.push({
						file: str[1].split(' ')[1].split('(')[0],
						row: parseInt(str[1].split(' ')[1].split('(')[1].split(')')[0]) - 1,
						column: '',
						text: '[pasm] ' + str[2].substring(1),
						type: "error"
					});
				} else {
					//console.log('rejected error string: '+str);
					if (str[2] && str[2].indexOf('linker') !== -1) {
						console.log('linker error');
						// consoleView.emit('warn', 'linker error detected, set verbose build output in settings for details');
					}
				}
			}
		}
	}

	// if no gcc errors have been parsed correctly, but make still thinks there is an error
	// error will contain string 'make: *** [<path>] Error 1'
	if (!errors.length && data.indexOf('make: *** ') !== -1 && data.indexOf('Error 1') !== -1) {
		errors.push({
			text: data,
			type: 'error'
		});
	}

	var currentFileErrors = [],
	    otherFileErrors = [];
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var err = _step.value;

			var file;
			if (err.file) {
				file = err.file.split("projects/");
				if (file.length >= 2) {
					// remove the project name
					file = file[1].split("/");
					file.splice(0, 1);
					file = file.join("/");
				}
			}
			if (!err.file || file === models.project.getKey('fileName')) {
				err.currentFile = true;
				currentFileErrors.push(err);
			} else {
				err.currentFile = false;
				err.text = 'In file ' + file + ': ' + err.text;
				otherFileErrors.push(err);
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

	models.error.setKey('allErrors', errors);
	models.error.setKey('currentFileErrors', currentFileErrors);
	models.error.setKey('otherFileErrors', otherFileErrors);

	models.error.setKey('verboseSyntaxError', data);
}

// hotkeys
var keypress = new window.keypress.Listener();

function allCombosActive() {
	return !popup.isShown();
}
keypress.simple_combo("meta s", function () {
	allCombosActive() && toolbarView.emit('process-event', 'run');
});
keypress.simple_combo("meta f", function () {
	allCombosActive() && editorView.emit('search');
});
keypress.simple_combo("meta o", function () {
	allCombosActive() && tabView.emit('toggle', 'click', 'tab-control');
});
keypress.simple_combo("meta k", function () {
	consoleView.emit('clear', true);
});
keypress.simple_combo("meta h", function () {
	allCombosActive() && documentationView.emit('open');
});
keypress.simple_combo("esc", function () {
	// remove popup on ESC
	var done = popup.cancel();
	// do not prevent default if we did nothing
	return !done;
});

},{"./Models/Model":4,"./Views/ConsoleView":5,"./Views/DocumentationView":6,"./Views/EditorView":7,"./Views/FileView":8,"./Views/GitView":9,"./Views/ProjectView":10,"./Views/SettingsView":11,"./Views/TabView":12,"./Views/ToolbarView":13,"./popup":18,"./site-text.json":19,"./utils.js":20}],4:[function(require,module,exports){
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
		_this.setMaxListeners(50);
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

},{"events":1}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var _console = require('../console');
var json = require('../site-text.json');

var shellCWD = '~';

var modeSwitches;

var ConsoleView = function (_View) {
	_inherits(ConsoleView, _View);

	function ConsoleView(className, models, settings) {
		_classCallCheck(this, ConsoleView);

		var _this = _possibleConstructorReturn(this, (ConsoleView.__proto__ || Object.getPrototypeOf(ConsoleView)).call(this, className, models, settings));

		_this.on('clear', function (force) {
			return _console.clear(undefined, force);
		});
		_console.on('focus', function (focus) {
			return _this.emit('focus', focus);
		});
		_console.on('open-file', function (fileName, focus) {
			return _this.emit('open-file', fileName, focus);
		});

		_this.on('openNotification', _this.openNotification);
		_this.on('closeNotification', _this.closeNotification);
		_this.on('openProcessNotification', _this.openProcessNotification);
		_this.on('log', function (text, css) {
			return _console.log(text, css);
		});
		_this.on('warn', function (warning, id) {
			console.log(warning);
			_console.warn(warning, id);
		});

		// this.form = document.getElementById('beaglert-consoleForm');
		// this.input = document.getElementById('beaglert-consoleInput');
		_this.form = $('[data-console-form]').get(0); // due to the new js attaching method we have to tell vanilla js which jquery object we're selecting - rather than use the first object in the array we're going to use the jquery get(0) method
		_this.input = $('[data-console-input]').get(0);

		// console command line input events
		_this.history = [];
		_this.historyIndex = 0;
		_this.inputFocused = false;

		_this.form.addEventListener('submit', function (e) {
			e.preventDefault();

			_this.history.push(_this.input.value);
			_this.historyIndex = 0;

			_this.emit('input', _this.input.value);
			_console.log(shellCWD + ' ' + _this.input.value, 'log-in');
			_this.input.value = '';
		});

		$('[data-console-input-pre]').on('click', function () {
			return $(_this.input).trigger('focus');
		});

		$('[data-console-input], [data-console-input-pre]').on('mouseover', function () {
			$('[data-console-input-pre]').css('opacity', 1);
		}).on('mouseout', function () {
			if (!_this.inputFocused) $('[data-console-input-pre]').css('opacity', 0.2);
		});

		_this.input.addEventListener('focus', function () {
			_this.inputFocused = true;
			$('[data-console-input-pre]').css('opacity', 1); //.html(shellCWD);
		});
		_this.input.addEventListener('blur', function () {
			_this.inputFocused = false;
			$('[data-console-input-pre]').css('opacity', 0.2); //.html('>');
		});
		window.addEventListener('keydown', function (e) {
			if (_this.inputFocused) {
				if (e.which === 38) {
					// up arrow

					if (_this.history[_this.history.length - ++_this.historyIndex]) {
						_this.input.value = _this.history[_this.history.length - _this.historyIndex];
					} else {
						_this.historyIndex -= 1;
					}

					// force the cursor to the end
					setTimeout(function () {
						if (_this.input.setSelectionRange !== undefined) {
							_this.input.setSelectionRange(_this.input.value.length, _this.input.value.length);
						} else {
							$(_this.input).val(_this.input.value);
						}
					}, 0);
				} else if (e.which === 40) {
					// down arrow
					if (--_this.historyIndex === 0) {
						_this.input.value = '';
					} else if (_this.history[_this.history.length - _this.historyIndex]) {
						_this.input.value = _this.history[_this.history.length - _this.historyIndex];
					} else {
						_this.historyIndex += 1;
					}
				} else if (e.which === 9) {
					// tab
					e.preventDefault();
					_this.emit('tab', _this.input.value);
				}
			}
		});

		// $('[data-console]').on('click', () => $(this.input).trigger('focus') );
		$('[data-console-content-wrapper]').on('click', function (e) {
			return e.stopPropagation();
		});

		_this.on('shell-stdout', function (data) {
			return _this.emit('log', data, 'shell');
		});
		_this.on('shell-stderr', function (data) {
			return _this.emit('warn', data);
		});
		_this.on('shell-cwd', function (cwd) {
			//console.log('cwd', cwd);
			shellCWD = 'root@bela ' + cwd.replace('/root', '~') + '#';
			$('[data-console-input-pre]').html(shellCWD);
		});
		_this.on('shell-tabcomplete', function (data) {
			return $('[data-console-input]').val(data);
		});
		return _this;
	}

	_createClass(ConsoleView, [{
		key: 'openNotification',
		value: function openNotification(data) {
			//if (!funcKey[data.func]) console.log(data.func);
			if (data.func === 'command') {
				var output = 'Executing git ' + (data.command || '');
			} else if (data.func === 'editor') {
				var output = data.text;
			} else {
				var output = funcKey[data.func];
				if (data.newProject || data.currentProject) output += ' ' + (data.newProject || data.currentProject);
				if (data.newFile || data.fileName) output += ' ' + (data.newFile || data.fileName);
				if (data.newFolder) output += ' ' + data.newFolder;
			}
			_console.notify(output + '...', data.timestamp);
		}
	}, {
		key: 'closeNotification',
		value: function closeNotification(data) {
			if (data.error) {
				_console.reject(' ' + data.error, data.timestamp, data.skipPopup);
			} else {
				var fulfillMessage = ' done';
				if (typeof data.fulfillMessage !== 'undefined') fulfillMessage = data.fulfillMessage;
				_console.fulfill(fulfillMessage, data.timestamp);
			}
		}
	}, {
		key: 'openProcessNotification',
		value: function openProcessNotification(text) {
			var timestamp = performance.now();
			_console.notify(text, timestamp);
			_console.fulfill('', timestamp, false);
		}
	}, {
		key: 'connect',
		value: function connect() {
			console.log('connect');
			$('.beaglert-console-warning#console-disconnect').remove();
			_console.unblock();
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			console.log('disconnected');
			_console.warn(json.console.disconnect, 'console-disconnect');
			_console.block();
		}

		// model events
		// syntax

	}, {
		key: '_syntaxLog',
		value: function _syntaxLog(log, data) {
			if (this.settings.fullSyntaxCheckOutput) {
				_console.log(log);
			}
		}
	}, {
		key: '__verboseSyntaxError',
		value: function __verboseSyntaxError(log, data) {
			if (parseInt(this.settings.getKey('verboseErrors'))) {
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = log[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var line = _step.value;

						_console.warn(line.split(' ').join('&nbsp;'), 'make');
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
		}
	}, {
		key: '__allErrors',
		value: function __allErrors(errors, data) {
			//console.log(data);
			_console.newErrors(errors);
		}

		// build

	}, {
		key: '_buildLog',
		value: function _buildLog(log, data) {
			//console.log(log, data);
			//if (this.settings.fullBuildOutput){
			_console.log(log, 'make');
			//}
		}

		// bela

	}, {
		key: '__belaLog',
		value: function __belaLog(log, data) {
			_console.log(log, 'bela');
		}
	}, {
		key: '__belaLogErr',
		value: function __belaLogErr(log, data) {
			if (!log.includes('make: *** wait')) // block unneccesary errors when killing process
				_console.warn(log);
			//_console.warn(log.split(' ').join('&nbsp;'));
		}
	}, {
		key: '__belaResult',
		value: function __belaResult(data) {
			//if (data.stderr && data.stderr.split) _console.warn(data.stderr.split(' ').join('&nbsp;'));
			//if (data.signal) _console.warn(data.signal);
			//console.log(data.signal)
		}
	}, {
		key: '_building',
		value: function _building(status, data) {
			var timestamp = performance.now();
			if (status) {
				_console.notify('Building project ...', timestamp, true);
				_console.fulfill('', timestamp, true);
			} else {
				_console.notify('Build finished', timestamp, true);
				_console.fulfill('', timestamp, true);
			}
		}
	}, {
		key: '_running',
		value: function _running(status, data) {
			var timestamp = performance.now();
			if (status) {
				_console.notify('Running project ...', timestamp, true);
				_console.fulfill('', timestamp, true);
			} else {
				_console.notify('Bela stopped', timestamp, true);
				/*if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined'){
    	_console.reject(' with signal '+data.belaResult.signal, timestamp, data.skipPopup);
    } else {*/
				_console.fulfill('', timestamp, true);
				//}
			}
		}
	}, {
		key: '_CPU',
		value: function _CPU(data) {
			if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela && data.bela.split) {
				_console.log(data.bela.split(' ').join('&nbsp;'));
			}
			/*if (data.modeSwitches && modeSwitches) {
   	let ms = parseInt(data.modeSwitches);
   	if (ms > modeSwitches && ms !== 67117 && ms > 2) _console.warn(ms+' mode switches detected on audio thread!');
   	modeSwitches = ms;
   	//console.log(data.modeSwitches, modeSwitches);
   } else {
   	modeSwitches = data.modeSwitches ? parseInt(data.modeSwitches) : data.modeSwitches;
   }*/
		}
	}, {
		key: '_consoleDelete',
		value: function _consoleDelete(value) {
			_console.setConsoleDelete(parseInt(value));
		}
	}]);

	return ConsoleView;
}(View);

module.exports = ConsoleView;

var funcKey = {
	'openProject': json.funcKeys.openProject,
	'uploadZipProject': json.funcKeys.uploadZipProject,
	'openExample': json.funcKeys.openExample,
	'newProject': json.funcKeys.newProject,
	'saveAs': json.funcKeys.saveAs,
	'deleteProject': json.funcKeys.deleteProject,
	'cleanProject': json.funcKeys.cleanProject,
	'openFile': json.funcKeys.openFile,
	'newFile': json.funcKeys.newFile,
	'uploadFile': json.funcKeys.uploadFile,
	'renameFile': json.funcKeys.renameFile,
	'deleteFile': json.funcKeys.deleteFile,
	'init': json.funcKeys.init,
	'stop': json.funcKeys.stop,
	'fileRejected': json.funcKeys.fileRejected
};

},{"../console":15,"../popup":18,"../site-text.json":19,"./View":14}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var json = require('../site-text.json');
var addAccordionEvent = require('../utils').addAccordionEvent;

var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];
var i = 0;

var classes = [
  // 'Scope',
  // 'OSCServer',
  // 'OSCClient',
  // 'OSCMessageFactory',
  // 'UdpServer',
  // 'UdpClient',
  // 'Midi',
  // 'MidiParser',
  // 'WriteFile'
];

var DocumentationView = function (_View) {
  _inherits(DocumentationView, _View);

  function DocumentationView(className, models) {
    _classCallCheck(this, DocumentationView);

    var _this = _possibleConstructorReturn(this, (DocumentationView.__proto__ || Object.getPrototypeOf(DocumentationView)).call(this, className, models));

    _this.on('init', _this.init);

    return _this;
  }

  _createClass(DocumentationView, [{
    key: 'init',
    value: function init() {

      var self = this;
      ['context', 'api', 'utility'].forEach(function (section) {
        var m = $('[data-docs-' + section + ']');
        m.empty();
      });

      // The API
      $.ajax({
        type: "GET",
        url: "documentation_xml?file=Bela_8h",
        dataType: "html",
        success: function success(xml) {
          var counter = 0;
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = apiFuncs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var item = _step.value;

              var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains(' + item + '))'), 'APIDocs' + counter, self, 'api');
              li.appendTo($('[data-docs-api]'));
              counter += 1;
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
      });

      // The Audio Context
      $.ajax({
        type: "GET",
        url: "documentation_xml?file=structBelaContext",
        dataType: "html",
        success: function success(xml) {
          var counter = 0;
          createlifromxml($(xml), 'contextDocs' + counter, 'structBelaContext', self, 'contextType').appendTo($('[data-docs-context]'));
          counter += 1;
          $(xml).find('memberdef').each(function () {
            var li = createlifrommemberdef($(this), 'contextDocs' + counter, self, 'context');
            li.appendTo($('[data-docs-context]'));
            counter += 1;
          });
        }
      });

      // Utilities
      $.ajax({
        type: "GET",
        url: "documentation_xml?file=Utilities_8h",
        dataType: "html",
        success: function success(xml) {
          var counter = 0;
          createlifromxml($(xml), 'utilityDocs' + counter, 'Utilities_8h', self, 'header').appendTo($('[data-docs-utility]'));
          counter += 1;
          $(xml).find('memberdef').each(function () {
            var li = createlifrommemberdef($(this), 'utilityDocs' + counter, self, 'utility');
            li.appendTo($('[data-docs-utility]'));
            counter += 1;
          });
        }
      });

      // all classes
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = classes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var item = _step2.value;

          xmlClassDocs(item, this);
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
    key: 'open',
    value: function open(id) {
      console.log("TODO: open documentation tab at `", id, "`");
    }
  }]);

  return DocumentationView;
}(View);

module.exports = DocumentationView;

function createlifrommemberdef($xml, id, emitter, type) {
  i += 1;
  var name = $xml.find('name').html();
  emitter.emit('add-link', { name: name, id: id }, type);

  var li = $('<li></li>');

  // title
  var button = $('<button></button>');
  var elementName = name + "-" + i;
  button.addClass('accordion-sub').attr('data-accordion-for', elementName).html($xml.find('name').html()).attr('data-parent', 'refs');
  addAccordionEvent(button);
  button.appendTo(li);

  var content = $('<div></div>').addClass('docs-content').attr('data-accordion', elementName);
  var title = $('<h3></h3>').addClass('memberdef-title').html($xml.find('definition').html() + $xml.find('argsstring').html());

  title.appendTo(content);

  // subtitle
  content.append($('<p></p>').html($xml.find('briefdescription > para').html() || ''));

  // main text
  $xml.find('detaileddescription > para').each(function () {
    if ($(this).find('parameterlist').length) {
      content.append('<h4>Parameters:</h4>');
      var ul = $('<ul></ul>');
      $(this).find('parameteritem').each(function () {
        var li = $('<li></li>');
        li.append($('<h5></h5>').html($(this).find('parametername').html() + ': '));
        $(this).find('parameterdescription>para').each(function () {
          li.append($('<p></p>').html($(this).html() || ''));
        });
        ul.append(li);
      });
      content.append(ul);
    } else {
      content.append($('<p></p>').html($(this).html() || ''));
    }
  });

  li.append(content);
  return li;
}

function createlifromxml($xml, id, filename, emitter, type) {
  var name = $xml.find('compoundname').html();
  emitter.emit('add-link', { name: name, id: id }, type);
  var li = $('<li></li>');

  var content = $('<div></div>').addClass('intro-content');

  // subtitle
  li.append($('<h3></h3>').addClass('intro-header').attr('data-accordion-for', name).html($xml.find('compounddef > briefdescription > para').html() || ''));
  addAccordionEvent(li);

  // main text
  $xml.find('compounddef > detaileddescription > para').each(function () {
    if ($(this).find('parameterlist').length) {
      content.append('<h3>Parameters:</h3>');
      var ul = $('<ul></ul>');
      $(this).find('parameteritem').each(function () {
        var li = $('<li></li>');
        li.append($('<h4></h4>').html($(this).find('parametername').html() + ': '));
        $(this).find('parameterdescription>para').each(function () {
          li.append($('<p></p>').html($(this).html() || ''));
        });
        ul.append(li);
      });
      content.append(ul);
    } else {
      content.append($('<p></p>').html($(this).html() || ''));
    }
  });

  content.append('<a href="documentation/' + filename + '.html" target="_blank" class="button">' + json.docs_view.button + '</a>');

  li.append(content);
  return li;
}

function xmlClassDocs(classname, emitter) {
  var filename = 'class' + classname;
  var parent = $('[data-docs="' + classname + 'Docs"]');
  $.ajax({
    type: "GET",
    url: "documentation_xml?file=" + filename,
    dataType: "html",
    success: function success(xml) {
      var counter = 0;
      createlifromxml($(xml), classname + counter, filename, emitter, 'typedef').appendTo(parent);
      emitter.emit('add-link', { name: classname, id: classname + counter }, 'header');

      counter += 1;
      $(xml).find('[kind="public-func"]>memberdef:not(:has(name:contains(' + classname + ')))').each(function () {
        var li = createlifrommemberdef($(this), classname + counter, emitter, classname);
        li.appendTo(parent);
        counter += 1;
      });

      $.ajax({
        type: "GET",
        url: "documentation_xml?file=" + classname + "_8h",
        dataType: "html",
        success: function success(xml) {
          var includes = $(xml).find('includedby');
          var doInclude = false;
          if (includes.length) {
            var content = $('<div></div>').addClass('subsections');
            content.append($('<p class="examples-header"></p>').html(json.docs_view.examples));
            var exampleList = $('<ul></ul>').addClass('example-list');
            includes.each(function () {
              var exampleListItem = $('<li></li>');
              var include = $(this).html();
              exampleListItem.attr('data-location', include);
              if (include && include.split && include.split('/')[0] === 'examples') {
                doInclude = true;
                var link = $('<a></a>').html(include.split('/')[2]).text(include);
                link.on('click', function () {
                  return emitter.emit('open-example', [include.split('/')[1], include.split('/')[2]].join('/'));
                });
                exampleListItem.append(link);
                exampleListItem.appendTo(exampleList);
              }
            });
            if (doInclude) {
              exampleList.appendTo(content);
              content.appendTo($('[data-docs="' + classname + 'Docs"]').parent());
            }
          }
        }
      });
    }
  });
}

},{"../site-text.json":19,"../utils":20,"./View":14}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var Range = ace.require('ace/range').Range;
var json = require('../site-text.json');
var TokenIterator = ace.require("ace/token_iterator").TokenIterator;

var uploadDelay = 50;

var uploadBlocked = false;
var editorDirty = false;
var currentFile;
var imageUrl;
var tmpData = {};
var tmpOpts = {};
var activeWords = [];
var activeWordIDs = [];

var EditorView = function (_View) {
	_inherits(EditorView, _View);

	function EditorView(className, models, data) {
		_classCallCheck(this, EditorView);

		var _this = _possibleConstructorReturn(this, (EditorView.__proto__ || Object.getPrototypeOf(EditorView)).call(this, className, models));

		_this.projectModel = models[0];

		_this.highlights = {};
		var data = tmpData;
		var opts = tmpOpts;

		_this.editor = ace.edit('editor');
		var langTools = ace.require("ace/ext/language_tools");

		_this.parser = require('../parser');
		_this.parser.init(_this.editor, langTools);
		_this.parser.enable(true);

		_this.editor.$blockScrolling = Infinity;

		// set theme
		_this.editor.setTheme("ace/theme/chrome");
		_this.editor.setShowPrintMargin(false);

		// autocomplete settings
		_this.editor.setOptions({
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: false,
			enableSnippets: true
		});
		_this.editor.renderer.setOptions({
			//this ensures that the offset to hide the scrollbar in #editor is constant
			vScrollBarAlwaysVisible: true
		});

		// use hard tabs, not spaces
		_this.editor.session.setOption('useSoftTabs', false);

		// this function is called when the user modifies the editor
		_this.editor.session.on('change', function (e) {
			//console.log('upload', !uploadBlocked);
			var data = tmpData;
			var opts = tmpOpts;
			if (!uploadBlocked) {
				_this.editorChanged(false);
				_this.editor.session.bgTokenizer.fireUpdateEvent(0, _this.editor.session.getLength());
				// console.log('firing tokenizer');
			}
			// set syntax mode - defaults to text
			if (opts.fileType && opts.fileType == "cpp" || opts.fileType == "c" || opts.fileType == "h" || opts.fileType == "hh" || opts.fileType == "hpp" || opts.fileType == "cc") {
				_this.editor.session.setMode('ace/mode/c_cpp');
			} else if (opts.fileType && opts.fileType == "js") {
				_this.editor.session.setMode('ace/mode/javascript');
			} else if (opts.fileType && opts.fileType == "csd") {
				_this.editor.session.setMode('ace/mode/csound_document');
			} else if (opts.fileType && opts.fileType == "scd") {
				_this.editor.session.setMode('ace/mode/supercollider');
			} else {
				// if we don't know what the file extension is just default to plain text
				_this.editor.session.setMode('ace/mode/text');
			}
		});

		// fired when the cursor changes position
		_this.editor.session.selection.on('changeCursor', function () {
			_this.getCurrentWord();
		});

		/*this.editor.session.on('changeBackMarker', (e) => {
  	console.log($('.bela-ace-highlight'));
  	$('.bela-ace-highlight').on('click', (e) => {
  		console.log('click');
  		this.getCurrentWord();
  	});
  });*/

		_this.on('resize', function () {
			_this.editor.resize();
			_this.resize();
		});

		_this.on('add-link', function (link, type) {

			if (!_this.highlights[type] || !_this.highlights[type].length) _this.highlights[type] = [];

			_this.highlights[type].push(link);

			/*if (activeWords.indexOf(name) == -1){
   	activeWords.push(name);
   	activeWordIDs.push(id);
   }*/
			if (_this.linkTimeout) clearTimeout(_this.linkTimeout);
			_this.linkTimeout = setTimeout(function () {
				return _this.parser.highlights(_this.highlights);
			});
		});

		_this.editor.session.on('tokenizerUpdate', function (e) {
			// console.log('tokenizerUpdate');
			_this.parser.parse(function () {
				_this.getCurrentWord();
			});
		});

		_this.on('search', _this.search);

		var allAltSelectors = ['data-img-display-parent', 'data-img-display', 'data-audio-parent', 'data-audio', 'data-pd-svg-parent', 'data-pd-svg', 'data-editor-msg-parent', 'data-editor-msg'];
		allAltSelectors = '[' + allAltSelectors.join('], [') + ']'; // turn them into valid jquery selectors
		_this.allEditorAlts = $(allAltSelectors);
		return _this;
	}

	_createClass(EditorView, [{
		key: 'search',
		value: function search() {
			this.editor.execCommand('find');
		}
	}, {
		key: 'flush',
		value: function flush() {
			this.editorChanged(true);
		}
	}, {
		key: 'editorChanged',
		value: function editorChanged(flush) {
			var _this2 = this;

			clearTimeout(this.uploadTimeout);
			var doUpdate = function doUpdate() {
				editorDirty = false;
				_this2.emit('upload', _this2.editor.getValue());
			};
			if (flush) {
				if (editorDirty) doUpdate();
			} else {
				editorDirty = true;
				this.emit('editor-changed');
				this.uploadTimeout = setTimeout(doUpdate, uploadDelay);
			}
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.allEditorAlts.css({
				'max-width': $('[data-editor]').width() + 'px',
				'height': $('[data-editor]').height() - 2 + 'px' // -2 because it makes for a better Pd patch
			});
		}
		// model events
		// new file saved

	}, {
		key: '__fileData',
		value: function __fileData(data, opts, dunno, resize) {
			this.resize();
			// hide all views. Below, the current one will be re-enabled
			this.allEditorAlts.removeClass('active');
			$('[data-editor]').removeClass('active');

			tmpData = data;
			tmpOpts = opts;

			this.modelChanged({ readOnly: true }, ['readOnly']);
			this.modelChanged({ openElsewhere: false }, ['openElsewhere']);

			this.projectModel.setKey('readOnly', true);
			if (!opts.fileType) opts.fileType = '0';

			if (null === data || null === opts.fileName || 'binary' === opts.fileType) {
				// file can not be viewed, print a warning
				var err = void 0;
				if ('binary' === opts.fileType) err = json.editor_view.binary.error;else err = json.editor_view.deleted.error; // file deleted or somehow not available
				$('[data-editor-msg]').html(err);
				$('[data-editor-msg-parent]').addClass('active');
			} else if (opts.fileType.indexOf('image') !== -1) {

				// opening image file
				$('[data-img-display-parent]').addClass('active');

				$('[data-img-display]').prop('src', 'media/' + opts.fileName);

				// stop comparison with file on disk
				this.emit('compare-files', false);
			} else if (opts.fileType.indexOf('audio') !== -1) {

				$('[data-audio-parent]').addClass('active').css({
					'position': 'absolute',
					'left': $('[data-editor]').width() / 2 - $('[data-audio]').width() / 2 + 'px',
					'top': $('[data-editor]').height() / 2 - $('[data-audio]').height() / 2 + 'px'
				});

				$('[data-audio]').prop('src', 'media/' + opts.fileName);

				// stop comparison with file on disk
				this.emit('compare-files', false);
			} else {

				if (opts.fileType === 'pd') {

					// we're opening a pd patch
					var timestamp = performance.now();
					this.emit('open-notification', {
						func: 'editor',
						timestamp: timestamp,
						text: json.editor_view.preview
					});

					// render pd patch
					try {
						$('[data-pd-svg]').empty().html(pdfu.renderSvg(pdfu.parse(data), { svgFile: false, removeOld: false }));
						$('[data-pd-svg-parent]').addClass('active');
						this.emit('close-notification', { timestamp: timestamp });
					} catch (e) {
						this.emit('close-notification', {
							timestamp: timestamp,
							text: 'Rendering pd patch failed!'
						});
						throw e;
					}

					// load an empty string into the editor
					data = '';

					// start comparison with file on disk
					this.emit('compare-files', true);
				} else {

					this.projectModel.setKey('readOnly', false);
					// show the editor
					$('[data-editor]').addClass('active');

					// stop comparison with file on disk
					this.emit('compare-files', false);
				}

				// block upload
				uploadBlocked = true;

				// put the file into the editor
				if ('string' !== typeof data) data = ''; // if no data, at least empty the editor
				this.editor.session.setValue(data, -1);

				// parse the data
				this.parser.parse();

				// unblock upload
				uploadBlocked = false;

				// force a syntax check
				this.emit('check-syntax');

				// focus the editor
				this.__focus(opts.focus);
			}
		}
		// editor focus has changed

	}, {
		key: '__focus',
		value: function __focus(data) {

			if (data && data.line !== undefined && data.column !== undefined) this.editor.gotoLine(data.line, data.column);

			this.editor.focus();
		}
		// syntax errors in current file have changed

	}, {
		key: '_currentFileErrors',
		value: function _currentFileErrors(errors) {

			// clear any error annotations on the ace editor
			this.editor.session.clearAnnotations();

			if (errors.length >= 1) {
				// errors exist!
				// annotate the errors in this file
				this.editor.session.setAnnotations(errors);
			}
		}
		// autocomplete settings have changed

	}, {
		key: '_liveAutocompletion',
		value: function _liveAutocompletion(status) {
			//console.log(status, (parseInt(status) === 1));
			this.editor.setOptions({
				enableLiveAutocompletion: parseInt(status) === 1
			});
		}
	}, {
		key: '_openElsewhere',
		value: function _openElsewhere(status) {
			var _this3 = this;

			var magic = 23985235;
			this.projectModel.setKey('readOnly', status);
			if (status) {
				$('#editor').on('keypress', function (e) {
					_this3.emit('console-brief', json.editor_view.keypress_read_only, magic);
				});
			} else {
				$('#editor').off('keypress');
			}
		}

		// readonly status has changed

	}, {
		key: '_readOnly',
		value: function _readOnly(status) {
			if (status) {
				$('.ace_content').addClass('editor_read_only');
				this.editor.setReadOnly(true);
			} else {
				$('.ace_content').removeClass('editor_read_only');
				this.editor.setReadOnly(false);
			}
		}
		// a new file has been opened

	}, {
		key: '_fileName',
		value: function _fileName(name, data) {
			currentFile = name;
		}
	}, {
		key: 'getCurrentWord',
		value: function getCurrentWord() {
			var pos = this.editor.getCursorPosition();
			//var range = this.editor.session.getAWordRange(pos.row, pos.column);
			/*var word = this.editor.session.getTextRange(this.editor.session.getAWordRange(pos.row, pos.column)).trim();
   var index = activeWords.indexOf(word);
   var id;
   if (index !== -1) id = activeWordIDs[index];
   //console.log(word, index);
   this.emit('goto-docs', index, word, id);*/

			var iterator = new TokenIterator(this.editor.getSession(), pos.row, pos.column);
			var token = iterator.getCurrentToken();
			if (!token || !token.range) {
				//console.log('no range');
				return;
			}

			//console.log('clicked', token);

			var markers = this.parser.getMarkers();
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = markers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var marker = _step.value;

					if (token.range.isEqual(marker.range) && marker.type && marker.type.name && marker.type.id) {
						//console.log(marker);
						this.emit('goto-docs', marker.type.name, marker.type.id);
						return;
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
		key: 'getData',
		value: function getData() {
			return this.editor.getValue();
		}
	}]);

	return EditorView;
}(View);

module.exports = EditorView;

},{"../parser":17,"../site-text.json":19,"./View":14}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var utils = require('../utils');
var sanitise = utils.sanitise;
var json = require('../site-text.json');
var sanitisePath = function sanitisePath(name) {
	return sanitise(name, { isPath: true });
};
var prettySize = utils.prettySize;

var sourceIndeces = ['cpp', 'c', 's'];
var headerIndeces = ['h', 'hh', 'hpp'];
var imageIndeces = ['jpg', 'jpeg', 'png', 'gif'];
var absIndeces = ['pd'];
var overlayActiveClass = 'active-drag-upload';
var lastOverlay = void 0;

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var largeFileQueue = [];
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

var listCount = 0;

function isDragEvent(e, type) {
	return e.originalEvent.dataTransfer.types.includes(type);
}

// the old version of jQuery we are using cannot easily add/remove classes
// from svg elements. We need to work around that.
// See: https://stackoverflow.com/questions/8638621/jquery-svg-why-cant-i-addclass
// Solution below is (modified) from https://stackoverflow.com/a/24194877/2958741
/*
 * .addClassSVG(className)
 * Adds the specified class(es) to each of the set of matched SVG elements.
 */
$.fn.addClassSVG = function (className) {
	$(this).attr('class', function (index, existingClassNames) {
		return (existingClassNames !== undefined ? existingClassNames + ' ' : '') + className;
	});
	return this;
};

/*
 * .removeClassSVG(className)
 * Removes the specified class to each of the set of matched SVG elements.
 */
$.fn.removeClassSVG = function (className) {
	$(this).attr('class', function (index, existingClassNames) {
		if (!existingClassNames) return '';
		var re = new RegExp(' *\\b' + className + '\\b', 'g');
		return existingClassNames.replace(re, '');
	});
	return this;
};

var FileView = function (_View) {
	_inherits(FileView, _View);

	function FileView(className, models, getProjectList) {
		_classCallCheck(this, FileView);

		var _this = _possibleConstructorReturn(this, (FileView.__proto__ || Object.getPrototypeOf(FileView)).call(this, className, models));

		_this.getProjectList = getProjectList;
		_this.currentProject = null;
		_this.listOfFiles = [];

		var data = {
			fileName: "",
			project: ""
		};

		_this.folderItems = [];
		_this.svg = $('[data-drag-svg]');
		var body = $('body');
		body.off('dragenter dragover drop dragleave');
		body.on('dragenter', function (e) {
			if (!isDragEvent(e, "Files")) return;
			_this.buildOverlay();
			_this.showOverlay();
		});
		_this.svg.on('dragover dragleave drop', function (e) {
			if (!isDragEvent(e, "Files")) return;
			e.preventDefault();
			if ('dragover' === e.type) return;
			if ('drop' === e.type) {
				_this.svg.addClassSVG('no');
				setTimeout(function () {
					_this.hideOverlay();
					_this.svg.removeClassSVG('no');
				}, 300);
			} else if ('dragleave' === e.type) {
				_this.hideOverlay();
			}
		});
		return _this;
	}

	_createClass(FileView, [{
		key: 'createDragPolygon',
		value: function createDragPolygon(points, dataFunc, dataArg) {
			//let polygon = document.createElement("polygon");
			var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
			this.svg.append(polygon);
			polygon = $(polygon);
			polygon.attr('data-drag-func', dataFunc);
			polygon.attr('data-drag-arg', dataArg);
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = points[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var point = _step.value;

					var p = this.svg[0].createSVGPoint();
					p.x = point[0];
					p.y = point[1];
					polygon[0].points.appendItem(p);
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

			this.dragFileHandler(polygon, polygon);
			return polygon;
		}
	}, {
		key: 'dragFileHandler',
		value: function dragFileHandler(target, overlay) {
			var _this2 = this;

			var getAttr = function getAttr(e, attr) {
				return $(e.currentTarget).attr(attr);
			};
			// target is the element that starts the drag-drop gesture
			// overlay is the element which displays it.
			// the gesture starts when entering target and ends
			// when leaving _overlay_
			target.off('dragenter dragover drop dragleave');
			overlay.off('dragleave');
			overlay.on('dragleave', function (overlay, e) {
				if (!isDragEvent(e, "Files")) return;
				overlay.removeClassSVG(overlayActiveClass);
			}.bind(this, overlay));
			// not sure we need dragover AND e.preventDefault() in order for drop to work
			// Not sure how that works, but this is hinted at here https://www.w3schools.com/jsref/event_ondrop.asp
			target.on('dragenter dragover drop', function (overlay, e) {
				if (!isDragEvent(e, "Files")) return;
				e.stopPropagation();
				e.preventDefault();
				if ('dragenter' === e.type) {
					overlay.addClassSVG(overlayActiveClass);
				} else if (e.type == 'drop') {
					for (var i = 0; i < e.originalEvent.dataTransfer.files.length; i++) {
						var file = e.originalEvent.dataTransfer.files[i];
						// the `data-drag-func=main` is the largest drop target.
						// For now, we make it behave exactly as if it was
						// `data-drag-func=folder data-drag-arg=''`
						// (i.e.: upload files to the project's root folder).
						var folder = void 0;
						var attr = getAttr(e, 'data-drag-func');
						if ('main' === attr) folder = '';else if ('folder' === attr) folder = getAttr(e, 'data-drag-arg');
						if ('undefined' === typeof folder) continue;
						file.folder = folder;
						file.overlay = overlay;
						fileQueue.push(file);
					}
					_this2.processQueue();
				}
				return false;
			}.bind(this, overlay));
		}
	}, {
		key: 'buildOverlay',
		value: function buildOverlay() {
			this.svg.empty();
			// First, draw one polygon per each folder
			// do not draw outside the area of the"Directories" list
			// things are complicated by the presence of the scroll on the side tab.
			var title = $(".title-container");
			if (!title.length) // in case we are not ready yet, don't do anything
				return;
			var bar = $("#toolbar");
			var maxY = bar.offset().top - $(window).scrollTop();;
			var directories = $(".section.is-dir");
			var dirOffset = directories.offset() ? directories.offset().top : maxY; // if no directories, we will take up the whole surface so maxY = minY
			var minY = Math.max(dirOffset - $(window).scrollTop(), title.offset().top - $(window).scrollTop() + title.height());
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = this.folderItems[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var listItem = _step2.value;

					var overlay = listItem;
					var folder = $("[data-folder]", listItem).attr('data-file');
					var offset = listItem.offset();
					var posY = offset.top - $(window).scrollTop();
					var posX = offset.left - $(window).scrollLeft();
					var wid = listItem.width();
					var hei = listItem.height();
					if (posY > maxY || posY + hei < minY) continue;
					if (posY + hei > maxY) hei = maxY - posY;
					if (posY < minY) {
						hei -= minY - posY;
						posY = minY;
					}
					if (hei < 15) continue;
					var _pol = this.createDragPolygon([[posX, posY], [posX + wid, posY], [posX + wid, posY + hei], [posX, posY + hei]], 'folder', folder);
				}
				// now draw a polygon that covers almost everything else.
				// We need a C-shaped polygon which skips the folder boxes above.
				// The C's "cutout" is delimited by minY, maxY and maxX
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

			var menu = $('[data-tab-menu]');
			var maxX = menu.offset().left + menu.width();
			var pol = this.createDragPolygon([[0, 0], [this.svg.width(), 0], [this.svg.width(), minY], [maxX, minY], [maxX, maxY], [this.svg.width(), maxY], [this.svg.width(), this.svg.height()], [0, this.svg.height()]], 'main', '');
		}
	}, {
		key: 'showOverlay',
		value: function showOverlay() {
			this.svg.addClassSVG(overlayActiveClass);
		}
	}, {
		key: 'hideOverlay',
		value: function hideOverlay() {
			if (this.svg) {
				this.svg.removeClassSVG(overlayActiveClass);
				$('polygon', this.svg).removeClassSVG(overlayActiveClass);
			}
		}

		// UI events

	}, {
		key: 'buttonClicked',
		value: function buttonClicked($element) {
			var func = $element.data().func;
			if (func && this[func]) {
				this[func](func);
			}
		}
	}, {
		key: '_getFlattenedFileList',
		value: function _getFlattenedFileList(foldersOnly) {
			var listDir = function listDir(out, inp, base) {
				if (!base) base = '';
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = inp[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var f = _step3.value;

						if (!foldersOnly || isDir(f)) out.push(base + f.name);
						if (isDir(f)) listDir(out, f.children, base + f.name + '/');
					}
				} catch (err) {
					_didIteratorError3 = true;
					_iteratorError3 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion3 && _iterator3.return) {
							_iterator3.return();
						}
					} finally {
						if (_didIteratorError3) {
							throw _iteratorError3;
						}
					}
				}
			};
			var flattenedFiles = [];
			listDir(flattenedFiles, this.listOfFiles);
			return flattenedFiles;
		}
	}, {
		key: 'newFile',
		value: async function newFile(func, base) {
			var _this3 = this;

			var name = await popup.requestValidInputAsync({
				initialValue: base ? base + '/' : '',
				getDisallowedValues: function getDisallowedValues() {
					return _this3._getFlattenedFileList(false);
				},
				strings: json.popups.create_new_file,
				sanitise: sanitisePath
			});
			if (null === name) return;
			this.emit('message', 'project-event', { func: func, newFile: name });
		}
	}, {
		key: 'newFolder',
		value: async function newFolder(func) {
			var _this4 = this;

			var name = await popup.requestValidInputAsync({
				initialValue: '',
				getDisallowedValues: function getDisallowedValues() {
					return _this4._getFlattenedFileList(true);
				},
				strings: json.popups.create_new_folder,
				sanitise: sanitisePath
			});
			if (null === name) return;
			this.emit('message', 'project-event', { func: func, newFolder: name });
		}
	}, {
		key: 'uploadSizeError',
		value: function uploadSizeError(name) {
			var _this5 = this;

			var strings = Object.assign({}, json.popups.upload_size_error);
			strings.title = utils.formatString(strings.title, utils.breakable(name));
			this.hideOverlay();
			popup.twoButtons(strings, function () {
				_this5.uploadFile();
			}, undefined, {
				titleClass: 'error',
				error: true
			});
		}
	}, {
		key: 'uploadFileError',
		value: function uploadFileError() {
			popup.twoButtons(json.popups.upload_file_nofileselected_error, function onSubmit(e) {
				this.uploadFile();
			}.bind(this), undefined, {
				titleClass: 'error'
			});
		}
	}, {
		key: 'uploadFile',
		value: function uploadFile(func) {
			popup.twoButtons(json.popups.upload_file, async function onSubmit(e) {
				var _this6 = this;

				var formEl = $('[data-popup] form')[0];
				var formDataOrig = new FormData(formEl);
				var formData = new FormData();
				var uploadFiles = 0;
				var selectedFiles = 0;
				var _iteratorNormalCompletion4 = true;
				var _didIteratorError4 = false;
				var _iteratorError4 = undefined;

				try {
					for (var _iterator4 = formDataOrig.entries()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						var entry = _step4.value;

						++selectedFiles;
						// TODO: can we get useful directory information here?
						var bareName = entry[1].name.split('\\').pop();
						var destName = sanitise(bareName);
						// TODO: this should check against sanitised versions of the
						// filenames that have already been checked, so that we
						// are forbidden to upload e.g.: 'ren er.cpp' and 'ren_er.cpp'
						// at the same time.
						////let file = Object.assign({}, entry[1]);
						//file.name = sanitise(file.name);
						var ret = await this.promptForOverwrite(destName);
						if (ret.do) {
							formData.append(entry[0], entry[1]);
							uploadFiles++;
						}
						// bundle project-event messages in the POST in order to
						// move the file once it's been saved _before_ returning success
						formData.append("project-event", JSON.stringify({
							currentProject: this.currentProject,
							func: 'moveUploadedFile',
							newFile: bareName,
							sanitisedNewFile: destName
						}));
					}
				} catch (err) {
					_didIteratorError4 = true;
					_iteratorError4 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion4 && _iterator4.return) {
							_iterator4.return();
						}
					} finally {
						if (_didIteratorError4) {
							throw _iteratorError4;
						}
					}
				}

				if (!selectedFiles) this.uploadFileError();
				if (uploadFiles) utils.doLargeFileUpload(formData, function (r) {
					// would be great if these could be sent as part of the POST body
					// note: for drag-and-drop files, the equivalent to these is
					// done in ProjectManager::uploadFile on the server
					_this6.emit('list-files');
					_this6.emit('file-uploaded');
					popup.ok(json.popups.upload_file_success);
				}, function (e) {
					_this6.emit('list-files');
					popup.ok({
						title: json.popups.upload_file_error.title,
						text: e.responseText
					});
				});
			}.bind(this));
			popup.form.attr('action', '/uploads').attr('enctype', 'multipart/form-data').attr('method', 'POST');
			popup.form.prepend('<input type="file" name="data" multiple data-form-file></input><br/><br/>');
		}
	}, {
		key: 'rename',
		value: async function rename(type, e) {
			var _this7 = this;

			var popupStrings = void 0;
			if ('file' === type) popupStrings = json.popups.rename_file;else if ('folder' === type) popupStrings = json.popups.rename_folder;else return;
			// Get the name of the file to be renamed:
			var name = $(e.target).data('name');
			var path = name;
			popupStrings = Object.assign({}, popupStrings);
			popupStrings.title = 'Rename `' + path + '`?';
			var newName = await popup.requestValidInputAsync({
				initialValue: path,
				getDisallowedValues: function getDisallowedValues() {
					// remove current name (i.e.: allow rename to same, which
					// yields NOP)
					var arr = _this7._getFlattenedFileList(false);
					arr.splice(arr.indexOf(name), 1);
					return arr;
				},
				strings: popupStrings,
				sanitise: sanitisePath
			});
			if (null === newName) return;
			if (newName === path) // rename to same: NOP
				return;
			if ('file' === type) this.emit('message', 'project-event', { func: 'renameFile', oldName: name, newFile: newName });else if ('folder' === type) this.emit('message', 'project-event', { func: 'renameFolder', oldName: name, newFolder: newName });
			popup.hide();
		}
	}, {
		key: 'renameFile',
		value: function renameFile(e) {
			this.rename('file', e);
		}
	}, {
		key: 'renameFolder',
		value: function renameFolder(e) {
			this.rename('folder', e);
		}
	}, {
		key: 'deleteFile',
		value: function deleteFile(e) {
			// Get the name of the file to be deleted:
			var name = $(e.target).data('name');
			var func = $(e.target).data('func');
			var strings = Object.assign({}, json.popups.delete_file);
			strings.title = utils.formatString(strings.title, utils.breakable(name));
			popup.twoButtons(strings, function onSubmit(e) {
				this.emit('message', 'project-event', { func: 'deleteFile', fileName: name, currentFile: $('[data-current-file]')[0].innerText });
			}.bind(this));
		}
	}, {
		key: 'openFile',
		value: function openFile(e) {
			this.emit('message', 'project-event', { func: 'openFile', newFile: $(e.currentTarget).data('file') });
		}

		// model events

	}, {
		key: '_fileList',
		value: function _fileList(files, data) {
			var _this8 = this;

			this.folderItems = [];

			// TODO: it would be great to be able to get this from this.models, but
			// we don't actually know which one is the project model, so we cache
			// it here instead
			this.currentProject = data.currentProject;
			if (!Array.isArray(files)) return;

			this.listOfFiles = files;

			var $files = $('[data-file-list]');
			$files.empty();

			var headers = [];
			var sources = [];
			var abstractions = [];
			var resources = [];
			var directories = [];
			var images = [];
			var _iteratorNormalCompletion5 = true;
			var _didIteratorError5 = false;
			var _iteratorError5 = undefined;

			try {
				for (var _iterator5 = files[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
					var it = _step5.value;


					// defensive copy so that changes below to the way the size is
					// displayed do not affect the model
					var _item = Object.assign({}, it);
					// exclude hidden files

					if (!viewHiddenFiles && (_item.name[0] === '.' || isDir(_item) && _item.name === 'build' || _item.name === 'settings.json' || _item.name == data.currentProject)) {
						continue;
					}

					if (isDir(_item)) {

						directories.push(_item);
					} else {

						var ext = _item.name.split('.').pop();

						if (sourceIndeces.indexOf(ext) !== -1) {
							sources.push(_item);
						} else if (headerIndeces.indexOf(ext) !== -1) {
							headers.push(_item);
						} else if (imageIndeces.indexOf(ext.toLowerCase()) !== -1) {
							images.push(_item);
						} else if (ext == "pd" && _item.name == "_main.pd") {
							sources.push(_item);
						} else if (ext == "pd") {
							abstractions.push(_item);
						} else if (_item) {
							resources.push(_item);
						}
					}
				}
			} catch (err) {
				_didIteratorError5 = true;
				_iteratorError5 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion5 && _iterator5.return) {
						_iterator5.return();
					}
				} finally {
					if (_didIteratorError5) {
						throw _iteratorError5;
					}
				}
			}

			var pd = '_main.pd';
			var render = 'render.cpp';
			headers.sort(function (a, b) {
				return a.name - b.name;
			});
			sources.sort(function (a, b) {
				return a.name - b.name;
			});
			sources.sort(function (a, b) {
				return a.name == pd ? -1 : b.name == pd ? 1 : 0;
			});
			sources.sort(function (a, b) {
				return a.name == render ? -1 : b.name == render ? 1 : 0;
			});
			abstractions.sort(function (a, b) {
				return a.name - b.name;
			});
			images.sort(function (a, b) {
				return a.name - b.name;
			});
			resources.sort(function (a, b) {
				return a.name - b.name;
			});
			directories.sort(function (a, b) {
				return a.name - b.name;
			});

			var file_list_elements = [sources, headers, abstractions, images, resources, directories];
			file_list_elements[0].name = json.file_view.sources;
			file_list_elements[1].name = json.file_view.headers;
			file_list_elements[2].name = json.file_view.abstractions;
			file_list_elements[3].name = json.file_view.images;
			file_list_elements[4].name = json.file_view.resources;
			file_list_elements[5].name = json.file_view.directories;
			var i18n_dir_str = json.file_view.directories;

			// Build file structure by listing the contents of each section (if they exist)

			for (var i = 0; i < file_list_elements.length; i++) {

				if (file_list_elements[i].length) {

					var section = $('<div></div>').addClass('section');
					$('<p></p>').addClass('file-heading').html(file_list_elements[i].name).appendTo(section);
					// console.log('current sec: ' + file_list_elements[i].name);
					var fileList = $('<ul></ul>').addClass('sub-file-list');

					for (var j = 0; j < file_list_elements[i].length; j++) {
						var listItem = $('<li></li>').addClass('source-file').appendTo(fileList);
						var item = file_list_elements[i][j];
						// var itemData = $('<div></div>').addClass('source-data-container').appendTo(listItem);
						if (file_list_elements[i].name != i18n_dir_str) {
							var itemText = $('<div></div>').addClass('source-text').html(item.name + ' <span class="file-list-size">' + prettySize(item.size) + '</span>').attr('data-file', item.name).appendTo(listItem).on('click', function (e) {
								return _this8.openFile(e);
							});
							var renameButton = $('<button></button>').addClass('file-rename file-button fileManager').attr('title', 'Rename').attr('data-func', 'renameFile').attr('data-name', item.name).appendTo(listItem).on('click', function (e) {
								return _this8.renameFile(e);
							});
							var downloadButton = $('<button></button>').addClass('file-download file-button fileManager').attr('href-stem', '/download?project=' + data.currentProject + '&file=').attr('data-name', item.name).appendTo(listItem).on('click', function (e, projName) {
								return _this8.downloadFile(e, data.currentProject);
							});
							var deleteButton = $('<button></button>').addClass('file-delete file-button fileManager').attr('title', 'Delete').attr('data-func', 'deleteFile').attr('data-name', item.name).appendTo(listItem).on('click', function (e) {
								return _this8.deleteFile(e);
							});
						} else {
							section.addClass('is-dir');
							var itemText = $('<div></div>').addClass('source-text').text(item.name).attr('data-file', item.name).attr('data-folder', '').appendTo(listItem);
							var renameButton = $('<button></button>').addClass('file-rename file-button fileManager').attr('title', 'Rename').attr('data-func', 'renameFolder').attr('data-name', item.name).appendTo(listItem).on('click', function (e) {
								return _this8.renameFolder(e);
							});
							var newButton = $('<button></button>').addClass('file-new file-button fileManager').attr('title', 'New File').attr('data-func', 'newFile').attr('data-folder', item.name).appendTo(listItem).on('click', function () {
								return _this8.newFile('newFile', event.target.dataset.folder);
							});
							var deleteButton = $('<button></button>').addClass('file-delete file-button fileManager').attr('title', 'Delete').attr('data-func', 'deleteFile').attr('data-name', item.name).appendTo(listItem).on('click', function (e) {
								return _this8.deleteFile(e);
							});
							var subList = $('<ul></ul>');
							for (var k = 0; k < item.children.length; k++) {
								var child = item.children[k];
								var path = item.name + '/' + child.name;
								var size = typeof child.size !== 'undefined' ? prettySize(child.size) : '';
								var subListItem = $('<li></li>').addClass('source-file');
								var itemText = $('<div></div>').addClass('source-text').html(child.name + ' <span class="file-list-size">' + size + '</span>').attr('data-file', path).appendTo(subListItem).on('click', function (e) {
									return _this8.openFile(e);
								});
								var deleteButton = $('<button></button>').addClass('file-delete file-button fileManager').attr('title', 'Delete').attr('data-func', 'deleteFile').attr('data-name', path).appendTo(subListItem).on('click', function (e) {
									return _this8.deleteFile(e);
								});
								var renameButton = $('<button></button>').addClass('file-rename file-button fileManager').attr('title', 'Rename').attr('data-func', 'renameFile').attr('data-name', path).appendTo(subListItem).on('click', function (e) {
									return _this8.renameFile(e);
								});
								if (!child.children) {
									var downloadButton = $('<button></button>').addClass('file-download file-button fileManager').attr('href-stem', '/download?project=' + data.currentProject + '&file=').attr('data-name', path).appendTo(subListItem).on('click', function (e, projName) {
										return _this8.downloadFile(e, data.currentProject);
									});
								}
								subListItem.appendTo(subList);
							}
							subList.appendTo(listItem);
							this.folderItems.push(listItem);
						}
					}
					fileList.appendTo(section);
					section.appendTo($files);
				}
			}
			this.buildOverlay(); // this is needed only in case an updated file list comes in while the overlay is active
			if (data && data.fileName) this._fileName(data.fileName);
		}
	}, {
		key: 'downloadFile',
		value: function downloadFile(e, projName) {
			var filename = $(e.target).attr('data-name');
			var project = projName;
			var href = $(e.target).attr('href-stem') + filename;
			e.preventDefault(); //stop the browser from following the link
			window.location.href = href;
		}
	}, {
		key: '_fileName',
		value: function _fileName(file, data) {

			// select the opened file in the file manager tab
			$('.selectedFile').removeClass('selectedFile');

			var foundFile = false;
			$('[data-file-list]').find('li').each(function () {
				if ($(this).data('file') === file) {
					$(this).addClass('selected');
					foundFile = true;
				} else {
					$(this).removeClass('selected');
				}
			});
		}
	}, {
		key: 'processQueue',
		value: function processQueue() {
			var _this9 = this;

			// keep processing the queue in the background
			if (!uploadingFile && fileQueue.length) {
				setTimeout(function () {
					if (!uploadingFile && fileQueue.length) {
						var file = fileQueue.pop();
						// 20mb maximum drag and drop file size
						if (file.size >= 20000000) {
							// postpone large files
							largeFileQueue.push(file.name);
							// and keep going
							_this9.processQueue();
						} else {
							_this9.doFileUpload(file);
						}
					}
				}, 0);
			} else if (largeFileQueue.length) {
				// once we finished uploading the small files, print a
				// single error message for all of the large ones
				this.uploadSizeError(largeFileQueue.join('`, `'));
				largeFileQueue = [];
			}
		}
	}, {
		key: 'promptForOverwrite',
		value: async function promptForOverwrite(filename) {
			var _this10 = this;

			return new Promise(function (resolve, reject) {
				var fileExists = _this10._getFlattenedFileList().includes(filename);
				var dont = {
					do: false,
					force: false
				};
				if (fileExists && askForOverwrite) {
					popup.twoButtons({
						title: json.popups.overwrite.title,
						text: filename + json.popups.overwrite.text,
						button: json.popups.overwrite.button
					}, function onSubmit(e) {
						if (popup.find('input[type=checkbox]').is(':checked')) {
							askForOverwrite = false;
							overwriteAction = 'upload';
						}
						resolve({
							do: true,
							force: true
						});
					}.bind(_this10), function onCancel() {
						if (popup.find('input[type=checkbox]').is(':checked')) {
							askForOverwrite = false;
							overwriteAction = 'reject';
						}
						resolve(dont);
					});
					var checkbox = '<input id="popup-remember-upload" type="checkbox"><label for="popup-remember-upload">' + json.popups.overwrite.tick + '</label<br\>';
					popup.form.prepend(checkbox);
					popup.find('.cancel').focus();
				} else if (fileExists && !askForOverwrite) {

					if (overwriteAction === 'upload') {
						resolve({
							do: true,
							force: true
						});
					} else {
						resolve(dont);
						_this10.emit('file-rejected', 'upload failed, file ' + filename + ' already exists.');
					}
				} else {
					resolve({
						do: true,
						force: false
					});
				}
			});
		}
	}, {
		key: 'doFileUpload',
		value: async function doFileUpload(file) {

			if (uploadingFile) {
				fileQueue.push(file);
				return;
			}
			uploadingFile = true;

			var basePath = file.folder ? file.folder + '/' : '';
			var obj = await this.promptForOverwrite(basePath + sanitise(file.name));
			var saveas = null;
			if (obj.do) {
				var isProject = void 0;
				if (file.name.search(/\.zip$/) != -1) {
					var newProject = sanitise(file.name.replace(/\.zip$/, ""));
					var strings = Object.assign({}, json.popups.create_new_project_from_zip);
					strings.title += file.name;
					saveas = await popup.requestValidInputAsync({
						initialValue: newProject,
						getDisallowedValues: this.getProjectList,
						strings: strings,
						sanitise: sanitise
					});
					isProject = true;
				} else {
					saveas = basePath + sanitise(file.name);
					isProject = false;
				}
				if (null !== saveas) this.actuallyDoFileUpload(file, saveas, obj.force, isProject);
			}
			lastOverlay = file.overlay;
			if (null === saveas) {
				// when the last file is actuallyDoFileUpload'ed above, the overlay is
				// removed there upon completion
				// If the last file in the queue is not uploaded, however, we have to
				// remove the overlay here
				if (!fileQueue.length) this.hideOverlay();
			}
			uploadingFile = false;
			this.processQueue();
		}
	}, {
		key: 'actuallyDoFileUpload',
		value: async function actuallyDoFileUpload(file, saveas, force, isProject) {
			var _this11 = this;

			var reader = new FileReader();
			var onloadend = function onloadend(func, args, ev) {
				if (func && ev) {
					if (ev.loaded != ev.total || ev.srcElement.error || ev.target.error || null === ev.target.result) _this11.emit('file-rejected', 'error while uploading ' + file.name);else {
						args.func = func;
						args.fileData = ev.target.result;
						args.force = force;
						args.queue = fileQueue.length;
						_this11.emit('message', 'project-event', args);
					}
					if (!fileQueue.length) {
						_this11.hideOverlay();
					}
				}
			};
			// TODO: if something fails on the server(e.g.: project existing, file
			// cannot be written, whatev), the rest of the queue may not be handled
			// properly because the popup from the error will overwrite any active popup.
			// A reset may be required.
			if (isProject) {
				reader.onloadend = onloadend.bind(this, 'uploadZipProject', {
					newProject: saveas,
					newFile: saveas + '.zip'
				});
			} else {
				reader.onloadend = onloadend.bind(this, 'uploadFile', {
					newFile: saveas
				});
			}
			reader.readAsArrayBuffer(file);
		}
	}, {
		key: '_viewHiddenFiles',
		value: function _viewHiddenFiles(val) {
			viewHiddenFiles = val;
			if (firstViewHiddenFiles) {
				firstViewHiddenFiles = false;
			} else {
				this.emit('message', 'project-event', { func: 'openProject', timestamp: performance.now() });
			}
		}
	}]);

	return FileView;
}(View);

function isDir(item) {
	return typeof item.size === 'undefined' && typeof item.children !== 'undefined';
}

module.exports = FileView;

},{"../popup":18,"../site-text.json":19,"../utils":20,"./View":14}],9:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var json = require('../site-text.json');

var GitView = function (_View) {
	_inherits(GitView, _View);

	function GitView(className, models, settings) {
		_classCallCheck(this, GitView);

		var _this = _possibleConstructorReturn(this, (GitView.__proto__ || Object.getPrototypeOf(GitView)).call(this, className, models, settings));

		_this.$form = $('[data-git-form]');
		_this.$input = $('[data-git-input]');

		// git input events
		_this.$form.on('submit', function (e) {
			e.preventDefault();
			_this.emit('git-event', {
				func: 'command',
				command: _this.$input.val()
			});
			_this.$input.val('');
		});
		return _this;
	}

	_createClass(GitView, [{
		key: 'buttonClicked',
		value: function buttonClicked($element, e) {
			var func = $element.data().func;
			if (this[func]) {
				this[func]();
				return;
			}
			var command = $element.data().command;
			this.emit('git-event', { func: func, command: command });
		}
	}, {
		key: 'selectChanged',
		value: function selectChanged($element, e) {
			this.emit('git-event', {
				func: 'command',
				command: 'checkout ' + ($("option:selected", $element).data('hash') || $("option:selected", $element).val())
			});
		}
	}, {
		key: 'commit',
		value: function commit() {
			var _this2 = this;

			// build the popup content
			popup.title(json.popups.commit.title);
			popup.subtitle(json.popups.commit.text);

			var form = [];
			form.push('<input type="text" placeholder="' + json.popups.commit.input + '">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup confirm">' + json.popups.commit.button + '</button>');
			form.push('<button type="button" class="button popup cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this2.emit('git-event', { func: 'command', command: 'commit -am "' + popup.find('input[type=text]').val() + '"' });
				popup.hide();
			});

			popup.find('.cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'branch',
		value: function branch() {
			var _this3 = this;

			// build the popup content
			popup.title(json.popups.branch.title);
			popup.subtitle(json.popups.branch.text);

			var form = [];
			form.push('<input type="text" placeholder="' + json.popups.branch.input + '">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup confirm">' + json.popups.branch.button + '</button>');
			form.push('<button type="button" class="button popup cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this3.emit('git-event', { func: 'command', command: 'checkout -b ' + popup.find('input[type=text]').val() });
				popup.hide();
			});

			popup.find('.cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'discardChanges',
		value: function discardChanges() {
			var _this4 = this;

			// build the popup content
			popup.title(json.popups.discard.title);
			popup.subtitle(json.popups.discard.text);

			var form = [];
			form.push('<button type="submit" class="button popup confirm">' + json.popups.discard.button + '</button>');
			form.push('<button type="button" class="button popup cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this4.emit('git-event', { func: 'command', command: 'checkout -- .' });
				popup.hide();
			});

			popup.find('.cancel').on('click', popup.hide);

			popup.show();

			popup.find('.confirm').trigger('focus');
		}
	}, {
		key: '_repoExists',
		value: function _repoExists(exists) {
			if (exists) {
				$('[data-git-repo]').css('display', 'block');
				$('[data-git-no-repo]').css('display', 'none');
			} else {
				$('[data-git-repo]').css('display', 'none');
				$('[data-git-no-repo]').css('display', 'block');
			}
		}
	}, {
		key: '__commits',
		value: function __commits(commits, git) {

			var commits = commits.split('\n');
			var current = git.currentCommit.trim();
			var branches = git.branches.split('\n');

			// fill commits menu
			// var $commits = $('#commits');
			var $commits = $('[data-git-commits]');
			$commits.empty();

			var commit, hash, opt;
			for (var i = 0; i < commits.length; i++) {
				commit = commits[i].split(' ');
				if (commit.length > 2) {
					hash = commit.pop().trim();
					opt = $('<option></option>').html(commit.join(' ')).data('hash', hash).appendTo($commits);
					if (hash === current) {
						$(opt).attr('selected', 'selected');
					}
				} else {
					//$('<option></option>').html(commit).appendTo($commits);
					if (!(commit.length == 1 && commit[0] === '')) console.log('skipped commit', commit);
				}
			}

			// fill branches menu
			// var $branches = $('#branches');
			var $branches = $('[data-git-branches]');
			$branches.empty();

			for (var i = 0; i < branches.length; i++) {
				if (branches[i]) {
					opt = $('<option></option>').html(branches[i]).appendTo($branches);
					if (branches[i][0] === '*') {
						$(opt).attr('selected', 'selected');
					}
				}
			}
		}
	}, {
		key: '__stdout',
		value: function __stdout(text, git) {
			this.emit('console', text);
		}
	}, {
		key: '__stderr',
		value: function __stderr(text) {
			this.emit('console', text);
		}
	}]);

	return GitView;
}(View);

module.exports = GitView;

},{"../popup":18,"../site-text.json":19,"./View":14}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;
var json = require('../site-text.json');
var example_order = require('../../../../examples/order.json');
var utils = require('../utils');
var addAccordionEvent = utils.addAccordionEvent;

var ProjectView = function (_View) {
  _inherits(ProjectView, _View);

  function ProjectView(className, models) {
    _classCallCheck(this, ProjectView);

    // add extra callback registration for selectChanged
    var _this = _possibleConstructorReturn(this, (ProjectView.__proto__ || Object.getPrototypeOf(ProjectView)).call(this, className, models));

    _this.$elements.on('click', 'li.proj-li', function (e) {
      return _this.selectChanged($(e.currentTarget), e);
    });
    _this.on('example-changed', function () {
      return _this.exampleChanged = true;
    });
    _this.getProjectList = function () {
      if (_this.projectList) return _this.projectList;else return [];
    };
    return _this;
  }

  // UI events


  _createClass(ProjectView, [{
    key: 'selectChanged',
    value: function selectChanged($element, e) {
      var _this2 = this;

      if (this.exampleChanged) {
        this.exampleChanged = false;
        popup.exampleChanged(function (arg) {
          _this2.emit('message', 'project-event', arg);
        }, { func: $element.data().func, currentProject: $element.data().name }, 0, function () {
          _this2.exampleChanged = true;
        });
        return;
      }

      this.emit('message', 'project-event', { func: $element.attr("data-func"), currentProject: $element.attr("data-name") });
    }
  }, {
    key: 'onClickOpenExample',
    value: function onClickOpenExample(e) {
      var _this3 = this;

      var link = e.target.dataset.exampleLink;
      if (this.exampleChanged) {
        this.exampleChanged = false;
        popup.exampleChanged(function (link) {
          _this3.emit('message', 'project-event', {
            func: 'openExample',
            currentProject: link
          });
          $('.selectedExample').removeClass('selectedExample');
          $(e.target).addClass('selectedExample');
        }, link, 0, function () {
          return _this3.exampleChanged = true;
        });
        return;
      }

      this.emit('message', 'project-event', {
        func: 'openExample',
        currentProject: link
      });
      $('.selectedExample').removeClass('selectedExample');
      $(e.target).addClass('selectedExample');
    }
  }, {
    key: 'buttonClicked',
    value: function buttonClicked($element, e) {
      var func = $element.data().func;
      if (func && this[func]) {
        this[func](func);
      }
    }
  }, {
    key: 'newProject',
    value: function newProject(func) {
      var _this4 = this;

      if (this.exampleChanged) {
        this.exampleChanged = false;
        popup.exampleChanged(this.newProject.bind(this), func, 500, function () {
          return _this4.exampleChanged = true;
        });
        return;
      }

      popup.requestValidInput({
        getDisallowedValues: this.getProjectList,
        strings: json.popups.create_new,
        sanitise: sanitise
      }, function (newProject) {
        if (null === newProject) return;
        _this4.emit('message', 'project-event', {
          func: func,
          newProject: newProject,
          projectType: popup.find('input[type=radio]:checked').data('type')
        });
        $('[data-projects-select]').html('');
        popup.hide();
      });
      var form = [];
      form.push('<label for="popup-C" class="radio-container">C++');
      form.push('<input id="popup-C" type="radio" name="project-type" data-type="C" checked>');
      form.push('<span class="radio-button"></span>');
      form.push('</label>');
      form.push('<label for="popup-PD" class="radio-container">Pure Data');
      form.push('<input id="popup-PD" type="radio" name="project-type" data-type="PD">');
      form.push('<span class="radio-button"></span>');
      form.push('</label>');
      form.push('<label for="popup-SC" class="radio-container">SuperCollider');
      form.push('<input id="popup-SC" type="radio" name="project-type" data-type="SC">');
      form.push('<span class="radio-button"></span>');
      form.push('</label>');
      form.push('<label for="popup-CS" class="radio-container">Csound');
      form.push('<input id="popup-CS" type="radio" name="project-type" data-type="CS">');
      form.push('<span class="radio-button"></span>');
      form.push('</label>');
      popup.form.prepend(form.join('\n'));
    }
  }, {
    key: 'saveAs',
    value: async function saveAs(func) {
      var newName = await popup.requestValidInputAsync({
        getDisallowedValues: this.getProjectList,
        strings: json.popups.save_as,
        sanitise: sanitise
      });
      if (null === newName) return;
      this.emit('message', 'project-event', { func: func, newProject: newName });
    }
  }, {
    key: 'deleteProject',
    value: function deleteProject(e) {
      var _this5 = this;

      // build the popup content
      // Get the project name text from the object at the top of the editor
      var name = $('[data-current-project]')[0].innerText;

      popup.title(utils.formatString(json.popups.delete_project.title, utils.breakable(name)));
      popup.subtitle(json.popups.delete_project.text);

      var form = [];
      form.push('<button type="submit" class="button popup delete">' + json.popups.delete_project.button + '</button>');
      form.push('<button type="button" class="button popup cancel">Cancel</button>');

      popup.form.append(form.join('')).off('submit').on('submit', function (e) {
        e.preventDefault();
        $('[data-projects-select]').html('');
        _this5.emit('message', 'project-event', { func: 'deleteProject' });
        popup.hide();
      });

      popup.find('.cancel').on('click', popup.hide);

      popup.show();

      popup.find('.delete').trigger('focus');
    }
  }, {
    key: 'cleanProject',
    value: function cleanProject(func) {
      this.emit('message', 'project-event', { func: func });
    }

    // model events

  }, {
    key: '_projectList',
    value: function _projectList(projects, data) {

      var $projects = $('[data-projects-select]');
      $projects.empty();

      // fill project menu with projects
      if (projects.length > 0) {
        var projLen = projects.length;
      }
      $projects.attr('size', projLen - 1);
      this.projectList = [];
      for (var i = 0; i < projLen; i++) {
        if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.') {
          this.projectList.push(projects[i]);
          $('<li></li>').addClass('projectManager proj-li').attr('data-func', 'openProject').html(projects[i]).attr('data-name', projects[i]).appendTo($projects).on('click', function () {
            $(this).blur();
            $(this).parent().parent().removeClass('show');
          });
        }
      }

      if (data && data.currentProject) this._currentProject(data.currentProject);
    }
  }, {
    key: '_exampleList',
    value: function _exampleList(examplesDir) {
      var _this6 = this;

      var $examples = $('[data-examples]');
      var oldListOrder = examplesDir;
      var newListOrder = [];
      var orphans = [];

      $examples.empty();

      if (!examplesDir.length) return;

      example_order.forEach(function (new_item) {
        oldListOrder.forEach(function (item) {
          if (new_item == item.name) {
            newListOrder.push(item);
            item.moved = true;
          }
        });
      });

      oldListOrder.forEach(function (item) {
        if (item.moved != true) {
          orphans.push(item);
        }
      });

      var orderedList = newListOrder.concat(orphans);

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        var _loop = function _loop() {
          var item = _step.value;

          var parentButton = $('<button></button>').addClass('accordion').attr('data-accordion-for', item.name).html(item.name).attr('data-parent', 'examples');
          addAccordionEvent(parentButton);
          var parentUl = $('<ul></ul>');
          var parentLi = $('<li></li>');
          var childUl = $('<ul></ul>').addClass('example-list');
          var childDiv = $('<div></div>').addClass('panel').attr('data-accordion', item.name);

          childOrder = [];
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = item.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var child = _step2.value;

              childOrder.push({ "name": child });
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

          function generateChildren(childOrder, item, that) {
            for (var i = 0; i < childOrder.length; i++) {
              var child = childOrder[i].name;
              if ("order.json" === child) continue;
              var link = item.name + '/' + child;
              var childLi = $('<li></li>');
              childLi.html(child).attr('data-example-link', link).on('click', that.onClickOpenExample.bind(that));
              childLi.appendTo(childUl);
            }
          }
          if (childOrder.find(function (child) {
            return child.name === 'order.json';
          })) {
            $.ajax({
              type: "GET",
              url: "/examples/" + item.name + "/order.json",
              dataType: "json",
              error: function (item, childOrder, jqXHR, textStatus) {
                console.log("Error while retrieving order.json for ", item.name, ": ", textStatus, ". Using default ordering.");
                generateChildren(childOrder, item, this);
              }.bind(_this6, item, childOrder),
              success: function (item, text) {
                var newChildOrder = [];
                text.forEach(function (item) {
                  newChildOrder.push({ "name": item });
                });

                var oldChildOrder = [];
                item.children.forEach(function (item) {
                  if (item !== "order.json") {
                    oldChildOrder.push({ "name": item });
                  }
                });

                var correctedChildOrder = [];
                newChildOrder.forEach(function (new_item) {
                  oldChildOrder.forEach(function (old_item) {
                    if (new_item.name == old_item.name) {
                      correctedChildOrder.push(new_item);
                      old_item.moved = true;
                    }
                  });
                });

                var childOrphans = [];
                oldChildOrder.forEach(function (old_item) {
                  if (old_item.moved != true) {
                    childOrphans.push(old_item);
                  }
                });

                childOrder = correctedChildOrder.concat(childOrphans);

                generateChildren(childOrder, item, this);
              }.bind(_this6, item)
            });
          } else {
            generateChildren(childOrder, item, _this6);
          }
          // per section
          // item.name -> parentDiv $examples
          parentButton.appendTo(parentLi);
          // per item in section
          // childLi -> childUl -> parentDiv -> $examples
          childUl.appendTo(childDiv);
          childDiv.appendTo(parentLi);
          parentLi.appendTo(parentUl);
          parentLi.appendTo($examples);
        };

        for (var _iterator = orderedList[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var childOrder;

          _loop();
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
    key: '_libraryList',
    value: function _libraryList(librariesDir) {
      var _this7 = this;

      var $libraries = $('[data-libraries-list]');
      var counter = 0;
      $libraries.empty(librariesDir);
      if (!librariesDir.length) return;

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        var _loop2 = function _loop2() {
          var item = _step3.value;

          /*
          Button header text    +
          Library description here.
           [Later button to launch KB]
           Use this library:
          ------------------------------
          // This div is includeContent
          #include <example>                                // This line is includeLine
          (small) Copy and paste in the header of render.cpp// This line is includeInstructions
          // End includeContent
           Examples:
          ------------------------------
          > one
          > two
           Files:
          ------------------------------
          > one
          > two
           Library info:
          ------------------------------
          Name: XXX
          Version: XXX
          Author: XXX (mailto link)
          Maintainer: xxx
          */
          counter++;

          var name = item.name;
          var parentButton = $('<button></button>').addClass('accordion').attr('data-accordion-for', name).html(name).attr('data-parent', 'libraries');
          addAccordionEvent(parentButton);
          var libraryList = $('<ul></ul>'); // This is the list of library items headed by dropdowns
          var libraryItem = $('<li></li>'); // Individual library dropdown

          var libraryPanel = $('<div></div>').addClass('panel').attr('data-accordion', name); // Div container for library dropdown info
          var libDesc = $('<p></p>').addClass('library-desc'); // Div to contain lib descriotion
          var libVer = $('<p></p>').addClass('library-ver');

          // INCLUDES:
          var includeTitle = $('<button></button>').addClass('accordion-sub').text(json.tabs.includeTitle).attr('data-accordion-for', 'use-' + counter).attr('data-parent', 'libraries'); // Header for include instructions
          addAccordionEvent(includeTitle);
          var includeContent = $('<div></div>').addClass('include-container docs-content').attr('data-accordion', 'use-' + counter); // Div that contains include instructions.
          var includeLines = $('<div></div>').addClass('include-lines'); // Div to contain the lines to include
          var includeCopy = $('<button></button>').addClass('include-copy');

          // INFO:
          var infoTitle = $('<button></button>').addClass('accordion-sub').text(json.tabs.infoTitle).attr('data-accordion-for', 'info-' + counter).attr('data-parent', 'libraries'); // Header for include instructions
          addAccordionEvent(infoTitle);
          var infoContainer = $('<div></div>').addClass('info-container docs-content').attr('data-accordion', 'info-' + counter); // Div that contains include instructions.

          clipboard = new Clipboard(includeCopy[0], {
            target: function target(trigger) {
              return $(trigger).parent().find($('[data-include="include-text"]'))[0];
            }
          });

          // EXAMPLES:

          var that = _this7;
          var examplesParent = $('<div></div>');
          var examplesTitle = $('<button></button>').addClass('accordion-sub').text(json.tabs.examplesTitle).attr('data-accordion-for', 'example-list-' + counter).attr('data-parent', 'libraries'); // Header for include instructions
          addAccordionEvent(examplesTitle);
          var examplesContainer = $('<div></div>').addClass('docs-content').attr('data-accordion', 'example-list-' + counter);
          var examplesList = $('<ul></ul>').addClass('libraries-list');

          // FILES:
          var filesTitle = $('<button></button>').addClass('accordion-sub').text(json.tabs.filesTitle).attr('data-accordion-for', 'file-list-' + counter).attr('data-parent', 'libraries'); // Header for include instructions
          addAccordionEvent(filesTitle);

          var filesContainer = $('<div></div>').addClass('docs-content').attr('data-accordion', 'file-list-' + counter);
          var filesList = $('<ul></ul>').addClass('libraries-list');

          var includeInstructions = $('<p></p>').text(json.tabs.includeInstructions);
          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            var _loop3 = function _loop3() {
              var child = _step4.value;

              if (child && child.length && child[0] === '.') return 'continue';
              if (child == 'build') return 'continue';
              var childLi = $('<li></li>');
              var testExt = child.split('.');
              var childExt = testExt[testExt.length - 1];
              // The MetaData file
              if (childExt === 'metadata') {
                var i = 0;
                var childPath = '/libraries/' + item.name + "/" + child;
                var libDataDiv = $('<div></div>');
                var includeArr = [];
                var includeForm = $('<textarea></textarea>').addClass('hide-include').attr('data-form', '');
                var includeText = $('<pre></pre>');
                $.ajax({
                  type: "GET",
                  url: "/libraries/" + name + "/" + child,
                  dataType: "html",
                  success: function success(text) {
                    i += 1;
                    var object = {};
                    var transformText = text.split('\n');
                    var _iteratorNormalCompletion5 = true;
                    var _didIteratorError5 = false;
                    var _iteratorError5 = undefined;

                    try {
                      for (var _iterator5 = transformText[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var line = _step5.value;

                        line = line.trim();
                        if (line.length > 0) {
                          var splitKeyVal = line.split('=');
                          var key = splitKeyVal[0];
                          if (key == 'include') {
                            includeArr.push(splitKeyVal[1]);
                          } else if ('examples' === key) {
                            var _iteratorNormalCompletion7 = true;
                            var _didIteratorError7 = false;
                            var _iteratorError7 = undefined;

                            try {
                              for (var _iterator7 = splitKeyVal[1].split(',')[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                                var example = _step7.value;

                                example = example.trim();
                                var exampleLi = $('<li></li>');
                                exampleLi.html(example).attr('data-example-link', example).on('click', that.onClickOpenExample.bind(that));
                                exampleLi.appendTo(examplesList);
                              }
                            } catch (err) {
                              _didIteratorError7 = true;
                              _iteratorError7 = err;
                            } finally {
                              try {
                                if (!_iteratorNormalCompletion7 && _iterator7.return) {
                                  _iterator7.return();
                                }
                              } finally {
                                if (_didIteratorError7) {
                                  throw _iteratorError7;
                                }
                              }
                            }
                          } else {
                            object[key] = splitKeyVal[1];
                          }
                        }
                      }

                      // Get the #include line and add to includeContent
                    } catch (err) {
                      _didIteratorError5 = true;
                      _iteratorError5 = err;
                    } finally {
                      try {
                        if (!_iteratorNormalCompletion5 && _iterator5.return) {
                          _iterator5.return();
                        }
                      } finally {
                        if (_didIteratorError5) {
                          throw _iteratorError5;
                        }
                      }
                    }

                    libDesc.html(object.description);

                    // FOR LIBRARY INFO
                    if (object.version != null) {
                      var infoContent = $('<p></p>');
                      infoContent.append('Version: ' + object.version);
                      infoContent.appendTo(infoContainer);
                    }

                    if (includeArr.length > 0) {
                      var _iteratorNormalCompletion6 = true;
                      var _didIteratorError6 = false;
                      var _iteratorError6 = undefined;

                      try {
                        for (var _iterator6 = includeArr[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                          var include = _step6.value;

                          var _includeText = $('<p></p>').text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>\n').attr('data-include', 'include-text');
                          _includeText.appendTo(includeLines);
                        }
                      } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                      } finally {
                        try {
                          if (!_iteratorNormalCompletion6 && _iterator6.return) {
                            _iterator6.return();
                          }
                        } finally {
                          if (_didIteratorError6) {
                            throw _iteratorError6;
                          }
                        }
                      }

                      includeLines.appendTo(includeContent);
                    } else {
                      var _includeText2 = $('<pre></pre>').text('#include <' + 'libraries/' + object.name + '/' + object.name + '.h>').attr('data-include', 'include-text');
                      if (examplesList.find('li').length > 0) {
                        examplesTitle.appendTo(examplesParent);
                        examplesList.appendTo(examplesContainer);
                        examplesContainer.appendTo(examplesParent);
                      }
                      _includeText2.appendTo(includeLines);
                      includeLines.appendTo(includeContent);
                      includeCopy.appendTo(includeContent);
                      includeInstructions.appendTo(includeContent);
                    }

                    includeArr = [];
                    libDataDiv.appendTo(libraryPanel);
                    libDataDiv.find('.copy').not().first().remove(); // a dirty hack to remove all duplicates of the copy and paste element whilst I work out why I get more than one
                  }
                });
              } else {
                childLi.html(child).attr('data-library-link', item.name + '/' + child).on('click', function () {
                  var fileLocation = '/libraries/' + item.name + '/' + child;
                  // build the popup content
                  popup.title(child);

                  var form = [];
                  $.ajax({
                    type: "GET",
                    url: "/libraries/" + item.name + "/" + child,
                    dataType: "html",
                    success: function success(text) {
                      var codeBlock = $('<pre></pre>');
                      var transformText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').split('\n');
                      for (var i = 0; i < transformText.length; i++) {
                        codeBlock.append(transformText[i] + '\n');
                      }
                      popup.code(codeBlock);
                    }
                  });

                  form.push('<button type="button" class="button popup cancel">Close</button>');
                  popup.form.append(form.join(''));
                  popup.find('.cancel').on('click', popup.hide);
                  popup.show();
                });
                includeInstructions.appendTo(includeContent);
                childLi.appendTo(filesList);
              }
            };

            for (var _iterator4 = item.children[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              var _ret3 = _loop3();

              if (_ret3 === 'continue') continue;
            }

            // FOR LIBRARY INFO
            // per section
            // item.name -> parentDiv $examples
          } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
              }
            } finally {
              if (_didIteratorError4) {
                throw _iteratorError4;
              }
            }
          }

          parentButton.appendTo(libraryItem);
          libDesc.appendTo(libraryPanel); // Add library description, if present
          libVer.appendTo(libraryPanel);
          // per item in section
          // childLi -> childUl -> parentDiv -> $examples
          includeTitle.appendTo(libraryPanel);
          includeContent.appendTo(libraryPanel);

          examplesParent.appendTo(libraryPanel);

          filesTitle.appendTo(libraryPanel); // Include the Files: section title
          filesList.appendTo(filesContainer);
          filesContainer.appendTo(libraryPanel);

          infoTitle.appendTo(libraryPanel);
          infoContainer.appendTo(libraryPanel);

          libraryPanel.appendTo(libraryItem); // Append the whole panel to the library item
          libraryItem.appendTo(libraryList); // Append the whole item to the list of library items
          libraryItem.appendTo($libraries);
        };

        for (var _iterator3 = librariesDir[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var clipboard;

          _loop2();
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }, {
    key: '_boardString',
    value: function _boardString(data) {
      var boardString;
      if (data && data.trim) boardString = data.trim();else return;

      var exceptString = boardString;
      if (exceptString === "CtagFace" || exceptString === "CtagBeast") exceptString = 'Ctag';

      $.getJSON("../example_except.json", function (data) {
        if (exceptString in data) {
          for (var example in data[exceptString]) {
            var exampleId = data[exceptString][example].section + "/" + data[exceptString][example].name;
            try {
              $("[data-example-link='" + exampleId + "']")[0].style.display = 'none';
            } catch (err) {}
          }
        }
      });
    }
  }, {
    key: '_currentProject',
    value: function _currentProject(project) {

      // unselect currently selected project
      $('[data-projects-select]').find('option').filter(':selected').attr('selected', '');

      if (project === 'exampleTempProject') {
        // select no project
        $('[data-projects-select]').val($('[data-projects-select] > option:first').val());
      } else {
        // select new project
        $('[data-projects-select]').val($('[data-projects-select] > option[value="' + project + '"]').val());
      }

      // set download link
      $('[data-project-download]').attr('href', '/download?project=' + project);
    }
  }, {
    key: '__currentProject',
    value: function __currentProject() {
      this.exampleChanged = false;
    }
  }, {
    key: 'subDirs',
    value: function subDirs(dir) {
      var ul = $('<ul></ul>').html(dir.name + ':');
      var _iteratorNormalCompletion8 = true;
      var _didIteratorError8 = false;
      var _iteratorError8 = undefined;

      try {
        for (var _iterator8 = dir.children[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
          var _child = _step8.value;

          if (!_child.dir) $('<li></li>').addClass('sourceFile').html(_child.name).data('file', (dir.dirPath || dir.name) + '/' + _child.name).appendTo(ul);else {
            _child.dirPath = (dir.dirPath || dir.name) + '/' + _child.name;
            ul.append(this.subDirs(_child));
          }
        }
      } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion8 && _iterator8.return) {
            _iterator8.return();
          }
        } finally {
          if (_didIteratorError8) {
            throw _iteratorError8;
          }
        }
      }

      return ul;
    }
  }]);

  return ProjectView;
}(View);

module.exports = ProjectView;

},{"../../../../examples/order.json":21,"../popup":18,"../site-text.json":19,"../utils":20,"./View":14}],11:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var json = require('../site-text.json');
var utils = require('../utils');

var belaCoreVersionString = "Unknown";
var belaImageVersionString = "Unknown";
var inputChangedTimeout;

var SettingsView = function (_View) {
	_inherits(SettingsView, _View);

	function SettingsView(className, models, settings) {
		_classCallCheck(this, SettingsView);

		//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		var _this = _possibleConstructorReturn(this, (SettingsView.__proto__ || Object.getPrototypeOf(SettingsView)).call(this, className, models, settings));

		_this.settings.on('change', function (data) {
			return _this._IDESettings(data);
		});
		_this.$elements.filterByData = function (prop, val) {
			return this.filter(function () {
				var text = $(this).data(prop);
				if (typeof val === 'string') return text === val;else return text && text.match(val) !== null;
			});
		};

		$('[data-run-on-boot]').on('change', function () {
			if ($('[data-run-on-boot]').val() && $('[data-run-on-boot]').val() !== '--select--') _this.emit('run-on-boot', $('[data-run-on-boot]').val());
		});

		$('.audioExpanderCheck').on('change', function (e) {
			var inputs = '',
			    outputs = '';
			$('.audioExpanderCheck').each(function () {
				var $this = $(this);
				if ($this.is(':checked')) {
					if ($this.data('func') === 'input') {
						inputs += $this.data('channel') + ',';
					} else {
						outputs += $this.data('channel') + ',';
					}
				}
			});
			if (inputs.length) inputs = inputs.slice(0, -1);
			if (outputs.length) outputs = outputs.slice(0, -1);

			_this.emit('project-settings', { func: 'setCLArgs', args: [{ key: '-Y', value: inputs }, { key: '-Z', value: outputs }] });
		});

		return _this;
	}

	_createClass(SettingsView, [{
		key: 'selectChanged',
		value: function selectChanged($element, e) {
			var data = $element.data();
			var func = data.func;
			var key = data.key;
			if (func && this[func]) {
				this[func](func, key, $element.val());
			}
			if (key === '-C') {
				this.$elements.filterByData('key', key).not($element).val($element.val());
			}
		}
	}, {
		key: 'buttonClicked',
		value: function buttonClicked($element, e) {
			var data = $element.data();
			var func = data.func;
			var key = data.key;
			var val = $element.val();
			if (func && this[func]) {
				if (val) {
					this[func](func, key, $element.val());
				} else {
					this[func](func);
				}
			}
		}
	}, {
		key: 'inputChanged',
		value: function inputChanged($element, e) {
			var data = $element.data();
			var func = data.func;
			var key = data.key;
			var type = $element.prop('type');
			console.log(key);
			if (type == 'textarea' || type === 'number' || type === 'text') {
				if (func && this[func]) {
					this[func](func, key, $element.val());
				}
			} else if (type === 'checkbox') {
				if (func && this[func]) {
					this[func](func, key, $element.is(':checked') ? 1 : 0);
				}
			}
		}
	}, {
		key: 'setCLArg',
		value: function setCLArg(func, key, value) {
			this.emit('project-settings', { func: func, key: key, value: value });
		}
	}, {
		key: 'restoreDefaultCLArgs',
		value: function restoreDefaultCLArgs(func) {
			var _this2 = this;

			popup.twoButtons(json.popups.restore_default_project_settings, function () {
				return _this2.emit('project-settings', { func: func });
			});
		}
	}, {
		key: 'setIDESetting',
		value: function setIDESetting(func, key, value) {
			this.emit('IDE-settings', { func: func, key: key, value: value });
		}
	}, {
		key: 'restoreDefaultIDESettings',
		value: function restoreDefaultIDESettings(func) {
			var _this3 = this;

			popup.twoButtons(json.popups.restore_default_ide_settings, function () {
				return _this3.emit('IDE-settings', { func: func });
			});
		}
	}, {
		key: 'shutdownBBB',
		value: function shutdownBBB() {
			var _this4 = this;

			// build the popup content
			popup.title(json.popups.shutdown.title);
			popup.subtitle(json.popups.shutdown.text);

			var form = [];
			form.push('<button type="submit" class="button popup confirm">' + json.popups.shutdown.button + '</button>');
			form.push('<button type="button" class="button popup cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this4.emit('halt');
				popup.hide();
			});

			popup.find('.cancel').on('click', popup.hide);

			popup.show();

			popup.find('.confirm').trigger('focus');
		}
	}, {
		key: 'aboutPopup',
		value: function aboutPopup() {
			// build the popup content
			popup.title(json.popups.about.title);
			popup.subtitle(json.popups.about.text);
			var form = [];
			form.push('<button type="submit" class="button popup cancel">' + json.popups.about.button + '</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				popup.hide();
			});

			popup.show();

			popup.find('.cancel').trigger('focus');
		}
	}, {
		key: 'updateBela',
		value: function updateBela() {
			popup.twoButtons(json.popups.update, async function onSubmit(e) {
				var _this5 = this;

				var formEl = $('[data-popup] form')[0];
				var formDataOrig = new FormData(formEl);
				var formData = new FormData();
				console.log(formDataOrig.entries());
				var selectedFiles = 0;
				var file = void 0;
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = formDataOrig.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var entry = _step.value;

						file = entry[1].name.split('\\').pop();
						formData.append(entry[0], entry[1]);
						++selectedFiles;
						// there will be only one because the <input> is not `multiple`
						// TODO: write it better than this ugly-but-effective
						// single-iteration loop
						break;
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

				if (file && file.search(/\.zip$/) != -1) {
					this.emit('warning', json.settings_view.update);
					this.emit('warning', json.settings_view.browser);
					this.emit('warning', json.settings_view.ide);

					formData.append("update-event", JSON.stringify({
						currentProject: this.currentProject,
						func: 'upload',
						newFile: file
					}));
					utils.doLargeFileUpload(formData, function (r) {
						// file has been successfully loaded, start the update.
						// We do not do this in the POST request itself in
						// order to avoid timeout.
						_this5.emit('do-update');
						popup.ok({});
						popup.hide("keep overlay");
					}, function (e) {
						popup.ok({ text: "Error while uploading:", e: e });
					});
				} else {

					this.emit('warning', json.settings_view.zip);
					popup.hide();
				}
			}.bind(this));
			popup.form.attr('action', '/uploads').attr('enctype', 'multipart/form-data').attr('method', 'POST');
			popup.form.prepend('<input type="file" name="data" data-form-file></input><br/><br/>');
		}

		// model events

	}, {
		key: '__CLArgs',
		value: function __CLArgs(data) {

			for (var key in data) {

				if (key === '-Y' || key === '-Z') {
					this.setAudioExpander(key, data[key]);
					continue;
				} else if (key === 'audioExpander') {
					if (data[key] == 1) $('[data-audio-expander-table]').css('display', 'table');
				}

				var el = this.$elements.filterByData('key', key);

				// set the input value
				if (!el.length) {
					console.log("Unrecognized CLArg received: ", key, data[key]);
					continue;
				}
				if (el[0].type === 'checkbox') {
					el.prop('checked', data[key] == 1);
				} else {
					//console.log(el.val(), data[key]);
					el.val(data[key]);
				}
			}
		}
	}, {
		key: '_IDESettings',
		value: function _IDESettings(data) {
			for (var key in data) {
				this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
			}
		}
	}, {
		key: '_projectList',
		value: function _projectList(projects, data) {

			var $projects = $('[data-run-on-boot]');
			$projects.empty();

			// add a none option
			$('<option></option>').attr('value', '*none*').html('•none•').appendTo($projects);

			// add a loop_* option
			$('<option></option>').attr('value', '*loop*').html('•loop_*•').appendTo($projects);

			// fill project menu with projects
			for (var i = 0; i < projects.length; i++) {
				if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.') {
					$('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
				}
			}
		}
	}, {
		key: 'useAudioExpander',
		value: function useAudioExpander(func, key, val) {
			if (val == 1) {
				this.setCLArg('setCLArg', key, val);
			} else {
				// clear channel picker
				$('.audioExpanderCheck').prop('checked', false);
				this.emit('project-settings', { func: 'setCLArgs', args: [{ key: '-Y', value: '' }, { key: '-Z', value: '' }, { key: key, value: val }] });
			}
		}
	}, {
		key: 'setAudioExpander',
		value: function setAudioExpander(key, val) {
			if (!val.length) return;

			var channels = val.split(',');

			if (!channels.length) return;

			$('.audioExpanderCheck').each(function () {
				var $this = $(this);
				if ($this.data('func') === 'input' && key === '-Y' || $this.data('func') === 'output' && key === '-Z') {
					var checked = false;
					var _iteratorNormalCompletion2 = true;
					var _didIteratorError2 = false;
					var _iteratorError2 = undefined;

					try {
						for (var _iterator2 = channels[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							var channel = _step2.value;

							if (channel == $this.data('channel')) checked = true;
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

					$this.prop('checked', checked);
				}
			});
		}
	}, {
		key: '_boardString',
		value: function _boardString(data) {
			var boardString;
			if (data && data.trim) boardString = data.trim();else return;

			function excludeSubsecs(num, max, prefix) {
				var subsections = [];
				for (var i = num; i < max; ++i) {
					subsections = subsections.concat(prefix + i);
				}return subsections;
			}
			function excludeInputSubsecs(num) {
				return excludeSubsecs(num, 8, 'input-level');
			}
			function excludeHpSubsecs(num) {
				return excludeSubsecs(num, 8, 'headphone-level');
			}
			var settingExceptions = {
				Bela: {
					sections: [],
					subsections: ['disable-led'],
					options: [],
					inputsWithGain: 2,
					headphones: 2
				},
				BelaRevC: {
					sections: [],
					subsections: [],
					options: [{
						selector: 'analog-samplerate',
						optVal: [88200]
					}, {
						selector: 'analog-channels',
						optVal: [2]
					}],
					inputsWithGain: 2,
					headphones: 2
				},
				BelaMini: {
					sections: ['capelet-settings'],
					subsections: ['mute-speaker'],
					options: [],
					inputsWithGain: 2,
					headphones: 2
				},
				BelaMiniMultiAudio: {
					sections: ['capelet-settings'],
					subsections: ['mute-speaker'],
					options: [],
					inputsWithGain: 8,
					headphones: 8
				},
				Ctag: {
					sections: ['capelet-settings'],
					subsections: ['disable-led', 'mute-speaker', 'hp-level', 'pga-left', 'pga-right', 'analog-channels', 'analog-samplerate', 'use-analog', 'adc-level'],
					options: [],
					inputsWithGain: 0,
					headphones: 0
				},
				CtagBela: {
					sections: [],
					subsections: ['disable-led', 'mute-speaker', 'hp-level', 'pga-left', 'pga-right'],
					options: [{
						selector: 'analog-samplerate',
						optVal: [88200]
					}, {
						selector: 'analog-channels',
						optVal: [2]
					}],
					inputsWithGain: 0,
					headphones: 0
				},
				Face: {
					sections: [],
					subsections: [],
					options: [],
					inputsWithGain: 0,
					headphones: 0
				},
				Beast: {
					sections: [],
					subsections: [],
					options: [],
					inputsWithGain: 0,
					headphones: 0
				}
			};

			var exceptions = {
				sections: null,
				subsections: null
			};

			var excLabel = boardString;
			// possible overrides for composite cases
			if (boardString === 'CtagFace' || boardString === 'CtagBeast') {
				excLabel = 'Ctag';
			} else if (boardString === 'CtagFaceBela' || boardString === 'CtagBeastBela') {
				excLabel = 'CtagBela';
			}
			if (!settingExceptions[excLabel]) {
				// default in case something went wrong above
				excLabel = 'Bela';
			}
			exceptions['sections'] = settingExceptions[excLabel]['sections'];
			var inputsWithGain = settingExceptions[excLabel].inputsWithGain;
			var headphones = settingExceptions[excLabel].headphones;
			var ioSubsecExcepts = excludeInputSubsecs(inputsWithGain).concat(excludeHpSubsecs(headphones));
			exceptions['subsections'] = settingExceptions[excLabel]['subsections'].concat(ioSubsecExcepts);
			exceptions['options'] = settingExceptions[excLabel]['options'];

			if (boardString === 'CtagFace' || boardString === 'CtagFaceBela') {
				exceptions['options'] = exceptions['options'].concat(settingExceptions['Face']['options']);
			} else if (boardString === 'CtagBeast' || boardString === 'CtagBeastBela') {
				exceptions['options'] = exceptions['options'].concat(settingExceptions['Beast']['options']);
			}

			if (boardString.includes('Ctag')) {
				var sRates = $('[data-analog-samplerate]').children("option");
				for (var i = 0; i < sRates.length; i++) {
					var rate = sRates[i].innerHTML;
					if (rate == "44100") {
						sRates[i].innerHTML = "48000";
					} else if (rate == "22050") {
						sRates[i].innerHTML = "24000";
					}
				}
			}
			function replaceDataSettings(value, find, replace) {
				var tags = $('[data-settings="' + value + '"]>td.left-choice');
				if (tags.length) {
					var tag = tags[0];
					tag.innerHTML = tag.innerHTML.replace(find, replace);
				}
			}
			if (2 === settingExceptions[excLabel].inputsWithGain) {
				replaceDataSettings('input-level0', '0', 'Left');
				replaceDataSettings('input-level1', '1', 'Right');
			}
			if (2 === settingExceptions[excLabel].headphones) {
				replaceDataSettings('headphone-level0', '0', 'Left');
				replaceDataSettings('headphone-level1', '1', 'Right');
			}
			for (var e in exceptions['options']) {
				var opts = $('#' + exceptions['options'][e].selector).children("option");
				var exceptOpts = exceptions['options'][e].optVal;
				for (var _i = 0; _i < opts.length; _i++) {
					var html = opts[_i].innerHTML;
					if (exceptOpts.includes(parseInt(html))) {
						opts[_i].remove();
					}
				}
			}

			for (var subsect in exceptions['subsections']) {
				$('[data-settings="' + exceptions['subsections'][subsect] + '"]').remove();
			}
			for (var sect in exceptions['sections']) {
				$('[data-accordion-for="' + exceptions['sections'][sect] + '"]').remove();
				$('[data-accordion="' + exceptions['sections'][sect] + '"]').remove();
			}
		}
	}, {
		key: 'versionPopup',
		value: function versionPopup() {
			var strings = {};
			strings.title = json.popups.version.title;
			strings.button = json.popups.version.button;
			// popup.code is the only one that accepts HTML, so we have to use that
			// to make it pickup the line breaks
			strings.code = utils.formatString('<p>{0}<br />{1}</p><p>{2}<br />{3}</p>', json.popups.version.image_version_label, belaImageVersionString, json.popups.version.core_version_label, belaCoreVersionString);
			popup.ok(strings);
		}
	}, {
		key: '_belaCoreVersion',
		value: function _belaCoreVersion(ver) {
			var format = utils.formatString;
			var s = [];
			var templates = json.popups.version;
			if (ver.date || ver.fileName) {
				var t;
				switch (ver.success) {
					case 0:
						t = templates.textTemplateFailed;
						break;
					case 1:
						t = templates.textTemplateSuccess;
						break;
					default:
					case -1:
						t = templates.textTemplateUnknown; // unknown success (e.g.: incomplete legacy log)
						break;
				}
				if (ver.date) {
					var date = new Date(ver.date);
					var dateString = date.getDay() + ' ' + date.toLocaleString('default', { month: "short" }) + ' ' + date.getFullYear() + ' ' + date.toTimeString().replace(/GMT.*/, '');
					s.push(format(t[0], dateString));
				}
				if (ver.fileName) s.push(format(t[1], ver.fileName));
				if (ver.method) s.push(format(t[2], ver.method));
				s.push(t[3]);
			} else {
				s.push(templates.textUnknown); // no info available
			}
			if (ver.git_desc) s.push(format(templates.textTemplateGitDesc, ver.git_desc));
			belaCoreVersionString = s.join('<br \>');
		}
	}, {
		key: '_belaImageVersion',
		value: function _belaImageVersion(ver) {
			if (ver) belaImageVersionString = ver;
		}
	}]);

	return SettingsView;
}(View);

module.exports = SettingsView;

},{"../popup":18,"../site-text.json":19,"../utils":20,"./View":14}],12:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var addAccordionEvent = require('../utils').addAccordionEvent;
var addDropdownEvent = require('../utils').addDropdownEvent;

var menuOpened = false;
var tabs = {};

var TabView = function (_View) {
  _inherits(TabView, _View);

  function TabView() {
    _classCallCheck(this, TabView);

    // golden layout
    var _this = _possibleConstructorReturn(this, (TabView.__proto__ || Object.getPrototypeOf(TabView)).call(this, 'tab'));

    var layout = new GoldenLayout({
      settings: {
        hasHeaders: false,
        constrainDragToContainer: true,
        reorderEnabled: false,
        selectionEnabled: false,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: false,
        showMaximiseIcon: false,
        showCloseIcon: false
      },
      dimensions: {
        borderWidth: 5,
        minItemHeight: 10,
        minItemWidth: 10,
        headerHeight: 20,
        dragProxyWidth: 300,
        dragProxyHeight: 200
      },
      labels: {
        close: 'close',
        maximise: 'maximise',
        minimise: 'minimise',
        popout: 'open in new window'
      },
      content: [{
        type: 'column',
        content: [{
          type: 'component',
          componentName: 'Editor'
        }, {
          type: 'component',
          componentName: 'Console',
          height: 25
        }]
      }]
    });
    layout.registerComponent('Editor', function (container, componentState) {
      container.getElement().append($('[data-upper]'));
    });
    layout.registerComponent('Console', function (container, componentState) {
      container.getElement().append($('[data-console]'));
    });

    layout.init();
    layout.on('initialised', function () {
      return _this.emit('change');
    });
    layout.on('stateChanged', function () {
      return _this.emit('change');
    });

    _this.on('toggle', _this.toggle);
    _this.on('boardString', _this._boardString);
    _this.editor = ace.edit('editor');
    var editor = _this.editor;
    $('[data-tab-open]').on('click', _this.toggleClasses());

    $('[data-tab-open]').on('click', function () {
      return _this.toggle(event.type, 'tab-control', $('[data-tab-for].active').data('tab-for'));
    });
    $('[data-tab-for]').on('click', function () {
      return _this.toggle(event.type, 'tab-link', event.srcElement.dataset.tabFor);
    });

    // For changing the pin diagram in view:
    // On dropdown change, load the selected image into the viewer.
    $('[data-board-select]').on('change', function () {
      var selected = $('#activeBoard').val(); // Get the value of the selection
      $('[data-pin-diagram]').prop('data', 'belaDiagram/diagram.html?' + selected); // Load that image
    });

    _this.toggleClassesTimeout = undefined;
    // set events for existing accordions.
    addAccordionEvent();
    addDropdownEvent();
    return _this;
  }

  _createClass(TabView, [{
    key: 'toggleClasses',
    value: function toggleClasses() {
      var tabIsOpening = $('[data-tabs]').hasClass('tabs-open');
      clearTimeout(this.toggleClassesTimeout);
      // the tabs-changing class enables a 0.5s animation upon transition
      $('[data-editor]').addClass('tabs-changing');
      // and we can remove it once the transition is done:
      this.toggleClassesTimeout = setTimeout(function (tabIsOpening) {
        $('[data-editor]').removeClass('tabs-changing');
        // this "change" is here so that if pd-svg is .active,
        // it shrinks after the sidebar has opened
        if (tabIsOpening) {
          this.emit('change');
        }
      }.bind(this, tabIsOpening), 500);

      if (tabIsOpening) {
        $('[data-editor]').addClass('tabs-open');
      } else {
        // tab is closing
        $('[data-editor]').removeClass('tabs-open');
        // this "change" here so that if pd-svg is .active
        // it extends horizontally before the sidebar closes.
        this.emit('change');
      }
    }
  }, {
    key: 'getOpenTab',
    value: function getOpenTab() {
      tabs.active = $('[data-tab-for].active').data('tabFor');
      return tabs.active;
    }
  }, {
    key: 'toggle',
    value: function toggle(event, origin, target) {
      var that = this;

      tabs = { event: event, origin: origin, target: target };

      if (tabs.event == undefined) {
        return;
      }

      tabs.active = $('[data-tab-for].active').data('tabFor');

      if (tabs.target == undefined && tabs.active == null) {
        tabs.target = 'explorer';
      }

      function openTabs() {
        if (tabs.origin == 'tab-control') {
          if (menuOpened == false) {
            $('[data-tabs]').addClass('tabs-open');
            $('[data-tab-open] span').addClass('rot');
            menuOpened = true;
          } else {
            $('[data-tabs]').removeClass('tabs-open');
            $('[data-tab-open] span').removeClass('rot');
            menuOpened = false;
            setTimeout(function () {
              $('[data-tab-content]').scrollTop($('#tab-content-area').offset().top);
            }, 500);
          }
        }
        if (tabs.origin == 'tab-link' && menuOpened == false) {
          $('[data-tabs]').addClass('tabs-open');
          $('[data-tab-open] span').addClass('rot');
          menuOpened = true;
        }
        that.toggleClasses();
        matchTabFor();
      }

      function matchTabFor() {
        $('[data-tab-for]').each(function () {
          var tabFor = $(this).data('tab-for');
          if (tabs.origin == 'tab-link') {
            $(this).removeClass('active');
          }
          if (tabFor === tabs.target) {
            $(this).addClass('active');
            matchTabForAndTab();
          }
        });
      }

      function matchTabForAndTab() {
        $('[data-tab]').each(function () {
          if (tabs.active != tabs.target) {
            var tab = $(this).data('tab');
            $(this).hide();
            if (tab === tabs.target) {
              $('[data-tab-content]').scrollTop($('#tab-content-area').offset().top);
              $(this).fadeIn();
            }
          }
        });
      }

      openTabs();
    }
  }, {
    key: '_boardString',
    value: function _boardString(data) {
      var boardString;
      var rootDir = "belaDiagram/";
      if (data && data.trim) boardString = data.trim();else return;

      // Load the pin diagram image according to the board string:
      $('[data-pin-diagram]').prop('data', rootDir + 'diagram.html?' + boardString);
      // Also select that name from the dropdown menu so it matches:
      $('[data-board-select]').val(boardString);
    }
  }]);

  return TabView;
}(View);

module.exports = new TabView();

},{"../utils":20,"./View":14}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var json = require('../site-text.json');

// ohhhhh i am a comment

var modeswitches = 0;
var NORMAL_MSW = 1;
var nameIndex, CPUIndex, rootName, IRQName;
var mswGraceEnd = 0;
// avoid spurious MSWs when stopping or restarting
var mswGraceMsStop = 3000;
var mswGraceMsRun = 2000;

var ToolbarView = function (_View) {
	_inherits(ToolbarView, _View);

	function ToolbarView(className, models) {
		_classCallCheck(this, ToolbarView);

		var _this = _possibleConstructorReturn(this, (ToolbarView.__proto__ || Object.getPrototypeOf(ToolbarView)).call(this, className, models));

		_this.$elements.on('click', function (e) {
			return _this.buttonClicked($(e.currentTarget), e);
		});

		_this.on('disconnected', function () {
			$('[data-toolbar-run]').removeClass('running-button').removeClass('building-button');
		});
		// set externally upon start/stop
		_this.on('msw-start-grace', function (event) {
			var t;
			if ('run' === event) t = mswGraceMsRun;else if ('stop' === event) t = mswGraceMsStop;
			mswGraceEnd = t + performance.now();
		});

		$('[data-toolbar-run]').mouseover(function () {
			$('[data-toolbar-controltext1]').html('<p>' + json.toolbar.run + '</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext1]').html('');
		});

		$('[data-toolbar-stop]').mouseover(function () {
			$('[data-toolbar-controltext1]').html('<p>' + json.toolbar.stop + '</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext1]').html('');
		});

		$('[data-toolbar-newtab]').mouseover(function () {
			$('[data-toolbar-controltext2]').html('<p>New Tab</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext2]').html('');
		});

		$('[data-toolbar-download]').mouseover(function () {
			$('[data-toolbar-controltext2]').html('<p>Download</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext2]').html('');
		});

		$('[data-toolbar-console]').mouseover(function () {
			$('[data-toolbar-controltext2]').html('<p>' + json.toolbar.clear + '</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext2]').html('');
		});

		$('[data-toolbar-scope]').mouseover(function () {
			$('[data-toolbar-controltext2]').html('<p>' + json.toolbar.scope + '</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext2]').html('');
		});

		$('[data-toolbar-scope]').on('click', function () {
			window.open('scope');
		});

		$('[data-toolbar-gui]').mouseover(function () {
			$('[data-toolbar-controltext2]').html('<p>' + json.toolbar.gui + '</p>');
		}).mouseout(function () {
			$('[data-toolbar-controltext2]').html('');
		});

		$('[data-toolbar-gui]').on('click', function () {
			// window.open('gui');
			window.open('gui');
		});
		return _this;
	}

	// UI events


	_createClass(ToolbarView, [{
		key: 'buttonClicked',
		value: function buttonClicked($element, e) {
			var func = $element.data().func;
			if (func && this[func]) {
				this[func](func);
			}
		}
	}, {
		key: 'run',
		value: function run(func) {
			this.emit('process-event', func);
		}
	}, {
		key: 'stop',
		value: function stop(func) {
			this.emit('process-event', func);
		}
	}, {
		key: 'clearConsole',
		value: function clearConsole() {
			this.emit('clear-console');
		}

		// model events

	}, {
		key: '__running',
		value: function __running(status) {
			if (status) {
				$('[data-toolbar-run]').removeClass('building-button').removeClass('building').addClass('running-button').addClass('running');
			} else {
				$('[data-toolbar-run]').removeClass('running').removeClass('running-button');
				$('[data-toolbar-bela-cpu]').html('CPU: --').css('color', 'black');
				$('[data-toolbar-cpu-msw]').html('MSW: --').css('color', 'black');
				modeswitches = 0;
			}
		}
	}, {
		key: '__building',
		value: function __building(status) {
			if (status) {
				$('[data-toolbar-run]').removeClass('running-button').removeClass('running').addClass('building-button').addClass('building');
			} else {
				$('[data-toolbar-run]').removeClass('building-button').removeClass('building');
			}
		}
	}, {
		key: '__checkingSyntax',
		value: function __checkingSyntax(status) {
			if (status) {
				$('[data-toolbar-status]').addClass('pending').removeClass('ok').removeClass('stop').prop('title', 'checking syntax&hellip;');
			}
		}
	}, {
		key: '__allErrors',
		value: function __allErrors(errors) {
			if (errors.length) {
				$('[data-toolbar-status]').removeClass('pending').removeClass('ok').addClass('stop').prop('title', 'syntax errors found');
			} else {
				$('[data-toolbar-status]').removeClass('pending').addClass('ok').removeClass('stop').prop('title', 'syntax check clear');
			}
		}
	}, {
		key: '_xenomaiVersion',
		value: function _xenomaiVersion(ver) {
			console.log('xenomai version:', ver);
			if (ver.includes('2.6')) {
				nameIndex = 7;
				CPUIndex = 6;
				rootName = 'ROOT';
				IRQName = 'IRQ67:';
			} else {
				nameIndex = 8;
				CPUIndex = 7;
				rootName = '[ROOT]';
				IRQName = '[IRQ16:';
			}
		}
	}, {
		key: 'shutdownBBB',
		value: function shutdownBBB() {
			var _this2 = this;

			// build the popup content
			popup.title(json.popups.shutdown.title);
			popup.subtitle(json.popups.shutdown.text);

			var form = [];
			form.push('<button type="submit" class="button popup confirm">' + json.popups.shutdown.button + '</button>');
			form.push('<button type="button" class="button popup cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this2.emit('halt');
				popup.hide();
			});

			popup.find('.cancel').on('click', popup.hide);

			popup.show();

			popup.find('.confirm').trigger('focus');
		}
	}, {
		key: '_CPU',
		value: function _CPU(data) {
			var bela = 0,
			    rootCPU = 1;

			if (data.bela != 0 && data.bela !== undefined) {

				// extract the data from the output
				var lines = data.bela.split('\n');
				var taskData = [];
				for (var j = 0; j < lines.length; j++) {
					taskData.push([]);
					lines[j] = lines[j].split(' ');
					for (var k = 0; k < lines[j].length; k++) {
						if (lines[j][k]) {
							taskData[j].push(lines[j][k]);
						}
					}
				}

				var output = [];
				for (var j = 0; j < taskData.length; j++) {
					if (taskData[j].length) {
						var proc = {
							'name': taskData[j][nameIndex],
							'cpu': taskData[j][CPUIndex],
							'msw': taskData[j][2],
							'csw': taskData[j][3]
						};
						if (proc.name === rootName) rootCPU = proc.cpu * 0.01;
						if (proc.name === 'bela-audio') this.mode_switches(proc.msw - NORMAL_MSW);
						// ignore uninteresting data
						if (proc && proc.name && proc.name !== rootName && proc.name !== 'NAME' && proc.name !== IRQName) {
							output.push(proc);
						}
					}
				}

				for (var j = 0; j < output.length; j++) {
					if (output[j].cpu) {
						bela += parseFloat(output[j].cpu);
					}
				}

				if (data.belaLinux) bela += data.belaLinux * rootCPU;
			}

			$('[data-toolbar-bela-cpu]').html('CPU: ' + (bela ? bela.toFixed(1) + '%' : '--'));

			if (bela && bela > 80) {
				$('[data-toolbar-bela-cpu]').css('color', 'red');
			} else {
				$('[data-toolbar-bela-cpu]').css('color', 'black');
			}
		}
	}, {
		key: '_cpuMonitoring',
		value: function _cpuMonitoring(value) {
			if (parseInt(value)) $('[data-toolbar-bela-cpu]').css('visibility', 'visible');else $('[data-toolbar-bela-cpu]').css('visibility', 'hidden');
		}
	}, {
		key: 'mode_switches',
		value: function mode_switches(value) {
			if (performance.now() < mswGraceEnd) return;
			$('[data-toolbar-cpu-msw]').html('MSW: ' + value);
			if (value > modeswitches) {
				this.emit('mode-switch-warning', value);
				$('[data-toolbar-cpu-msw]').css('color', 'red');
			}
			modeswitches = value;
		}
	}]);

	return ToolbarView;
}(View);

module.exports = ToolbarView;

},{"../popup":18,"../site-text.json":19,"./View":14}],14:[function(require,module,exports){
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
		_this.setMaxListeners(50);

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
		_this.$elements.filter('textarea').on('input', function (e) {
			return _this.inputChanged($(e.currentTarget), e);
		});
		_this.$elements.filter('input[type=checkbox]').on('change', function (e) {
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
		key: 'testSelect',
		value: function testSelect() {}
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

},{"events":1}],15:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var popup = require('./popup');
var EventEmitter = require('events').EventEmitter;
var json = require('./site-text.json');
//var $ = require('jquery-browserify');

var enabled = true,
    scrollEnabled = true,
    suspended = false;

// module variables
var numElements = 0,
    maxElements = 200,
    consoleDelete = true;

var Console = function (_EventEmitter) {
	_inherits(Console, _EventEmitter);

	function Console() {
		_classCallCheck(this, Console);

		var _this = _possibleConstructorReturn(this, (Console.__proto__ || Object.getPrototypeOf(Console)).call(this));

		_this.$element = $('[data-console-contents-wrapper]');
		_this.parent = $('[data-console]')[0];
		_this.popUpComponents = "";
		return _this;
	}

	_createClass(Console, [{
		key: 'block',
		value: function block() {
			enabled = false;
		}
	}, {
		key: 'unblock',
		value: function unblock() {
			enabled = true;
		}
	}, {
		key: 'print',
		value: function print(text, className, id, onClick) {
			if (!enabled) return;

			// this is a faster way maybe?
			//var str = '<div '+(id ? 'id="'+id+'" ' : '') +'class="beaglert-console-'+className+'"><span>'+text+'</span></div>';
			//this.$element.append(str);

			var el = $('<div></div>').addClass('beaglert-console-' + className).appendTo(this.$element);
			if (id) el.prop('id', id);
			$('<span></span>').html(text + "\n").appendTo(el);

			if (numElements++ > maxElements) this.clear(numElements / 4);
			if (onClick) el.on('click', onClick);
			return el;
		}

		// log an unhighlighted message to the console

	}, {
		key: 'log',
		value: function log(text, css) {

			if (suspended) return;

			if (!consoleDelete && numElements > maxElements) {
				//console.log('cleared & rejected', numElements, text.split('\n').length);
				this.clear(numElements - maxElements / 2);
				suspended = true;
				setTimeout(function () {
					return suspended = false;
				}, 1000);
				this.warn(json.console.messages);
			} else {
				this.checkScroll();
				var msgs = text.split('\n');
				var str = '';
				for (var i = 0; i < msgs.length; i++) {
					if (msgs[i] !== '' && msgs[i] !== ' ') {
						//this.print(msgs[i], css || 'log');
						str += '<div class="beaglert-console-' + (css || 'log') + '"><span>' + msgs[i] + '\n</span></div>';
						numElements++;
					}
				}
				this.$element.append(str);
				if (numElements > maxElements) this.clear(numElements / 4);
				this.scroll();
			}
		}
		// log a warning message to the console

	}, {
		key: 'warn',
		value: function warn(text, id) {

			//this.checkScroll();
			scrollEnabled = true;

			var msgs = text.split('\n');
			for (var i = 0; i < msgs.length; i++) {
				if (msgs[i] !== '') {
					this.print(msgs[i].replace(/\</g, '&lt;').replace(/\>/g, '&gt;'), 'warning', id); /*, function(){
                                                                                       var $el = $(this);
                                                                                       $el.addClass('beaglert-console-collapsed');
                                                                                       $el.on('transitionend', () => {
                                                                                       if ($el.hasClass('beaglert-console-collapsed')){
                                                                                       $el.remove();
                                                                                       } else {
                                                                                       $el.addClass('beaglert-console-collapsed');
                                                                                       }
                                                                                       });
                                                                                       });*/
				}
			}
			this.scroll();
		}
	}, {
		key: 'newErrors',
		value: function newErrors(errors) {
			var _this2 = this;

			//this.checkScroll();
			scrollEnabled = true;

			$('.beaglert-console-ierror, .beaglert-console-iwarning').remove();

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				var _loop = function _loop() {
					var err = _step.value;


					// create the element and add it to the error object
					div = $('<div></div>').addClass('beaglert-console-i' + err.type);

					// create the link and add it to the element

					span = $('<span></span>').html(err.text.split('\n').join(' ').replace(/\</g, '&lt;').replace(/\>/g, '&gt;') + ', line: ' + (err.row + 1) + '\n').appendTo(div);

					// add a button to copy the contents to the clipboard

					copyButton = $('<div></div>').addClass('clipboardButton').appendTo(div).on('click', function () {
						var that = $(this);
						that.parent().addClass('copied');
						setTimeout(function () {
							that.parent().removeClass('copied');
						}, 250);
					});
					clipboard = new Clipboard(copyButton[0], {
						target: function target(trigger) {
							return $(trigger).siblings('span')[0];
						}
					});


					div.appendTo(_this2.$element);

					if (err.currentFile) {
						span.on('click', function () {
							return _this2.emit('focus', { line: err.row + 1, column: err.column - 1 });
						});
					} else {
						if (err.file.includes && err.file.includes('projects')) {
							file = err.file.split("projects/");
							// remove the project name

							file = file[1].split("/");
							file.splice(0, 1);
							file = file.join("/");
							span.on('click', function () {
								return _this2.emit('open-file', file, { line: err.row + 1, column: err.column - 1 });
							});
						} else {
							span.addClass('no-hover');
						}
					}
				};

				for (var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var div;
					var span;
					var copyButton;
					var clipboard;
					var file;

					_loop();
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

			this.scroll();
		}

		// log a positive notification to the console
		// if persist is not true, the notification will be removed quickly
		// otherwise it will just fade

	}, {
		key: 'notify',
		value: function notify(notice, id) {

			if (!enabled) return;

			//this.checkScroll();
			scrollEnabled = true;

			$('#' + id).remove();
			var el = this.print(notice, 'notify', id);
			this.popUpComponents = notice;
			this.scroll();

			return el;
		}
	}, {
		key: 'fulfill',
		value: function fulfill(message, id, persist) {
			if (!enabled) return;
			var el = document.getElementById(id);
			//if (!el) el = this.notify(message, id);
			var $el = $(el);
			$el.appendTo(this.$element); //.removeAttr('id');
			$el.html($el.html() + message);
			setTimeout(function () {
				return $el.addClass('beaglert-console-faded');
			}, 500);
			if (!persist) {
				$el.on('transitionend', function () {
					if ($el.hasClass('beaglert-console-collapsed')) {
						$el.remove();
					} else {
						$el.addClass('beaglert-console-collapsed');
					}
				});
			}
		}
	}, {
		key: 'reject',
		value: function reject(message, id, skipPopup) {
			var el = document.getElementById(id);
			//if (!el) el = this.notify(message, id);
			var $el = $(el);
			$el.appendTo(this.$element); //.removeAttr('id');
			$el.html($el.html() + message);
			$el.addClass('beaglert-console-rejectnotification');
			if (!skipPopup) {
				popup.ok({
					title: 'Error',
					subtitle: this.popUpComponents,
					button: 'Cancel',
					body: message
				});
			}
			setTimeout(function () {
				return $el.removeClass('beaglert-console-rejectnotification').addClass('beaglert-console-faded');
			}, 500);
			$el.on('click', function () {
				return $el.addClass('beaglert-console-collapsed').on('transitionend', function () {
					return $el.remove();
				});
			});
		}

		// clear the console

	}, {
		key: 'clear',
		value: function clear(number, force) {
			if (consoleDelete && !force) return;
			if (number) {
				$("[data-console-contents-wrapper] > div:lt(" + parseInt(number) + ")").remove();
				numElements -= parseInt(number);
			} else {
				$('[data-console-contents-wrapper] > div').remove();
				numElements = 0;
			}
		}
	}, {
		key: 'checkScroll',
		value: function checkScroll() {
			if (Math.abs(this.parent.scrollHeight - this.parent.scrollTop - this.parent.clientHeight) < 3) {
				scrollEnabled = true;
			} else {
				scrollEnabled = false;
			}
		}

		// force the console to scroll to the bottom

	}, {
		key: 'scroll',
		value: function scroll() {
			var _this3 = this;

			if (scrollEnabled) {
				scrollEnabled = false;
				setTimeout(function () {
					return _this3.parent.scrollTop = _this3.parent.scrollHeight;
				}, 0);
			}
		}
	}, {
		key: 'setConsoleDelete',
		value: function setConsoleDelete(to) {
			consoleDelete = to;
		}
	}]);

	return Console;
}(EventEmitter);

;
module.exports = new Console();

// gracefully remove a console element after an event ((this) must be bound to the element)
/*function dismiss(){
	if (IDE.getSetting('consoleAnimations')) $(this).addClass('beaglert-console-collapsed');
	setTimeout(() => {
		if ($.contains(parent, this)){
			$(this).remove();
			numElements -= 1;
		}
	}, 500);
}*/

},{"./popup":18,"./site-text.json":19,"events":1}],16:[function(require,module,exports){
'use strict';

//var $ = require('jquery-browserify');
var IDE;

$(function () {
	IDE = require('./IDE-browser');
});

},{"./IDE-browser":3}],17:[function(require,module,exports){
'use strict';

var Range = ace.require('ace/range').Range;
var Anchor = ace.require('ace/anchor').Anchor;
var buf = new (require('./CircularBuffer'))(5);
for (var i = 0; i < buf.capacity(); i++) {
	buf.enq({});
}var TokenIterator = ace.require("ace/token_iterator").TokenIterator;
var editor;

var parsingDeclaration = false;
var parsingBody = false;
var parsing;

var parensCount = 0;

var includes = [];
var typedefs = [];
var markers = [];

var _highlights = {};

var contextType;
var contextName;

var parser = {
	init: function init(ed, langTools) {
		editor = ed;
		this.enabled = false;
		this.langTools = langTools;
	},
	enable: function enable(status) {
		this.enabled = status;
		this.doParse();
	},
	highlights: function highlights(hls) {
		_highlights = hls;
		if (!hls.contextType || !hls.contextType.length) {
			console.log('parser aborted');
			return;
		}
		contextType = hls.contextType[0].name;
		_highlights.typerefs = [];
		//console.log(highlights);

		this.doParse();

		this.autoComplete();
	},
	autoComplete: function autoComplete() {
		if (!contextName) return;

		// context
		var contextAutocompleteWords = [];
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = _highlights[contextName][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _item = _step.value;

				contextAutocompleteWords.push(contextName + '->' + _item.name);
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

		var contextWordCompleter = {
			getCompletions: function getCompletions(editor, session, pos, prefix, callback) {
				callback(null, contextAutocompleteWords.map(function (word) {
					return {
						caption: word,
						value: word,
						meta: 'BelaContext'
					};
				}));
			}
		};
		this.langTools.addCompleter(contextWordCompleter);

		// class members
		var classAutocompleteWords = [];
		if (_highlights['typedef']) {
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = _highlights['typedef'][Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var typedef = _step2.value;

					classAutocompleteWords.push(typedef.name);
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
		if (_highlights['typerefs']) {
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = _highlights['typerefs'][Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var typeref = _step3.value;
					var _iteratorNormalCompletion4 = true;
					var _didIteratorError4 = false;
					var _iteratorError4 = undefined;

					try {
						for (var _iterator4 = _highlights[typeref.id.name][Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
							var item = _step4.value;

							classAutocompleteWords.push(typeref.name + '.' + item.name);
						}
					} catch (err) {
						_didIteratorError4 = true;
						_iteratorError4 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion4 && _iterator4.return) {
								_iterator4.return();
							}
						} finally {
							if (_didIteratorError4) {
								throw _iteratorError4;
							}
						}
					}
				}
			} catch (err) {
				_didIteratorError3 = true;
				_iteratorError3 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion3 && _iterator3.return) {
						_iterator3.return();
					}
				} finally {
					if (_didIteratorError3) {
						throw _iteratorError3;
					}
				}
			}
		}
		var classWordCompleter = {
			getCompletions: function getCompletions(editor, session, pos, prefix, callback) {
				callback(null, classAutocompleteWords.map(function (word) {
					return {
						caption: word,
						value: word,
						meta: 'Bela'
					};
				}));
			}
		};
		this.langTools.addCompleter(classWordCompleter);

		// utilities
		var utilityAutocompleteWords = [];
		var _iteratorNormalCompletion5 = true;
		var _didIteratorError5 = false;
		var _iteratorError5 = undefined;

		try {
			for (var _iterator5 = _highlights['utility'][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
				var utility = _step5.value;

				utilityAutocompleteWords.push(utility.name);
			}
		} catch (err) {
			_didIteratorError5 = true;
			_iteratorError5 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion5 && _iterator5.return) {
					_iterator5.return();
				}
			} finally {
				if (_didIteratorError5) {
					throw _iteratorError5;
				}
			}
		}

		var utilityWordCompleter = {
			getCompletions: function getCompletions(editor, session, pos, prefix, callback) {
				callback(null, utilityAutocompleteWords.map(function (word) {
					return {
						caption: word,
						value: word,
						meta: 'Utilities'
					};
				}));
			}
		};
		this.langTools.addCompleter(utilityWordCompleter);
	},
	getMarkers: function getMarkers() {
		return markers;
	},
	getIncludes: function getIncludes() {
		return includes;
	},
	parse: function parse(callback) {
		var _this = this;

		if (this.parseTimeout) clearTimeout(this.parseTimeout);
		this.parseTimeout = setTimeout(function () {
			return _this.doParse(callback);
		}, 100);
	},
	doParse: function doParse(callback) {
		var _iteratorNormalCompletion6 = true;
		var _didIteratorError6 = false;
		var _iteratorError6 = undefined;

		try {
			for (var _iterator6 = markers[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
				var marker = _step6.value;

				editor.session.removeMarker(marker.id);
			}
		} catch (err) {
			_didIteratorError6 = true;
			_iteratorError6 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion6 && _iterator6.return) {
					_iterator6.return();
				}
			} finally {
				if (_didIteratorError6) {
					throw _iteratorError6;
				}
			}
		}

		if (!this.enabled) return;
		// console.time('parse time');

		var iterator = new TokenIterator(editor.getSession(), 0, 0);
		var token = iterator.getCurrentToken();

		// are we parsing a file with Bela API included?
		var parsingAPI = false;

		includes = [];
		typedefs = [];
		markers = [];

		while (token) {

			token.range = new Range(iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn(), iterator.getCurrentTokenRow(), iterator.getCurrentTokenColumn() + token.value.length);
			//console.log(token);

			if (parsingDeclaration) {
				parseDeclaration(token);
			} else if (parsingBody) {
				parseBody(token);
			} else {

				// typedefs
				if (typedefs.length && buf.get(1).type === 'identifier' && typedefs.indexOf(buf.get(1).value) !== -1 && buf.get(0).type === 'text' && buf.get(0).value === ' ' && token.type === 'identifier') {
					var link = _highlights['typedef'][searchHighlightsFor('typedef', buf.get(1).value)];
					addMarker(buf.get(1), link);
					_highlights.typerefs.push({
						name: token.value,
						id: link
					});
				}

				// includes
				if (buf.get(0).type === 'keyword' && buf.get(0).value === '#include') {

					var include = token.value.split('<').pop().split('>')[0].split('.')[0];

					if (include === 'Bela') parsingAPI = true;

					if (searchHighlightsFor('header', include) !== -1) {
						includes.push(include);
						if (searchHighlightsFor('typedef', include) !== -1) {
							typedefs.push(include);
						}
					}

					// function detection
				} else if (parsingAPI && buf.get(1).type === 'storage.type' && buf.get(1).value === 'bool' && buf.get(0).type === 'text' && buf.get(0).value === ' ' && token.type === 'identifier' && token.value === 'setup') {
					//console.log('parsing declaration of setup');
					parsingDeclaration = true;
					parsing = token.value;
					if (_highlights['api']) addMarker(token, _highlights['api'][searchHighlightsFor('api', 'setup')]);
				} else if (parsingAPI && buf.get(1).type === 'storage.type' && buf.get(1).value === 'void' && buf.get(0).type === 'text' && buf.get(0).value === ' ' && token.type === 'identifier' && token.value === 'render') {
					//console.log('parsing declaration of  render');
					parsingDeclaration = true;
					parsing = token.value;
					if (_highlights['api']) addMarker(token, _highlights['api'][searchHighlightsFor('api', 'render')]);
				} else if (parsingAPI && buf.get(1).type === 'storage.type' && buf.get(1).value === 'void' && buf.get(0).type === 'text' && buf.get(0).value === ' ' && token.type === 'identifier' && token.value === 'cleanup') {
					//console.log('parsing declaration of  cleanup');
					parsingDeclaration = true;
					parsing = token.value;
					if (_highlights['api']) addMarker(token, _highlights['api'][searchHighlightsFor('api', 'cleanup')]);
				}
			}

			//if (highlights && highlights.typerefs && highlights.typerefs.length){
			var index = searchHighlightsFor('typerefs', token.value);
			if (index !== -1) {
				addMarker(token, _highlights['typerefs'][index].id);
			} else if (buf.get(1).type === 'identifier') {
				var _index = searchHighlightsFor('typerefs', buf.get(1).value);
				//console.log('typeref index', index, token.value);
				if (_index !== -1 && buf.get(0).type === 'punctuation.operator' && buf.get(0).value === '.') {
					var typedef = _highlights['typerefs'][_index].id.name;
					//let newIndex = searchHighlightsFor(typedef, token.value);
					//console.log(newIndex, highlights[typedef][newIndex]);
					addMarker(token, _highlights[typedef][searchHighlightsFor(typedef, token.value)]);
				}
			}

			//}


			buf.enq(token);
			token = iterator.stepForward();
		}

		if (callback) callback();

		//console.log('includes', includes);
		//console.log('typedefs', typedefs);
		//console.log('markers', markers);
		//console.log(editor.session.getMarkers());
		//console.timeEnd('parse time');
	}
};

function parseDeclaration(token) {
	if (token.type === 'paren.lparen' && token.value === '(') {
		parensCount += 1;
	} else if (token.type === 'paren.rparen' && token.value === ')') {
		parensCount -= 1;
		if (parensCount <= 0) {
			parensCount = 0;
			// console.log('parsing body of', parsing);
			parsingDeclaration = false;
			parsingBody = true;
		}
	} else if (buf.get(0).type === 'keyword.operator' && buf.get(0).value === '*' && buf.get(1).type === 'text' && buf.get(1).value === ' ' && buf.get(2).type === 'identifier' && buf.get(2).value === contextType) {
		contextName = token.value;
		// console.log('contextName', contextName);
		addMarker(token, _highlights.contextType[0]);
		addMarker(buf.get(2), _highlights.contextType[0]);
	}
}

function parseBody(token) {
	if (token.type === 'paren.lparen' && token.value === '{') {
		parensCount += 1;
	} else if (token.type === 'paren.rparen' && token.value === '}') {
		parensCount -= 1;
		if (parensCount <= 0) {
			parensCount = 0;
			// console.log('finished parsing body of', parsing);
			parsingBody = false;
		}
	} else if (token.type === 'identifier' && token.value === contextName) {
		// console.log('context!');
		addMarker(token, _highlights.contextType[0]);
	} else if (buf.get(1).type === 'identifier' && buf.get(1).value === contextName && buf.get(0).type === 'keyword.operator' && buf.get(0).value === '->') {
		var index = searchHighlightsFor(contextName, token.value);
		if (index !== -1) addMarker(token, _highlights[contextName][index]);
	} else if (token.type === 'identifier') {
		var _index2 = searchHighlightsFor('utility', token.value);
		if (_index2 !== -1) addMarker(token, _highlights['utility'][_index2]);
	}
}

function addMarker(token, type) {
	var range = token.range;
	var marker = {
		token: token,
		type: type,
		range: range,
		id: editor.session.addMarker(range, "bela-ace-highlight", "text") //,
		//anchor:	new Anchor(editor.session.doc, range.start.row, range.start.column)
	};
	/*marker.anchor.on('change', function(e){
 	range.setStart(e.value.row, e.value.column);
 	range.setEnd(e.value.row, e.value.column + token.value.length);
 });*/
	markers.push(marker);
}

function searchHighlightsFor(sub, val) {
	//console.log('searching', sub)
	//console.log(highlights[sub]);
	//console.log('for', val);
	if (!_highlights || !_highlights[sub]) return -1;
	var _iteratorNormalCompletion7 = true;
	var _didIteratorError7 = false;
	var _iteratorError7 = undefined;

	try {
		for (var _iterator7 = _highlights[sub][Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
			var item = _step7.value;

			if (item.name === val) {
				return _highlights[sub].indexOf(item);
			}
		}
	} catch (err) {
		_didIteratorError7 = true;
		_iteratorError7 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion7 && _iterator7.return) {
				_iterator7.return();
			}
		} finally {
			if (_didIteratorError7) {
				throw _iteratorError7;
			}
		}
	}

	return -1;
}

module.exports = parser;

},{"./CircularBuffer":2}],18:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var json = require('./site-text.json');

var _overlay = $('[data-overlay]');
var parent = $('[data-popup]');
var content = $('[data-popup-content]');
var titleEl = parent.find('h1');
var subEl = parent.find('p');
var codeEl = parent.find('code');
var bodyEl = parent.find('p');
var _formEl = parent.find('form');

function callFunc(func, arg) {
	if ('function' === typeof func) func(arg);
}

var overlayActiveClass = 'active-popup';
var errorClass = 'no';
var popup = {
	defaultStrings: {
		cancel: json.popups.generic.cancel,
		button: json.popups.generic.ok
	},
	defaultOpts: {
		focus: [// in reverse order of priority
		'button[type=submit]', '.cancel', 'input[type=text]'],
		titleClass: '',
		error: false
	},
	isShown: function isShown() {
		return parent.hasClass('active');
	},
	show: function show(skipFocus) {
		_overlay.addClass(overlayActiveClass);
		parent.addClass('active');
		if (!skipFocus) // used for backwards compatibilty
			content.find('input[type=text]').first().focus();
	},
	hide: function hide(keepOverlay) {
		if (keepOverlay !== 'keep overlay') _overlay.removeClass(overlayActiveClass);
		parent.removeClass('active');
		titleEl.removeClass('error');
		titleEl.empty();
		subEl.empty();
		subEl.removeClass('error');
		codeEl.empty();
		bodyEl.empty();
		_formEl.empty();
	},


	// presses the cancel button, which in turns should hide the popup
	cancel: function cancel(keepOverlay) {
		var done = false;
		if (this.isShown()) {
			var selectors = ['.cancel'];
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = selectors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var s = _step.value;

					var target = this.find(s);
					if (target.length) {
						target.click();
						done = true;
						break;
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
		return done;
	},
	overlay: function overlay() {
		_overlay.toggleClass(overlayActiveClass);
	},
	initWithStrings: function initWithStrings(strings) {
		this.seq++;
		popup.hide();
		// override with default values if appropriate
		var _iteratorNormalCompletion2 = true;
		var _didIteratorError2 = false;
		var _iteratorError2 = undefined;

		try {
			for (var _iterator2 = Object.entries(this.defaultStrings)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
				var _step2$value = _slicedToArray(_step2.value, 2),
				    key = _step2$value[0],
				    value = _step2$value[1];

				if (!strings.hasOwnProperty(key)) strings[key] = value;
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

		if (strings.title) popup.title(strings.title);
		if (strings.body) popup.body(strings.body);
		if (strings.text) popup.subtitle(strings.text);
		if (strings.code) popup.code(strings.code);
	},
	finalize: function finalize(newOpts) {
		popup.show();
		var opts = {};
		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = Object.entries(this.defaultOpts)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var _step3$value = _slicedToArray(_step3.value, 2),
				    key = _step3$value[0],
				    value = _step3$value[1];

				opts[key] = value;
			}
		} catch (err) {
			_didIteratorError3 = true;
			_iteratorError3 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion3 && _iterator3.return) {
					_iterator3.return();
				}
			} finally {
				if (_didIteratorError3) {
					throw _iteratorError3;
				}
			}
		}

		if ('object' === (typeof newOpts === 'undefined' ? 'undefined' : _typeof(newOpts))) {
			var _iteratorNormalCompletion4 = true;
			var _didIteratorError4 = false;
			var _iteratorError4 = undefined;

			try {
				for (var _iterator4 = Object.entries(newOpts)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
					var _step4$value = _slicedToArray(_step4.value, 2),
					    key = _step4$value[0],
					    value = _step4$value[1];

					opts[key] = value;
				}
			} catch (err) {
				_didIteratorError4 = true;
				_iteratorError4 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion4 && _iterator4.return) {
						_iterator4.return();
					}
				} finally {
					if (_didIteratorError4) {
						throw _iteratorError4;
					}
				}
			}
		}
		if (!Array.isArray(opts.focus)) opts.focus = [opts.focus];
		var _iteratorNormalCompletion5 = true;
		var _didIteratorError5 = false;
		var _iteratorError5 = undefined;

		try {
			for (var _iterator5 = opts.focus[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
				var f = _step5.value;

				var $tag = content.find(f).first();
				if ($tag.length) {
					$tag.focus();
					var tag = $tag[0];
					if (tag.tagName == "INPUT" && tag.value) {
						// * 2 because Opera sometimes interprets new lines as two
						// characters
						var end = tag.value.length * 2;
						tag.setSelectionRange(end, end);
					}
				}
			}
		} catch (err) {
			_didIteratorError5 = true;
			_iteratorError5 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion5 && _iterator5.return) {
					_iterator5.return();
				}
			} finally {
				if (_didIteratorError5) {
					throw _iteratorError5;
				}
			}
		}

		titleEl.addClass(opts.titleClass);
		if (opts.error) _overlay.addClass(errorClass);else _overlay.removeClass(errorClass);
	},
	respondToEvent: function respondToEvent(callback, e) {
		e.preventDefault();
		var previousSeq = this.seq;
		callFunc(callback, e);
		if (this.seq === previousSeq) // the callback may have started a new popup. In that case, we don't want to hide the new one!
			popup.hide();
	},
	disableSubmit: function disableSubmit() {
		this.form.off('submit');
		$('button[type=submit]', this.form).addClass('button-disabled').prop('disabled', true);
	},
	enableSubmit: function enableSubmit() {
		var _this = this;

		this.form.on('submit', function (e) {
			_this.respondToEvent(_this.stashedOnSubmit, e);
		});
		$('button[type=submit]', this.form).removeClass('button-disabled').prop('disabled', false);
	},

	// shorthands for common popup configurations.
	// strings may have fields: title, text(subtitle), code, body, button, cancel

	// A popup with two buttons - Submit and Cancel
	// Builds the popup with the initWithStrings() function, then adds the two button callbacks.
	twoButtons: function twoButtons(strings, onSubmit, onCancel, opts) {
		var _this2 = this;

		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="submit" class="button popup-save confirm">' + strings.button + '</button>');
		form.push('<button type="button" class="button cancel">' + strings.cancel + '</button>');

		this.stashedOnSubmit = onSubmit;
		popup.form.empty().append(form.join('')).off('submit').on('submit', function (e) {
			_this2.respondToEvent(onSubmit, e);
		});
		popup.find('.cancel').on('click', function (e) {
			_this2.respondToEvent(onCancel, e);
		});
		popup.finalize(opts);
	},


	// For popups with only one button that needs to fire an event when clicked (eg, confirmation)
	// To work a strings.button string must be present in the strings object that's passed in
	oneButton: function oneButton(strings, onCancel, opts) {
		var _this3 = this;

		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="cancel" class="button popup-save">' + strings.button + '</button>');
		popup.form.empty().append(form.join('')).find('.popup-save').on('click', function (e) {
			_this3.respondToEvent(onCancel, e);
		});
		popup.finalize(opts);
	},


	// a popup with no buttons. It must be hidden by a callback somewhere else
	noButton: function noButton(strings, opts) {
		this.initWithStrings(strings);
		var form = [];
		popup.finalize(opts);
	},


	// a popup with one button which will hide itself upon click
	// To change the text on the button pass in strings.button to the strings object
	ok: function ok(strings, opts) {
		var _this4 = this;

		this.initWithStrings(strings);
		var form = [];
		form.push('<button type="submit" class="button popup cancel">' + strings.button + '</button>');
		popup.form.empty().append(form.join('')).off('submit').on('submit', function (e) {
			_this4.respondToEvent(undefined, e);
		});
		popup.finalize(opts);
	},


	// a popup with two buttons and an input field. The input field can be
	// checked against an array of disallowedValues. If the name is disallowed,
	// the submit button will be grayed out.
	// args has: initialValue(string), getDisallowedValues(function that returns an arrayof strings), sanitise(function), strings(contains title, text, button, input, sub_text, sanitised, exists (all optional), sanitise(function))  (all optional)
	// callback takes a single argument: a valid value or null if the popup was cancelled or the input field was empty
	requestValidInput: function requestValidInput(args, callback) {
		var initialValue = args.initialValue;
		var getDisallowedValues = args.getDisallowedValues;
		var strings = Object.assign({}, args.strings);
		var sanitise = args.sanitise;
		// defaults
		if (typeof initialValue !== "string") initialValue = "";
		if (typeof getDisallowedValues !== 'function') getDisallowedValues = function getDisallowedValues() {
			return [];
		};
		if ((typeof strings === 'undefined' ? 'undefined' : _typeof(strings)) !== "object") strings = {};
		if (typeof sanitise !== "function") sanitise = function sanitise(a) {
			return a;
		};
		var _arr = ['input', 'sub_text'];
		for (var _i = 0; _i < _arr.length; _i++) {
			var field = _arr[_i];
			if (typeof strings[field] !== "string") strings[field] = '';
		}
		popup.twoButtons(strings, function onSubmit(e) {
			var val = popup.find('input[type=text]').val();
			if (!val) val = null;else sanitise ? val = sanitise(val) : val;
			callback(val);
		}, function onCancel() {
			callback(null);
		});
		var newValueInput = '<input type="text" data-name="newValue" placeholder="' + strings.input + '" value="' + initialValue + '" />' + '<span class="input-already-existing"></span>' + '<div class="input-sanitised"></div>';
		if (strings.sub_text) newValueInput += '<p class="create_file_subtext">' + strings.sub_text + '</p>';
		newValueInput += '<br/><br/>';
		popup.form.prepend(newValueInput);
		var input = $('input[data-name=newValue]', popup.form);
		var existingWarning = $('.input-already-existing', popup.form);
		var sanitisedWarning = $('.input-sanitised', popup.form);
		var validateValue = function validateValue(e) {
			var origValue = input[0].value.trim();
			var sanValue = sanitise ? sanitise(origValue) : origValue;
			if (sanValue !== origValue && strings.sanitised) sanitisedWarning.html(strings.sanitised + " '" + sanValue + "'");else sanitisedWarning.html('');
			if (getDisallowedValues().includes(sanValue)) {
				if (strings.exists) existingWarning.html(strings.exists);
				popup.disableSubmit();
			} else {
				existingWarning.html('');
				popup.enableSubmit();
			}
		};
		validateValue();
		input.on('change keypress paste input', validateValue);
		// duplicated call, but this allows re-focus after input was created
		popup.finalize();
	},
	requestValidInputAsync: async function requestValidInputAsync(args) {
		var _this5 = this;

		return new Promise(function (resolve, reject) {
			_this5.requestValidInput(args, function (value) {
				resolve(value);
			});
		});
	},


	find: function find(selector) {
		return content.find(selector);
	},

	title: function title(text) {
		return titleEl.html(text);
	},
	subtitle: function subtitle(text) {
		return subEl.html(text);
	},
	code: function code(html) {
		return codeEl.html(html);
	},
	body: function body(text) {
		return bodyEl.html(text);
	},
	formEl: function formEl(html) {
		return _formEl.html(html);
	},

	append: function append(child) {
		return content.append(child);
	},

	form: _formEl,

	seq: 0,

	exampleChanged: example

};

module.exports = popup;

function example(cb, arg, delay, cancelCb) {

	// build the popup content
	popup.title('Save your changes?');
	popup.subtitle('Warning: Any unsaved changes will be lost');
	popup.body('You have made changes to an example project. If you continue, your changes will be lost. To keep your changes, click cancel and then Save As in the project manager tab');
	var form = [];
	form.push('<button type="submit" class="button popup confirm">Continue</button>');
	form.push('<button type="button" class="button popup cancel">Cancel</button>');

	popup.form.append(form.join('')).off('submit').on('submit', function (e) {
		e.preventDefault();
		setTimeout(function () {
			callFunc(cb, arg);
		}, delay);
		popup.hide();
	});

	popup.find('.cancel').on('click', function (e) {
		popup.hide();
		callFunc(cancelCb, e);
	});

	popup.show();

	popup.find('.confirm').focus();
}

},{"./site-text.json":19}],19:[function(require,module,exports){
module.exports={
    "locale": "en",
	"popups": {
    "generic": {
      "ok": "OK",
      "cancel": "Cancel"
    },
		"create_new": {
			"title": "Create new project",
			"text": "Choose the development language for this project, and give it a name:",
			"button": "Create project",
			"input": "Enter your project name",
			"exists": "This project already exists",
			"sanitised": "This project will be saved as"
		},
		"save_as": {
			"title": "Save project as ...",
			"text": "",
			"input": "Enter your new project name",
			"button": "Save project",
			"exists": "This project already exists",
			"sanitised": "This project will be saved as"
		},
		"delete_project": {
			"title": "Delete this project?",
			"text": "Warning: There is no undo.",
			"button": "Delete project"
		},
		"create_new_file": {
			"title": "Create new file",
			"text": "Enter the new file name and extension (only files with .cpp, .c or .S extensions will be compiled).",
			"input": "Your new file name",
			"button": "Create file",
			"exists": "This file already exists",
			"sanitised": "This file will be saved as"
		},
		"create_new_project_from_zip": {
			"title": "Create project from ",
			"text": "Choose a name for this project:",
			"sub_text": "To add this file to an existing project, close this window and use the Upload File button in the Project Explorer tab.",
			"input": "New project name",
			"button": "Create project",
			"exists": "This project already exists",
			"sanitised": "This project will be saved as"
		},
		"create_new_folder": {
			"title": "Create new folder",
			"text": "Enter the new folder name.",
			"input": "Your new folder name",
			"button": "Create folder",
			"exists": "This folder already exists",
			"sanitised": "This folder will be saved as"
		},
		"rename_file": {
			"title": "Rename this file?",
			"input": "The new file name",
			"text": "Enter the new file name and extension (only files with .cpp, .c or .S extensions will be compiled).",
			"button": "Rename file",
			"exists": "This file already exists",
			"sanitised": "This file will be saved as"
		},
    "rename_folder": {
			"title": "Rename this folder?",
			"input": "The new folder name",
			"text": "Enter the new folder name",
			"button": "Rename folder",
			"exists": "This folder already exists",
			"sanitised": "This folder will be saved as"
		},
		"delete_project": {
			"title": "Delete project `{0}`",
			"text": "Warning: There is no undo.",
			"button": "Delete project"
		},
		"delete_file": {
			"title": "Delete file `{0}`?",
			"text": "Warning: There is no undo.",
			"button": "Delete file"
		},
    "upload_file": {
			"title": "Upload a file",
			"text": "Select a file to upload.",
			"button": "Upload file"
		},
    "upload_file_progress": {
			"title": "Uploading",
			"text": "The files are being uploaded...",
			"button": "OK"
		},
    "upload_file_success": {
			"title": "Success",
			"text": "All files uploaded successfully",
			"button": "OK"
		},
    "upload_file_error": {
			"title": "Uploading file error"
		},
		"upload_file_nofileselected_error": {
			"title": "Error: No file selected for upload",
			"text": "No file was selected for upload",
			"button": "Try Again"
		},
		"restore_default_project_settings": {
			"title": "Restore default project settings?",
			"text": "Your current project settings will be restored to defaults. There is no undo.",
			"button": "Restore defaults"
		},
		"restore_default_ide_settings": {
			"title": "Restore default IDE settings?",
			"text": "Your current IDE settings will be restored to defaults. There is no undo.",
			"button": "Restore defaults"
		},
		"shutdown": {
			"title": "Shut down Bela?",
			"text": "Bela will disconnect from the IDE and shutdown gracefully.",
			"button": "Yes, shut down Bela"
		},
		"update": {
			"title": "Update Bela",
			"text": "Select your Bela update (will be a ZIP file).",
			"button": "Update now"
		},
		"about": {
			"title": "About Bela",
			"text": "Bela was born out of research at Queen Mary University of London. It is developed and supported by the Bela team, and sold by Augmented Instruments Ltd in London, UK. For more information, please visit bela.io.",
			"button": "Close"
		},
		"version": {
			"title": "Version details",
			"image_version_label": "Image: ",
			"core_version_label": "Core code: ",
			"textTemplateSuccess": [ "Last updated on '{0}'", "from file '{0}'", "via '{0}'", "Update was successful"],
			"textTemplateFailed": [ "Last attempted update on '{0}'", "from file '{0}'", "via '{0}'", "Update failed"],
			"textTemplateUnknown": [ "Last attempted update on '{0}'", "from file '{0}'", "via '{0}'", ""],
			"textUnknown": [ "We could not determine the last time your core code was updated" ],
			"textTemplateGitDesc": "Git desc: '{0}'",
			"button": "Close"
		},
		"overwrite": {
			"title": "Overwrite file?",
			"text": " already exists in this project. Overwrite?",
			"button": "Overwrite",
			"tick": "Don't ask me again this session"
		},
		"commit": {
			"title": "Commit your changes",
			"text": "Enter a commit message:",
			"input": "Your commit message",
			"button": "Commit"
		},
		"branch": {
			"title": "Create a new branch",
			"text": "Specify this branch's name:",
			"input": "Your new ranch name",
			"button": "Create branch"
		},
		"discard": {
			"title": "Discard changes?",
			"text": "This will discard all changes since your last commit. There is no undo.",
			"button": "Discard changes"
		},
		"file_changed": {
			"title": "File changed on disk",
			"text": "This file has been edited in another tab. Would you like to reload to discard your changes here and switch to the edited version?",
			"button": "Yes, reload",
			"cancel": "No, keep going"
		},
		"enter_readonly": {
			"title": "This window is now read-only",
			"text": "You have opened this file in more than one browser window. Because files can only be edited in one window at a time, this window is now in read-only mode.",
			"button": "OK"
		},
		"exit_readonly": {
			"title": "Exit read-only mode?",
			"text": [
				"To exit read-only mode and edit this file, click Reload. This will refresh the page and load the most recent version of this file, and you'll be able to edit it here.",
				"To stay in read-only mode, click Cancel."
			],
			"submit": "Reload",
			"cancel": "Cancel"
		},
		"upload_size_error": {
		   "title": "Error: File(s) `{0}` too large",
			 "text": "The maximum size for uploading files via drag and drop interface is 20MB. Please click 'try again' to select a file from your computer.",
			 "button": "Try Again"
		 }
	},
  "tabs": {
    "includeTitle": "Include this Library",
    "infoTitle": "Library info",
    "examplesTitle": "Examples",
    "filesTitle": "Files",
    "includeInstructions": "Copy & paste at the top of each .cpp file in your project."
  },
  "file_view": {
    "sources": "Sources",
    "headers": "Headers",
    "abstractions": "Abstractions",
    "images": "Images",
    "resources": "Resources",
    "directories": "Directories"
  },
	"editor_view": {
			"preview": "This is a preview - these objects are not editable in the browser.",
      "pd": {
        "error": "Rendering pd patch failed!"
      },
      "binary": {
        "error": "This type of file cannot be displayed."
      },
      "deleted": {
        "error": "This file no longer exists. Select or create another file."
      },
      "keypress_read_only": "This file is read-only. Open a file or refresh the page to keep editing."
	},
	"settings_view": {
		"update": "Beginning update - this may take several minutes",
		"browser": "The browser will temporarily disconnect, and may become unresponsive",
		"ide": "Do not use the IDE during this process",
		"zip": "This is not a valid zip archive."
	},
	"toolbar": {
		"run": "Build & run",
		"stop": "Stop",
		"clear": "Clear console",
		"scope": "Launch scope",
		"gui": "Launch GUI"
	},
	"console": {
		"update_error": "Error updating the board: `{0}`. Please try a different zip archive",
		"messages": "Your code is printing to the console too quickly. Check your audio thread for print messages.",
		"disconnect": "Bela has disconnected. Any changes you make will not be saved. Check your USB connection and reboot Bela."
	},
	"ide_browser": {
		"stop": "Stopping Bela ...",
		"mode_switch": " mode switch detected on the audio thread.",
		"mode_switches": " mode switches detected on the audio thread.",
		"file_changed": "This file was edited in another window and has changed. Reopen the file to make edits.",
		"zip_error": "There was a problem updating Bela. Make sure you have selected the correct zip file and try again."
	},
	"docs_view": {
		"examples": "Examples that use this class:",
		"button": "Launch documentation"
	},
  "funcKeys": {
    "openProject"	: "Open project",
	"uploadZipProject" : "Create project from zip archive",
  	"openExample"	: "Open example",
  	"newProject"	: "Create project",
  	"saveAs"		: "Save project",
  	"deleteProject"	: "Delete project",
  	"cleanProject"	: "Clean project",
  	"openFile"		: "Open file",
  	"newFile"		: "Create file",
  	"uploadFile"	: "Upload file",
  	"renameFile"	: "Rename file",
  	"deleteFile"	: "Delete file",
  	"init"			: "Initialise",
  	"stop"			: "Stop",
  	"fileRejected"	: "Upload file"
  }
}

},{}],20:[function(require,module,exports){
'use strict';

var json = require('./site-text.json');
var popup = require('./popup');
// replace most non alpha-numeric chars with '_'
module.exports.sanitise = function (name, options) {
	var isPath = false;
	if (options && options.isPath) isPath = options.isPath;
	var newName = name.replace(/[^a-zA-Z0-9\.\-\+\%\_\/~]/g, '_');
	if (isPath) {
		// if this is a path, simply remove trailing slash
		newName = newName.replace(/\/$/, '');
	} else {
		// otherwise do not allow any '/'
		newName = newName.replace(/[\/]/g, '_');
	}
	return newName;
};

module.exports.dirname = function (path) {
	var lastIndex = path.lastIndexOf('/');
	return path.slice(0, lastIndex);
};

module.exports.filename = function (path) {
	var lastIndex = path.lastIndexOf('/');
	return path.slice(lastIndex + 1);
};

module.exports.prettySize = function (size) {
	var ret = void 0;
	var uom = void 0;
	var s = void 0;
	if (size < 1000000) {
		s = size / 1000;
		uom = "kB";
	} else if (size >= 1000000 && size < 1000000000) {
		uom = "MB";
		s = size / 1000 / 1000;
	} else if (size >= 1000000000) {
		uom = "GB";
		s = size / 1000 / 1000 / 1000;
	}
	var f = void 0;
	if (s >= 100) f = 0;else if (s >= 10) f = 1;else f = 2;
	ret = s.toFixed(f) + uom;
	return ret;
};

module.exports.formatString = function (format, vargs) {
	var args = Array.prototype.slice.call(arguments, 1);
	return format.replace(/{(\d+)}/g, function (match, number) {
		return typeof args[number] != 'undefined' ? args[number] : match;
	});
};

// add onClick events for accordion functionality to relevant elements of the
// provided elements
module.exports.addAccordionEvent = function (elements) {
	if (!elements) elements = $("*");
	elements = elements.filter('[data-accordion-for]:not([data-accordion-ready])');
	elements.on('click', function () {
		var that = $(this);
		var parent = $('[data-tab=' + $(this)[0].dataset.parent + ']');
		var source = $(this).data('accordion-for');
		$(parent).find('[data-accordion]').each(function () {
			var target = $(this).data('accordion');
			if (target === source) {
				if (that.hasClass('active')) {
					that.removeClass('active');
					$(this).removeClass('show');
				} else {
					that.addClass('active');
					$(this).addClass('show');
				}
			}
		});
	});
	elements.attr('data-accordion-ready', "");
};

// dropdowns
module.exports.addDropdownEvent = function (elements) {
	if (!elements) elements = $("*");
	elements.filter('[data-dropdown-for]').on('click', function () {
		var source = $(this).data('dropdown-for');
		$('[data-dropdown]').each(function () {
			var target = $(this).data('dropdown');
			if (target === source) {
				$(this).addClass('show');
			}
		});
	});
	// Close the dropdown menu if the user clicks outside of it
	window.onclick = function (event) {
		if (!event.target.matches('[data-dropdown-for]') && !event.target.matches('[data-dropdown] *')) {
			$('[data-dropdown]').removeClass('show');
		}
	};
};
module.exports.doLargeFileUpload = function (formData, success, error) {
	popup.noButton(json.popups.upload_file_progress);
	$.ajax({
		type: "POST",
		url: '/uploads',
		enctype: 'multipart/form-data',
		processData: false,
		contentType: false,
		data: formData,
		success: success,
		error: error
	});
};

module.exports.breakable = function (text) {
	return '<span class="word-breakable">' + text + '</span>';
};

},{"./popup":18,"./site-text.json":19}],21:[function(require,module,exports){
module.exports=[
  "Fundamentals",
  "Digital",
  "Analog",
  "Audio",
  "Communication",
  "Gui",
  "Sensors",
  "Multichannel",
  "Trill",
  "PureData",
  "SuperCollider",
  "Csound",
  "Capelets",
  "Instruments",
  "terminal-only",
  "Salt",
  "Pepper"
]

},{}]},{},[16])

//# sourceMappingURL=bundle.js.map
