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

//// IDE controller
module.exports = {};

var Model = require('./Models/Model');
var popup = require('./popup');

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
	//console.log('project-settings', data);
	//console.trace('project-settings');
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
settingsView.on('upload-update', function (data) {
	return socket.emit('upload-update', data);
});
settingsView.on('error', function (text) {
	return consoleView.emit('warn', text);
});

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
projectView.on('message', function (event, data) {
	if (!data.currentProject && models.project.getKey('currentProject')) {
		data.currentProject = models.project.getKey('currentProject');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// file view
var fileView = new (require('./Views/FileView'))('fileManager', [models.project, models.settings]);
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
fileView.on('force-rebuild', function () {
	socket.emit('process-event', {
		event: 'rebuild',
		currentProject: models.project.getKey('currentProject')
	});
});
fileView.on('file-rejected', function (filename) {
	var timestamp = performance.now();
	consoleView.emit('openNotification', { func: 'fileRejected', timestamp: timestamp });
	consoleView.emit('closeNotification', { error: '... failed, file ' + filename + ' already exists. Refresh to allow overwriting', timestamp: timestamp });
});

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
editorView.on('goto-docs', function (word, id) {
	if (tabView.getOpenTab() === 'tab-5' && word !== 'BelaContext') {
		documentationView.emit('open', id);
	} else {
		$('#iDocsLink').addClass('iDocsVisible').prop('title', 'cmd + h: ' + word).off('click').on('click', function () {
			tabView.emit('open-tab', 'tab-5');
			documentationView.emit('open', id);
		});
	}
});
editorView.on('clear-docs', function () {
	return $('#iDocsLink').removeClass('iDocsVisible').off('click');
});
editorView.on('highlight-syntax', function (names) {
	return socket.emit('highlight-syntax', names);
});
editorView.on('compare-files', function (compare) {
	compareFiles = compare;
	// unset the interval
	if (!compare) setModifiedTimeInterval(undefined);
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings]);
toolbarView.on('process-event', function (event) {
	var data = {
		event: event,
		currentProject: models.project.getKey('currentProject')
	};
	//data.timestamp = performance.now();
	if (event === 'stop') consoleView.emit('openProcessNotification', 'Stopping Bela...');
	socket.emit('process-event', data);
});
toolbarView.on('clear-console', function () {
	return consoleView.emit('clear', true);
});
toolbarView.on('mode-switch-warning', function (num) {
	return consoleView.emit('warn', num + ' mode switch' + (num != 1 ? 'es' : '') + ' detected on the audio thread!');
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

// git view
var gitView = new (require('./Views/GitView'))('gitManager', [models.git]);
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
setInterval(function () {
	return socket.emit('list-files', models.project.getKey('currentProject'));
}, 5000);

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', function (error) {
	return consoleView.emit('warn', error.message || error);
});

socket.on('init', function (data) {

	consoleView.connect();

	var timestamp = performance.now();
	socket.emit('project-event', { func: 'openProject', currentProject: data[2].project, timestamp: timestamp });
	consoleView.emit('openNotification', { func: 'init', timestamp: timestamp });

	models.project.setData({ projectList: data[0], exampleList: data[1], currentProject: data[2].project });
	models.settings.setData(data[2]);

	$('#runOnBoot').val(data[3]);

	models.settings.setKey('xenomaiVersion', data[4]);

	models.status.setData(data[5]);

	//models.project.print();
	//models.settings.print();

	socket.emit('set-time', new Date().toString());

	documentationView.emit('init');

	// hack to stop changes to read-only example being overwritten when opening a new tab
	if (data[2].project === 'exampleTempProject') models.project.once('set', function () {
		return projectView.emit('example-changed');
	});

	// socket.io timeout	
	socket.io.engine.pingTimeout = 6000;
	socket.io.engine.pingInterval = 3000;
});

// project events
socket.on('project-data', function (data) {

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
	//console.log(project, list);
	if (project && list.indexOf(models.project.getKey('currentProject')) === -1) {
		// this project has just been deleted
		console.log('project-list', 'openProject');
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

socket.on('disconnect', function () {
	consoleView.disconnect();
	toolbarView.emit('disconnected');
	models.project.setKey('readOnly', true);
});

socket.on('file-changed', function (project, fileName) {
	if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')) {
		console.log('file changed!');
		models.project.setKey('readOnly', true);
		models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
		//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
	}
});

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
	consoleView.emit('warn', 'Error updating the board, please try a different zip archive');
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

	popup.title('File Changed on Disk');
	popup.subtitle('Would you like to reload ' + fileName + '?');

	var form = [];
	form.push('<button type="submit" class="button popup-save">Reload from Disk</button>');
	form.push('<button type="button" class="button popup-cancel">Keep Current</button>');

	popup.form.append(form.join('')).off('submit').on('submit', function (e) {
		fileChangedPopupVisible = false;
		e.preventDefault();
		var data = {
			func: 'openProject',
			currentProject: models.project.getKey('currentProject'),
			timestamp: performance.now()
		};
		socket.emit('project-event', data);
		consoleView.emit('openNotification', data);
		popup.hide();
	});

	popup.find('.popup-cancel').on('click', function () {
		popup.hide();
		fileChangedPopupVisible = false;
		editorView.emit('upload', editorView.getData());
	});

	popup.show();
	fileChangedPopupVisible = true;
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
	$('title').html((data.fileName ? data.fileName + ', ' : '') + projectName);

	// set the top-line stuff
	$('#top-open-project').html(projectName ? 'Project: ' + projectName : '');
	$('#top-open-file').html(data.fileName ? 'File: ' + data.fileName : '');

	if (data.exampleName) {
		$('#top-example-docs').css('visibility', 'visible');
		$('#top-example-docs-link').prop('href', 'documentation/' + data.exampleName + '_2render_8cpp-example.html');
	} else {
		$('#top-example-docs').css('visibility', 'hidden');
	}
});
models.status.on('change', function (data, changedKeys) {
	if (changedKeys.indexOf('running') !== -1 || changedKeys.indexOf('building') !== -1) {
		if (data.running) $('#top-bela-status').html('Running: ' + data.runProject);else if (data.building) $('#top-bela-status').html('Building: ' + data.buildProject);else $('#top-bela-status').html('');
	}
});

// history
{
	(function () {
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
	})();
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
						file: str[0].split('/').pop(),
						row: str[1] - 1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
						type: "error"
					});
				} else if (str[3] == ' fatal error') {
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1] - 1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
						type: "error"
					});
				} else if (str[3] == ' warning') {
					errors.push({
						file: str[0].split('/').pop(),
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
						consoleView.emit('warn', 'linker error detected, set verbose build output in settings for details');
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

			if (!err.file || err.file === models.project.getKey('fileName')) {
				err.currentFile = true;
				currentFileErrors.push(err);
			} else {
				err.currentFile = false;
				err.text = 'In file ' + err.file + ': ' + err.text;
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

keypress.simple_combo("meta s", function () {
	toolbarView.emit('process-event', 'run');
});
keypress.simple_combo("meta o", function () {
	tabView.emit('toggle');
});
keypress.simple_combo("meta k", function () {
	consoleView.emit('clear');
});
keypress.simple_combo("meta h", function () {
	$('#iDocsLink').trigger('click');
});

},{"./Models/Model":4,"./Views/ConsoleView":5,"./Views/DocumentationView":6,"./Views/EditorView":7,"./Views/FileView":8,"./Views/GitView":9,"./Views/ProjectView":10,"./Views/SettingsView":11,"./Views/TabView":12,"./Views/ToolbarView":13,"./popup":18}],4:[function(require,module,exports){
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

},{"events":1}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var _console = require('../console');

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

		_this.form = document.getElementById('beaglert-consoleForm');
		_this.input = document.getElementById('beaglert-consoleInput');

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

		$('#beaglert-consoleInput-pre').on('click', function () {
			return $(_this.input).trigger('focus');
		});

		$('#beaglert-consoleInput-pre, #beaglert-consoleInput').on('mouseover', function () {
			$('#beaglert-consoleInput-pre').css('opacity', 1);
		}).on('mouseout', function () {
			if (!_this.inputFocused) $('#beaglert-consoleInput-pre').css('opacity', 0.2);
		});

		_this.input.addEventListener('focus', function () {
			_this.inputFocused = true;
			$('#beaglert-consoleInput-pre').css('opacity', 1); //.html(shellCWD);
		});
		_this.input.addEventListener('blur', function () {
			_this.inputFocused = false;
			$('#beaglert-consoleInput-pre').css('opacity', 0.2); //.html('>');
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

		$('#beaglert-console').on('click', function () {
			return $(_this.input).trigger('focus');
		});
		$('#beaglert-consoleWrapper').on('click', function (e) {
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
			$('#beaglert-consoleInput-pre').html(shellCWD);
		});
		_this.on('shell-tabcomplete', function (data) {
			return $('#beaglert-consoleInput').val(data);
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
			}
			_console.notify(output + '...', data.timestamp);
		}
	}, {
		key: 'closeNotification',
		value: function closeNotification(data) {
			if (data.error) {
				_console.reject(' ' + data.error, data.timestamp);
			} else {
				_console.fulfill(' done', data.timestamp);
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
			$('#console-disconnect').remove();
			_console.unblock();
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			console.log('disconnected');
			_console.warn('You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone', 'console-disconnect');
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

						_console.log(line.split(' ').join('&nbsp;'), 'make');
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
				_console.notify('Building project...', timestamp, true);
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
				_console.notify('Running project...', timestamp, true);
				_console.fulfill('', timestamp, true);
			} else {
				_console.notify('Bela stopped', timestamp, true);
				/*if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined'){
    	_console.reject(' with signal '+data.belaResult.signal, timestamp, true);
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
	'openProject': 'Opening project',
	'openExample': 'Opening example',
	'newProject': 'Creating project',
	'saveAs': 'Saving project',
	'deleteProject': 'Deleting project',
	'cleanProject': 'Cleaning project',
	'openFile': 'Opening file',
	'newFile': 'Creating file',
	'uploadFile': 'Uploading file',
	'renameFile': 'Renaming file',
	'deleteFile': 'Deleting file',
	'init': 'Initialising',
	'stop': 'Stopping',
	'fileRejected': 'Uploading file'
};

},{"../console":15,"./View":14}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];

var classes = ['Scope', 'OSCServer', 'OSCClient', 'OSCMessageFactory', 'UdpServer', 'UdpClient', 'Midi', 'MidiParser', 'WriteFile'];

var DocumentationView = function (_View) {
	_inherits(DocumentationView, _View);

	function DocumentationView(className, models) {
		_classCallCheck(this, DocumentationView);

		var _this = _possibleConstructorReturn(this, (DocumentationView.__proto__ || Object.getPrototypeOf(DocumentationView)).call(this, className, models));

		_this.on('init', _this.init);

		_this.on('open', function (id) {
			_this.closeAll();
			$('#' + id).prop('checked', 'checked');
			$('#' + id).parent().parent().siblings('input').prop('checked', 'checked');
			var offset = $('#' + id).siblings('label').position().top + $('#docTab').scrollTop();
			if (offset) $('#docTab').scrollTop(offset);
		});
		return _this;
	}

	_createClass(DocumentationView, [{
		key: 'init',
		value: function init() {

			var self = this;

			// The API
			$.ajax({
				type: "GET",
				url: "documentation_xml?file=Bela_8h",
				dataType: "html",
				success: function success(xml) {
					//console.log(xml);
					var counter = 0;
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = apiFuncs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var item = _step.value;

							var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains(' + item + '))'), 'APIDocs' + counter, self, 'api');
							li.appendTo($('#APIDocs'));
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
					//console.log(xml);
					var counter = 0;
					createlifromxml($(xml), 'contextDocs' + counter, 'structBelaContext', self, 'contextType').appendTo($('#contextDocs'));
					counter += 1;
					$(xml).find('memberdef').each(function () {
						var li = createlifrommemberdef($(this), 'contextDocs' + counter, self, 'context');
						li.appendTo($('#contextDocs'));
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
					//console.log(xml);
					var counter = 0;
					createlifromxml($(xml), 'utilityDocs' + counter, 'Utilities_8h', self, 'header').appendTo($('#utilityDocs'));
					counter += 1;
					$(xml).find('memberdef').each(function () {
						var li = createlifrommemberdef($(this), 'utilityDocs' + counter, self, 'utility');
						li.appendTo($('#utilityDocs'));
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
		key: 'closeAll',
		value: function closeAll() {
			$('#docsParent').find('input:checked').prop('checked', '');
		}
	}]);

	return DocumentationView;
}(View);

module.exports = DocumentationView;

function createlifrommemberdef($xml, id, emitter, type) {

	var name = $xml.find('name').html();
	emitter.emit('add-link', { name: name, id: id }, type);

	var li = $('<li></li>');
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html(name));

	var content = $('<div></div>');

	// title
	content.append($('<h2></h2>').html($xml.find('definition').html() + $xml.find('argsstring').html()));

	// subtitle
	content.append($('<h3></h3>').html($xml.find('briefdescription > para').html() || ''));

	// main text
	$xml.find('detaileddescription > para').each(function () {
		if ($(this).find('parameterlist').length) {
			content.append('</br><h3>Parameters:</h3>');
			var ul = $('<ul></ul>');
			$(this).find('parameteritem').each(function () {
				var li = $('<li></li>');
				li.append($('<strong></strong>').html($(this).find('parametername').html() + ': '));
				$(this).find('parameterdescription>para').each(function () {
					li.append($('<span></span>').html($(this).html() || ''));
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
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html(name));

	var content = $('<div></div>');

	// title
	//content.append($('<h2></h2>').html( $xml.find('definition').html() + $xml.find('argsstring').html() ));

	// subtitle
	content.append($('<h3></h3>').html($xml.find('compounddef > briefdescription > para').html() || ''));

	// main text
	$xml.find('compounddef > detaileddescription > para').each(function () {
		if ($(this).find('parameterlist').length) {
			content.append('</br><h3>Parameters:</h3>');
			var ul = $('<ul></ul>');
			$(this).find('parameteritem').each(function () {
				var li = $('<li></li>');
				li.append($('<strong></strong>').html($(this).find('parametername').html() + ': '));
				$(this).find('parameterdescription>para').each(function () {
					li.append($('<span></span>').html($(this).html() || ''));
				});
				ul.append(li);
			});
			content.append(ul);
		} else {
			content.append($('<p></p>').html($(this).html() || ''));
		}
	});

	content.append('</br><a href="documentation/' + filename + '.html" target="_blank">Full Documentation</a>');

	li.append(content);
	return li;
}

function xmlClassDocs(classname, emitter) {
	var filename = 'class' + classname;
	var parent = $('#' + classname + 'Docs');
	$.ajax({
		type: "GET",
		url: "documentation_xml?file=" + filename,
		dataType: "html",
		success: function success(xml) {
			//console.log(xml);

			var counter = 0;
			createlifromxml($(xml), classname + counter, filename, emitter, 'typedef').appendTo(parent);
			emitter.emit('add-link', { name: classname, id: classname + counter }, 'header');

			counter += 1;
			$(xml).find('[kind="public-func"]>memberdef:not(:has(name:contains(' + classname + ')))').each(function () {
				//console.log($(this));
				var li = createlifrommemberdef($(this), classname + counter, emitter, classname);
				li.appendTo(parent);
				counter += 1;
			});

			// when tab is opened
			parent.siblings('input').on('change', function () {
				console.log(classname);
			});

			$.ajax({
				type: "GET",
				url: "documentation_xml?file=" + classname + "_8h",
				dataType: "html",
				success: function success(xml) {
					//console.log(xml);
					var includes = $(xml).find('includedby');
					if (includes.length) {
						var content = $('#' + classname + '0').siblings('div');
						content.append($('<p></p>').html('Examples featuring this class:'));
						includes.each(function () {
							var include = $(this).html();
							if (include && include.split && include.split('/')[0] === 'examples') {
								var link = $('<a></a>').html(include.split('/')[2]);
								link.on('click', function () {
									return emitter.emit('open-example', [include.split('/')[1], include.split('/')[2]].join('/'));
								});
								content.append(link).append('</br>');
							}
						});
					}
				}
			});
		}
	});
}

},{"./View":14}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var Range = ace.require('ace/range').Range;

var uploadDelay = 50;

var uploadBlocked = false;
var currentFile;
var imageUrl;
var activeWords = [];
var activeWordIDs = [];

var EditorView = function (_View) {
	_inherits(EditorView, _View);

	function EditorView(className, models) {
		_classCallCheck(this, EditorView);

		var _this = _possibleConstructorReturn(this, (EditorView.__proto__ || Object.getPrototypeOf(EditorView)).call(this, className, models));

		_this.highlights = {};

		_this.editor = ace.edit('editor');
		var langTools = ace.require("ace/ext/language_tools");

		_this.parser = require('../parser');
		_this.parser.init(_this.editor, langTools);
		_this.parser.enable(true);

		// set syntax mode
		_this.on('syntax-highlighted', function () {
			return _this.editor.session.setMode({ path: "ace/mode/c_cpp", v: Date.now() });
		});
		_this.editor.session.setMode('ace/mode/c_cpp');
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

		// use hard tabs, not spaces
		_this.editor.session.setOption('useSoftTabs', false);

		// this function is called when the user modifies the editor
		_this.editor.session.on('change', function (e) {
			//console.log('upload', !uploadBlocked);
			if (!uploadBlocked) {
				_this.editorChanged();
				_this.editor.session.bgTokenizer.fireUpdateEvent(0, _this.editor.session.getLength());
				// console.log('firing tokenizer');
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

		$('#audioControl').find('button').on('click', function () {
			return audioSource.start(0);
		});

		_this.on('resize', function () {
			return _this.editor.resize();
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
			}); //this.emit('highlight-syntax', activeWords), 100);
		});

		_this.editor.session.on('tokenizerUpdate', function (e) {
			// console.log('tokenizerUpdate'); 
			_this.parser.parse(function () {
				_this.getCurrentWord();
			});
		});

		return _this;
	}

	_createClass(EditorView, [{
		key: 'editorChanged',
		value: function editorChanged() {
			var _this2 = this;

			this.emit('editor-changed');
			clearTimeout(this.uploadTimeout);
			this.uploadTimeout = setTimeout(function () {
				return _this2.emit('upload', _this2.editor.getValue());
			}, uploadDelay);
		}

		// model events
		// new file saved

	}, {
		key: '__fileData',
		value: function __fileData(data, opts) {

			// hide the pd patch and image displays if present, and the editor
			$('#pd-svg-parent, #img-display-parent, #editor, #audio-parent').css('display', 'none');

			if (!opts.fileType) opts.fileType = '0';

			if (opts.fileType.indexOf('image') !== -1) {

				// opening image file
				$('#img-display-parent, #img-display').css({
					'max-width': $('#editor').width() + 'px',
					'max-height': $('#editor').height() + 'px'
				});
				$('#img-display-parent').css('display', 'block');

				$('#img-display').prop('src', 'media/' + opts.fileName);

				// stop comparison with file on disk
				this.emit('compare-files', false);
			} else if (opts.fileType.indexOf('audio') !== -1) {

				//console.log('opening audio file');

				$('#audio-parent').css({
					'display': 'block',
					'max-width': $('#editor').width() + 'px',
					'max-height': $('#editor').height() + 'px'
				});

				$('#audio').prop('src', 'media/' + opts.fileName);

				// stop comparison with file on disk
				this.emit('compare-files', false);
			} else {

				if (opts.fileType === 'pd') {

					// we're opening a pd patch
					var timestamp = performance.now();
					this.emit('open-notification', {
						func: 'editor',
						timestamp: timestamp,
						text: 'This is a preview only. GUI objects will not be updated and you cannot edit the patch (yet).'
					});

					// render pd patch
					try {

						$('#pd-svg').html(pdfu.renderSvg(pdfu.parse(data), { svgFile: false })).css({
							'max-width': $('#editor').width() + 'px',
							'max-height': $('#editor').height() + 'px'
						});

						$('#pd-svg-parent').css({
							'display': 'block',
							'max-width': $('#editor').width() + 'px',
							'max-height': $('#editor').height() + 'px'
						});

						this.emit('close-notification', { timestamp: timestamp });
					} catch (e) {
						this.emit('close-notification', {
							timestamp: timestamp,
							text: 'Rendering pd patch failed!'
						});
						throw e;
					}

					// load an empty string into the editor
					// data = '';

					// start comparison with file on disk
					this.emit('compare-files', true);
				} else {

					// show the editor
					$('#editor').css('display', 'block');

					// stop comparison with file on disk
					this.emit('compare-files', false);
				}

				// block upload
				uploadBlocked = true;

				// put the file into the editor
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
		// readonly status has changed

	}, {
		key: '_readOnly',
		value: function _readOnly(status) {
			if (status) {
				this.editor.setReadOnly(true);
			} else {
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
				this.emit('clear-docs');
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

			this.emit('clear-docs');
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

},{"../parser":17,"./View":14}],8:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];

var askForOverwrite = true;
var uploadingFile = false;
var overwriteAction = '';
var fileQueue = [];
var forceRebuild = false;
var viewHiddenFiles = false;
var firstViewHiddenFiles = true;

var FileView = function (_View) {
	_inherits(FileView, _View);

	function FileView(className, models) {
		_classCallCheck(this, FileView);

		var _this = _possibleConstructorReturn(this, (FileView.__proto__ || Object.getPrototypeOf(FileView)).call(this, className, models));

		_this.listOfFiles = [];

		// hack to upload file
		$('#uploadFileInput').on('change', function (e) {
			for (var i = 0; i < e.target.files.length; i++) {
				_this.doFileUpload(e.target.files[i]);
			}
		});

		// drag and drop file upload on editor
		$('body').on('dragenter dragover drop', function (e) {
			e.stopPropagation();
			e.preventDefault();
			if (e.type === 'drop') {
				for (var i = 0; i < e.originalEvent.dataTransfer.files.length; i++) {
					_this.doFileUpload(e.originalEvent.dataTransfer.files[i]);
				}
			}
			return false;
		});

		return _this;
	}

	// UI events


	_createClass(FileView, [{
		key: 'buttonClicked',
		value: function buttonClicked($element, e) {
			var func = $element.data().func;
			if (func && this[func]) {
				this[func](func);
			}
		}
	}, {
		key: 'newFile',
		value: function newFile(func) {
			var _this2 = this;

			// build the popup content
			popup.title('Creating a new file');
			popup.subtitle('Enter the name of the new file. Only files with extensions .cpp, .c or .S will be compiled.');

			var form = [];
			form.push('<input type="text" placeholder="Enter the file name">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup-create">Create</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this2.emit('message', 'project-event', { func: func, newFile: sanitise(popup.find('input[type=text]').val()) });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'uploadFile',
		value: function uploadFile(func) {
			$('#uploadFileInput').trigger('click');
		}
	}, {
		key: 'renameFile',
		value: function renameFile(func) {
			var _this3 = this;

			// build the popup content
			popup.title('Renaming this file');
			popup.subtitle('Enter the new name of the file. Only files with extensions .cpp, .c or .S will be compiled.');

			var form = [];
			form.push('<input type="text" placeholder="Enter the new file name">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup-rename">Rename</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this3.emit('message', 'project-event', { func: func, newFile: sanitise(popup.find('input[type=text]').val()) });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'deleteFile',
		value: function deleteFile(func) {
			var _this4 = this;

			// build the popup content
			popup.title('Deleting file');
			popup.subtitle('Are you sure you wish to delete this file? This cannot be undone!');

			var form = [];
			form.push('<button type="submit" class="button popup-delete">Delete</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this4.emit('message', 'project-event', { func: func });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();

			popup.find('.popup-delete').trigger('focus');
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
			var _this5 = this;

			this.listOfFiles = files;

			var $files = $('#fileList');
			$files.empty();

			if (!files.length) return;

			var headers = [];
			var sources = [];
			var resources = [];
			var directories = [];

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = files[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var item = _step.value;


					// exclude hidden files
					if (!viewHiddenFiles && (item.name[0] === '.' || item.dir && item.name === 'build' || item.name === 'settings.json' || item.name === data.currentProject)) continue;

					if (item.dir) {

						directories.push(item);
					} else {

						var ext = item.name.split('.').pop();

						if (item.size < 1000000) {
							item.size = (item.size / 1000).toFixed(1) + 'kb';
						} else if (item.size >= 1000000 && item.size < 1000000000) {
							item.size = (item.size / 1000000).toFixed(1) + 'mb';
						}

						if (sourceIndeces.indexOf(ext) !== -1) {
							sources.push(item);
						} else if (headerIndeces.indexOf(ext) !== -1) {
							headers.push(item);
						} else if (item) {
							resources.push(item);
						}
					}
				}

				//console.log(headers, sources, resources, directories);
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

			headers.sort(function (a, b) {
				return a.name - b.name;
			});
			sources.sort(function (a, b) {
				return a.name - b.name;
			});
			resources.sort(function (a, b) {
				return a.name - b.name;
			});
			directories.sort(function (a, b) {
				return a.name - b.name;
			});

			//console.log(headers, sources, resources, directories);

			if (headers.length) {
				$('<li></li>').html('Headers:').appendTo($files);
			}
			for (var i = 0; i < headers.length; i++) {
				$('<li></li>').addClass('sourceFile').html(headers[i].name + '<span class="file-list-size">' + headers[i].size + '</span>').data('file', headers[i].name).appendTo($files).on('click', function (e) {
					return _this5.openFile(e);
				});
			}

			if (sources.length) {
				$('<li></li>').html('Sources:').appendTo($files);
			}
			for (var _i = 0; _i < sources.length; _i++) {
				$('<li></li>').addClass('sourceFile').html(sources[_i].name + '<span class="file-list-size">' + sources[_i].size + '</span>').data('file', sources[_i].name).appendTo($files).on('click', function (e) {
					return _this5.openFile(e);
				});
			}

			if (resources.length) {
				$('<li></li>').html('Resources:').appendTo($files);
			}
			for (var _i2 = 0; _i2 < resources.length; _i2++) {
				$('<li></li>').addClass('sourceFile').html(resources[_i2].name + '<span class="file-list-size">' + resources[_i2].size + '</span>').data('file', resources[_i2].name).appendTo($files).on('click', function (e) {
					return _this5.openFile(e);
				});
			}

			if (directories.length) {
				$('<li></li>').html('Directories:').appendTo($files);
			}
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = directories[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var dir = _step2.value;

					$files.append(this.subDirs(dir));
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

			if (data && data.fileName) this._fileName(data.fileName);
		}
	}, {
		key: '_fileName',
		value: function _fileName(file, data) {

			// select the opened file in the file manager tab
			$('.selectedFile').removeClass('selectedFile');

			var foundFile = false;
			$('#fileList li').each(function () {
				if ($(this).data('file') === file) {
					$(this).addClass('selectedFile');
					foundFile = true;
				}
			});

			if (data && data.currentProject) {
				// set download link
				$('#downloadFileLink').attr('href', '/download?project=' + data.currentProject + '&file=' + file);
			}
		}
	}, {
		key: 'subDirs',
		value: function subDirs(dir) {
			var _this6 = this;

			var ul = $('<ul></ul>').html(dir.name + ':');
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = dir.children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var child = _step3.value;

					if (!child.dir) {
						if (child.size < 1000000) {
							child.size = (child.size / 1000).toFixed(1) + 'kb';
						} else if (child.size >= 1000000 && child.size < 1000000000) {
							child.size = (child.size / 1000000).toFixed(1) + 'mb';
						}
						$('<li></li>').addClass('sourceFile').html(child.name + '<span class="file-list-size">' + child.size + '</span>').data('file', (dir.dirPath || dir.name) + '/' + child.name).appendTo(ul).on('click', function (e) {
							return _this6.openFile(e);
						});
					} else {
						child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
						ul.append(this.subDirs(child));
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

			return ul;
		}
	}, {
		key: 'doFileUpload',
		value: function doFileUpload(file) {
			var _this7 = this;

			//console.log('doFileUpload', file.name);

			if (uploadingFile) {
				//console.log('queueing upload', file.name);
				fileQueue.push(file);
				return;
			}

			var fileExists = false;
			var _iteratorNormalCompletion4 = true;
			var _didIteratorError4 = false;
			var _iteratorError4 = undefined;

			try {
				for (var _iterator4 = this.listOfFiles[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
					var item = _step4.value;

					if (item.name === sanitise(file.name)) fileExists = true;
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

			if (file.name === 'settings.json') fileExists = true;

			if (file.name === '_main.pd') forceRebuild = true;

			if (fileExists && askForOverwrite) {

				uploadingFile = true;

				// build the popup content
				popup.title('Overwriting file');
				popup.subtitle('The file ' + file.name + ' already exists in this project. Would you like to overwrite it?');

				var form = [];
				form.push('<input id="popup-remember-upload" type="checkbox">');
				form.push('<label for="popup-remember-upload">don\'t ask me again this session</label>');
				form.push('</br >');
				form.push('<button type="submit" class="button popup-upload">Overwrite</button>');
				form.push('<button type="button" class="button popup-cancel">Cancel</button>');

				popup.form.append(form.join('')).off('submit').on('submit', function (e) {
					e.preventDefault();
					if (popup.find('input[type=checkbox]').is(':checked')) {
						askForOverwrite = false;
						overwriteAction = 'upload';
					}
					_this7.actuallyDoFileUpload(file, true);
					popup.hide();
					uploadingFile = false;
					if (fileQueue.length) {
						_this7.doFileUpload(fileQueue.pop());
					}
				});

				popup.find('.popup-cancel').on('click', function () {
					if (popup.find('input[type=checkbox]').is(':checked')) {
						askForOverwrite = false;
						overwriteAction = 'reject';
					}
					popup.hide();
					uploadingFile = false;
					forceRebuild = false;
					if (fileQueue.length) _this7.doFileUpload(fileQueue.pop());
				});

				popup.show();

				popup.find('.popup-cancel').focus();
			} else if (fileExists && !askForOverwrite) {

				if (overwriteAction === 'upload') this.actuallyDoFileUpload(file, !askForOverwrite);else {
					//console.log('rejected', file.name);
					this.emit('file-rejected', file.name);
				}

				if (fileQueue.length) this.doFileUpload(fileQueue.pop());
			} else {

				this.actuallyDoFileUpload(file, !askForOverwrite);

				if (fileQueue.length) this.doFileUpload(fileQueue.pop());
			}
		}
	}, {
		key: 'actuallyDoFileUpload',
		value: function actuallyDoFileUpload(file, force) {
			var _this8 = this;

			//console.log('actuallyDoFileUpload', file.name, force);
			var reader = new FileReader();
			reader.onload = function (ev) {
				return _this8.emit('message', 'project-event', { func: 'uploadFile', newFile: sanitise(file.name), fileData: ev.target.result, force: force });
			};
			reader.readAsArrayBuffer(file);
			if (forceRebuild && !fileQueue.length) {
				forceRebuild = false;
				this.emit('force-rebuild');
			}
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

module.exports = FileView;

},{"../popup":18,"../utils":19,"./View":14}],9:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');

var GitView = function (_View) {
	_inherits(GitView, _View);

	function GitView(className, models, settings) {
		_classCallCheck(this, GitView);

		var _this = _possibleConstructorReturn(this, (GitView.__proto__ || Object.getPrototypeOf(GitView)).call(this, className, models, settings));

		_this.$form = $('#gitForm');
		_this.$input = $('#gitInput');

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
			popup.title('Committing to the project repository');
			popup.subtitle('Enter a commit message');

			var form = [];
			form.push('<input type="text" placeholder="Enter your commit message">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup-commit">Commit</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this2.emit('git-event', { func: 'command', command: 'commit -am "' + popup.find('input[type=text]').val() + '"' });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'branch',
		value: function branch() {
			var _this3 = this;

			// build the popup content
			popup.title('Creating a new branch');
			popup.subtitle('Enter a name for the branch');

			var form = [];
			form.push('<input type="text" placeholder="Enter your new branch name">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup-create">Create</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this3.emit('git-event', { func: 'command', command: 'checkout -b ' + popup.find('input[type=text]').val() });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'discardChanges',
		value: function discardChanges() {
			var _this4 = this;

			// build the popup content
			popup.title('Discarding changes');
			popup.subtitle('You are about to discard all changes made in your project since the last commit. The command used is "git checkout -- .". Are you sure you wish to continue? This cannot be undone.');

			var form = [];
			form.push('<button type="submit" class="button popup-continue">Continue</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this4.emit('git-event', { func: 'command', command: 'checkout -- .' });
				popup.hide();
			});

			popup.find('.popup-create').on('click', popup.hide);

			popup.show();

			popup.find('.popup-continue').trigger('focus');
		}
	}, {
		key: '_repoExists',
		value: function _repoExists(exists) {
			if (exists) {
				$('#repo').css('display', 'block');
				$('#noRepo').css('display', 'none');
			} else {
				$('#repo').css('display', 'none');
				$('#noRepo').css('display', 'block');
			}
		}
	}, {
		key: '__commits',
		value: function __commits(commits, git) {

			var commits = commits.split('\n');
			var current = git.currentCommit.trim();
			var branches = git.branches.split('\n');

			// fill commits menu
			var $commits = $('#commits');
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
			var $branches = $('#branches');
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

},{"../popup":18,"./View":14}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');
var sanitise = require('../utils').sanitise;

var ProjectView = function (_View) {
	_inherits(ProjectView, _View);

	function ProjectView(className, models) {
		_classCallCheck(this, ProjectView);

		//this.exampleChanged = false;
		var _this = _possibleConstructorReturn(this, (ProjectView.__proto__ || Object.getPrototypeOf(ProjectView)).call(this, className, models));

		_this.on('example-changed', function () {
			return _this.exampleChanged = true;
		});
		return _this;
	}

	// UI events


	_createClass(ProjectView, [{
		key: 'selectChanged',
		value: function selectChanged($element, e) {
			var _this2 = this;

			if (this.exampleChanged) {
				this.exampleChanged = false;
				popup.exampleChanged(function () {
					_this2.emit('message', 'project-event', { func: $element.data().func, currentProject: $element.val() });
				}, undefined, 0, function () {
					$element.find('option').filter(':selected').attr('selected', '');
					$element.val($('#projects > option:first').val());
					_this2.exampleChanged = true;
				});
				return;
			}

			this.emit('message', 'project-event', { func: $element.data().func, currentProject: $element.val() });
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
			var _this3 = this;

			if (this.exampleChanged) {
				this.exampleChanged = false;
				popup.exampleChanged(this.newProject.bind(this), func, 500, function () {
					return _this3.exampleChanged = true;
				});
				return;
			}

			// build the popup content
			popup.title('Creating a new project');
			popup.subtitle('Choose what kind of project you would like to create, and enter the name of your new project');

			var form = [];
			form.push('<input id="popup-C" type="radio" name="project-type" data-type="C" checked>');
			form.push('<label for="popup-C">C++</label>');
			form.push('</br>');
			form.push('<input id="popup-PD" type="radio" name="project-type" data-type="PD">');
			form.push('<label for="popup-PD">Pure Data</label>');
			form.push('</br>');
			form.push('<input id="popup-SC" type="radio" name="project-type" data-type="SC">');
			form.push('<label for="popup-SC">SuperCollider</label>');
			form.push('</br>');
			form.push('<input type="text" placeholder="Enter your project name">');
			form.push('</br>');
			form.push('<button type="submit" class="button popup-save">Create</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this3.emit('message', 'project-event', {
					func: func,
					newProject: sanitise(popup.find('input[type=text]').val()),
					projectType: popup.find('input[type=radio]:checked').data('type')
				});
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'saveAs',
		value: function saveAs(func) {
			var _this4 = this;

			// build the popup content
			popup.title('Saving project');
			popup.subtitle('Enter the name of your project');

			var form = [];
			form.push('<input type="text" placeholder="Enter the new project name">');
			form.push('</br >');
			form.push('<button type="submit" class="button popup-save">Save</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this4.emit('message', 'project-event', { func: func, newProject: sanitise(popup.find('input[type=text]').val()) });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
		}
	}, {
		key: 'deleteProject',
		value: function deleteProject(func) {
			var _this5 = this;

			// build the popup content
			popup.title('Deleting project');
			popup.subtitle('Are you sure you wish to delete this project? This cannot be undone!');

			var form = [];
			form.push('<button type="submit" class="button popup-delete">Delete</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this5.emit('message', 'project-event', { func: func });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();

			popup.find('.popup-delete').trigger('focus');
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

			var $projects = $('#projects');
			$projects.empty();

			// add an empty option to menu and select it
			var opt = $('<option></option>').attr({ 'value': '', 'selected': 'selected' }).html('--Projects--').appendTo($projects);

			// fill project menu with projects
			for (var i = 0; i < projects.length; i++) {
				if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.') {
					var opt = $('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
				}
			}

			if (data && data.currentProject) this._currentProject(data.currentProject);
		}
	}, {
		key: '_exampleList',
		value: function _exampleList(examplesDir) {
			var _this6 = this;

			var $examples = $('#examples');
			$examples.empty();

			if (!examplesDir.length) return;

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				var _loop = function _loop() {
					var item = _step.value;

					var ul = $('<ul></ul>').html(item.name + ':');
					var _iteratorNormalCompletion2 = true;
					var _didIteratorError2 = false;
					var _iteratorError2 = undefined;

					try {
						var _loop2 = function _loop2() {
							var child = _step2.value;

							if (child && child.length && child[0] === '.') return 'continue';
							$('<li></li>').addClass('sourceFile').html(child).appendTo(ul).on('click', function (e) {

								if (_this6.exampleChanged) {
									_this6.exampleChanged = false;
									popup.exampleChanged(function () {
										_this6.emit('message', 'project-event', {
											func: 'openExample',
											currentProject: item.name + '/' + child
										});
										$('.selectedExample').removeClass('selectedExample');
										$(e.target).addClass('selectedExample');
									}, undefined, 0, function () {
										return _this6.exampleChanged = true;
									});
									return;
								}

								_this6.emit('message', 'project-event', {
									func: 'openExample',
									currentProject: item.name + '/' + child
								});
								$('.selectedExample').removeClass('selectedExample');
								$(e.target).addClass('selectedExample');
							});
						};

						for (var _iterator2 = item.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							var _ret2 = _loop2();

							if (_ret2 === 'continue') continue;
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

					ul.appendTo($examples);
				};

				for (var _iterator = examplesDir[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
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
		key: '_currentProject',
		value: function _currentProject(project) {

			// unselect currently selected project
			$('#projects').find('option').filter(':selected').attr('selected', '');

			if (project === 'exampleTempProject') {
				// select no project
				$('#projects').val($('#projects > option:first').val());
			} else {
				// select new project
				//$('#projects option[value="'+project+'"]').attr('selected', 'selected');
				$('#projects').val($('#projects > option[value="' + project + '"]').val());
				// unselect currently selected example
				$('.selectedExample').removeClass('selectedExample');
			}

			// set download link
			$('#downloadLink').attr('href', '/download?project=' + project);
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
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = dir.children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var _child = _step3.value;

					if (!_child.dir) $('<li></li>').addClass('sourceFile').html(_child.name).data('file', (dir.dirPath || dir.name) + '/' + _child.name).appendTo(ul);else {
						_child.dirPath = (dir.dirPath || dir.name) + '/' + _child.name;
						ul.append(this.subDirs(_child));
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

			return ul;
		}
	}]);

	return ProjectView;
}(View);

module.exports = ProjectView;

},{"../popup":18,"../utils":19,"./View":14}],11:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');
var popup = require('../popup');

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
				return $(this).data(prop) == val;
			});
		};

		$('#runOnBoot').on('change', function () {
			if ($('#runOnBoot').val() && $('#runOnBoot').val() !== '--select--') _this.emit('run-on-boot', $('#runOnBoot').val());
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
			var func = $element.data().func;
			if (func && this[func]) {
				this[func](func);
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
			if (type === 'number' || type === 'text') {
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

			// build the popup content
			popup.title('Restoring default project settings');
			popup.subtitle('Are you sure you wish to continue? Your current project settings will be lost!');

			var form = [];
			form.push('<button type="submit" class="button popup-continue">Continue</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this2.emit('project-settings', { func: func });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();

			popup.find('.popup-continue').trigger('focus');
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

			// build the popup content
			popup.title('Restoring default IDE settings');
			popup.subtitle('Are you sure you wish to continue? Your current IDE settings will be lost!');

			var form = [];
			form.push('<button type="submit" class="button popup-continue">Continue</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this3.emit('IDE-settings', { func: func });
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();

			popup.find('.popup-continue').trigger('focus');
		}
	}, {
		key: 'shutdownBBB',
		value: function shutdownBBB() {
			var _this4 = this;

			// build the popup content
			popup.title('Shutting down Bela');
			popup.subtitle('Are you sure you wish to continue? The BeagleBone will shutdown gracefully, and the IDE will disconnect.');

			var form = [];
			form.push('<button type="submit" class="button popup-continue">Continue</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				_this4.emit('halt');
				popup.hide();
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();

			popup.find('.popup-continue').trigger('focus');
		}
	}, {
		key: 'aboutPopup',
		value: function aboutPopup() {

			// build the popup content
			popup.title('About Bela');
			popup.subtitle('You are using Bela Version 0.3.0, October 2017. Bela is an open source project, and is a product of the Augmented Instruments Laboratory at Queen Mary University of London, and Augmented Instruments Ltd. For more information, visit http://bela.io');
			var form = [];
			form.push('<button type="submit" class="button popup-continue">Close</button>');

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {
				e.preventDefault();
				popup.hide();
			});

			popup.show();

			popup.find('.popup-continue').trigger('focus');
		}
	}, {
		key: 'updateBela',
		value: function updateBela() {
			var _this5 = this;

			// build the popup content
			popup.title('Updating Bela');
			popup.subtitle('Please select the update zip archive');

			var form = [];
			form.push('<input id="popup-update-file" type="file">');
			form.push('</br>');
			form.push('<button type="submit" class="button popup-upload">Upload</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');

			/*popup.form.prop({
   	action	: 'updates',
   	method	: 'get',
   	enctype	: 'multipart/form-data'
   });*/

			popup.form.append(form.join('')).off('submit').on('submit', function (e) {

				//console.log('submitted', e);

				e.preventDefault();

				var file = popup.find('input[type=file]').prop('files')[0];

				//console.log('input', popup.find('input[type=file]'));
				//console.log('file', file);

				if (file) {

					_this5.emit('warning', 'Beginning the update - this may take several minutes');
					_this5.emit('warning', 'The browser may become unresponsive and will temporarily disconnect');
					_this5.emit('warning', 'Do not use the IDE during the update process!');

					popup.hide('keep overlay');

					var reader = new FileReader();
					reader.onload = function (ev) {
						return _this5.emit('upload-update', { name: file.name, file: ev.target.result });
					};
					reader.readAsArrayBuffer(file);
				} else {

					_this5.emit('warning', 'not a valid update zip archive');
					popup.hide();
				}
			});

			popup.find('.popup-cancel').on('click', popup.hide);

			popup.show();
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
					if (data[key] == 1) $('#audioExpanderTable').css('display', 'table');else $('#audioExpanderTable').css('display', 'none');
				}

				var el = this.$elements.filterByData('key', key);

				// set the input value
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

			var $projects = $('#runOnBoot');
			$projects.empty();

			// add an empty option to menu and select it
			$('<option></option>').html('--select--').appendTo($projects);

			// add a 'none' option
			$('<option></option>').attr('value', 'none').html('none').appendTo($projects);

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
				$('#audioExpanderTable').css('display', 'table');
				this.setCLArg('setCLArg', key, val);
			} else {
				$('#audioExpanderTable').css('display', 'none');
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
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = channels[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var channel = _step.value;

							if (channel == $this.data('channel')) checked = true;
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

					$this.prop('checked', checked);
				}
			});
		}
	}]);

	return SettingsView;
}(View);

module.exports = SettingsView;

},{"../popup":18,"./View":14}],12:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

// private variables
var _tabsOpen = false;

var TabView = function (_View) {
	_inherits(TabView, _View);

	function TabView() {
		_classCallCheck(this, TabView);

		// open/close tabs 
		var _this = _possibleConstructorReturn(this, (TabView.__proto__ || Object.getPrototypeOf(TabView)).call(this, 'tab'));

		$('#flexit').on('click', function () {
			if (_tabsOpen) {
				_this.closeTabs();
			} else {
				_this.openTabs();
			}
		});

		$('.tab > label').on('click', function (e) {
			if (!_tabsOpen) {
				if ($(e.currentTarget).prop('id') === 'tab-0' && $('[type=radio]:checked ~ label').prop('id') === 'tab-0') $('#file-explorer').parent().trigger('click');

				_this.openTabs();
				e.stopPropagation();
			}
		});

		// golden layout
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
					type: 'row',
					content: [{
						type: 'component',
						componentName: 'Editor'
					}]
				}, {
					type: 'component',
					componentName: 'Console',
					height: 25
				}]
			}]
		});
		layout.registerComponent('Editor', function (container, componentState) {
			container.getElement().append($('#innerContent'));
		});
		layout.registerComponent('Console', function (container, componentState) {
			container.getElement().append($('#beaglert-console'));
		});

		layout.init();
		layout.on('initialised', function () {
			return _this.emit('change');
		});
		layout.on('stateChanged', function () {
			return _this.emit('change');
		});

		$(window).on('resize', function () {
			if (_tabsOpen) {
				_this.openTabs();
			} else {
				_this.closeTabs();
			}
		});

		_this.on('open-tab', function (id) {
			return $('#' + id).siblings('label').trigger('click');
		});
		_this.on('toggle', function () {
			if (_tabsOpen) _this.closeTabs();else _this.openTabs();
		});

		return _this;
	}

	_createClass(TabView, [{
		key: 'openTabs',
		value: function openTabs() {
			$('#editor').css('right', '500px');
			$('#top-line').css('margin-right', '500px');
			$('#right').css('left', window.innerWidth - 500 + 'px');
			_tabsOpen = true;
			this.emit('change');
			$('#tab-0').addClass('open');

			// fix pd patch
			$('#pd-svg-parent').css({
				'max-width': $('#editor').width() + 'px',
				'max-height': $('#editor').height() + 'px'
			});
		}
	}, {
		key: 'closeTabs',
		value: function closeTabs() {
			$('#editor').css('right', '60px');
			$('#top-line').css('margin-right', '60px');
			$('#right').css('left', window.innerWidth - 60 + 'px');
			_tabsOpen = false;
			this.emit('change');
			$('#tab-0').removeClass('open');

			// fix pd patch
			$('#pd-svg-parent').css({
				'max-width': $('#editor').width() + 'px',
				'max-height': $('#editor').height() + 'px'
			});
		}
	}, {
		key: 'getOpenTab',
		value: function getOpenTab() {
			if (!_tabsOpen) return false;
			return $('[type=radio]:checked ~ label').prop('for');
		}
	}]);

	return TabView;
}(View);

module.exports = new TabView();

},{"./View":14}],13:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = require('./View');

// ohhhhh i am a comment

var modeswitches = 0;
var NORMAL_MSW = 1;
var nameIndex, CPUIndex, rootName, IRQName;

var ToolbarView = function (_View) {
	_inherits(ToolbarView, _View);

	function ToolbarView(className, models) {
		_classCallCheck(this, ToolbarView);

		var _this = _possibleConstructorReturn(this, (ToolbarView.__proto__ || Object.getPrototypeOf(ToolbarView)).call(this, className, models));

		_this.$elements.on('click', function (e) {
			return _this.buttonClicked($(e.currentTarget), e);
		});

		_this.on('disconnected', function () {
			$('#run').removeClass('running-button').removeClass('building-button');
		});

		$('#run').mouseover(function () {
			$('#control-text-1').html('<p>Run</p>');
		}).mouseout(function () {
			$('#control-text-1').html('');
		});

		$('#stop').mouseover(function () {
			$('#control-text-1').html('<p>Stop</p>');
		}).mouseout(function () {
			$('#control-text-1').html('');
		});

		$('#new-tab').mouseover(function () {
			$('#control-text-2').html('<p>New Tab</p>');
		}).mouseout(function () {
			$('#control-text-2').html('');
		});

		$('#download').mouseover(function () {
			$('#control-text-2').html('<p>Download</p>');
		}).mouseout(function () {
			$('#control-text-2').html('');
		});

		$('#console').mouseover(function () {
			$('#control-text-3').html('<p>Clear console</p>');
		}).mouseout(function () {
			$('#control-text-3').html('');
		});

		$('#scope').mouseover(function () {
			$('#control-text-3').html('<p>Open scope</p>');
		}).mouseout(function () {
			$('#control-text-3').html('');
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
				$('#run').removeClass('building-button').addClass('running-button');
			} else {
				$('#run').removeClass('running-button');
				$('#bela-cpu').html('CPU: --').css('color', 'black');
				$('#msw-cpu').html('MSW: --').css('color', 'black');
				modeswitches = 0;
			}
		}
	}, {
		key: '__building',
		value: function __building(status) {
			if (status) {
				$('#run').removeClass('running-button').addClass('building-button');
			} else {
				$('#run').removeClass('building-button');
			}
		}
	}, {
		key: '__checkingSyntax',
		value: function __checkingSyntax(status) {
			if (status) {
				$('#status').css('background', 'url("images/icons/status_wait.png")').prop('title', 'checking syntax...');
			} else {
				//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
			}
		}
	}, {
		key: '__allErrors',
		value: function __allErrors(errors) {
			//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
			if (errors.length) {
				$('#status').css('background', 'url("images/icons/status_stop.png")').prop('title', 'syntax errors found');
			} else {
				$('#status').css('background', 'url("images/icons/status_ok.png")').prop('title', 'syntax check clear');
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
		key: '_CPU',
		value: function _CPU(data) {
			//	var ide = (data.syntaxCheckProcess || 0) + (data.buildProcess || 0) + (data.node || 0);
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

			//	$('#ide-cpu').html('IDE: '+(ide*rootCPU).toFixed(1)+'%');
			$('#bela-cpu').html('CPU: ' + (bela ? bela.toFixed(1) + '%' : '--'));

			//	if (bela && (ide*rootCPU + bela) > 80){
			if (bela && bela > 80) {
				$('#bela-cpu').css('color', 'red');
			} else {
				$('#bela-cpu').css('color', 'black');
			}
		}
	}, {
		key: '_cpuMonitoring',
		value: function _cpuMonitoring(value) {
			if (parseInt(value)) $('#bela-cpu').css('visibility', 'visible');else $('#bela-cpu').css('visibility', 'hidden');
		}
	}, {
		key: 'mode_switches',
		value: function mode_switches(value) {
			$('#msw-cpu').html('MSW: ' + value);
			if (value > modeswitches) {
				this.emit('mode-switch-warning', value);
				$('#msw-cpu').css('color', 'red');
			}
			modeswitches = value;
		}
	}]);

	return ToolbarView;
}(View);

module.exports = ToolbarView;

},{"./View":14}],14:[function(require,module,exports){
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

var EventEmitter = require('events').EventEmitter;
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

		_this.$element = $('#beaglert-consoleWrapper');
		_this.parent = document.getElementById('beaglert-console');
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
			$('<span></span>').html(text).appendTo(el);

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
				this.warn('Too many messages have been printed to the console too quickly. Reduce your printing frequency');
			} else {
				this.checkScroll();
				var msgs = text.split('\n');
				var str = '';
				for (var i = 0; i < msgs.length; i++) {
					if (msgs[i] !== '' && msgs[i] !== ' ') {
						//this.print(msgs[i], css || 'log');
						str += '<div class="beaglert-console-' + (css || 'log') + '"><span>' + msgs[i] + '</span></div>';
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
					this.print(msgs[i], 'warning', id); /*, function(){ 
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

					span = $('<span></span>').html(err.text.split('\n').join(' ') + ', line: ' + (err.row + 1)).appendTo(div);

					// add a button to copy the contents to the clipboard

					copyButton = $('<div></div>').addClass('clipboardButton').appendTo(div);
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
						span.on('click', function () {
							return _this2.emit('open-file', err.file, { line: err.row + 1, column: err.column - 1 });
						});
					}
				};

				for (var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var div;
					var span;
					var copyButton;
					var clipboard;

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
		value: function reject(message, id, persist) {
			var el = document.getElementById(id);
			//if (!el) el = this.notify(message, id);
			var $el = $(el);
			$el.appendTo(this.$element); //.removeAttr('id');
			$el.html($el.html() + message);
			$el.addClass('beaglert-console-rejectnotification');
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
				$("#beaglert-consoleWrapper > div:lt(" + parseInt(number) + ")").remove();
				numElements -= parseInt(number);
			} else {
				$('#beaglert-consoleWrapper > div').remove();
				numElements = 0;
			}
		}
	}, {
		key: 'checkScroll',
		value: function checkScroll() {
			if (this.parent.scrollHeight - this.parent.scrollTop === this.parent.clientHeight) {
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

},{"events":1}],16:[function(require,module,exports){
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
}var editor;

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
		//console.log(highlights);
		// console.log(contextName, highlights[contextName]);
		if (!contextName) return;

		// context
		var contextAutocompleteWords = [];
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = _highlights[contextName][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var item = _step.value;

				contextAutocompleteWords.push(contextName + '->' + item.name);
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

		var _iteratorNormalCompletion3 = true;
		var _didIteratorError3 = false;
		var _iteratorError3 = undefined;

		try {
			for (var _iterator3 = _highlights['typerefs'][Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
				var typeref = _step3.value;
				var _iteratorNormalCompletion5 = true;
				var _didIteratorError5 = false;
				var _iteratorError5 = undefined;

				try {
					for (var _iterator5 = _highlights[typeref.id.name][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
						var _item = _step5.value;

						classAutocompleteWords.push(typeref.name + '.' + _item.name);
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
		var _iteratorNormalCompletion4 = true;
		var _didIteratorError4 = false;
		var _iteratorError4 = undefined;

		try {
			for (var _iterator4 = _highlights['utility'][Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
				var utility = _step4.value;

				utilityAutocompleteWords.push(utility.name);
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

var _overlay = $('#overlay');
var parent = $('#popup');
var content = $('#popup-content');
var titleEl = parent.find('h1');
var subEl = parent.find('p');
var _formEl = parent.find('form');

var popup = {
	show: function show() {
		_overlay.addClass('active');
		parent.addClass('active');
		content.find('input[type=text]').first().trigger('focus');
	},
	hide: function hide(keepOverlay) {
		if (keepOverlay !== 'keep overlay') _overlay.removeClass('active');
		parent.removeClass('active');
		titleEl.empty();
		subEl.empty();
		_formEl.empty();
	},
	overlay: function overlay() {
		_overlay.toggleClass('active');
	},


	find: function find(selector) {
		return content.find(selector);
	},

	title: function title(text) {
		return titleEl.text(text);
	},
	subtitle: function subtitle(text) {
		return subEl.text(text);
	},
	formEl: function formEl(html) {
		return _formEl.html(html);
	},

	append: function append(child) {
		return content.append(child);
	},

	form: _formEl,

	exampleChanged: example

};

module.exports = popup;

function example(cb, arg, delay, cancelCb) {

	// build the popup content
	popup.title('Save your changes?');
	popup.subtitle('You have made changes to an example project. If you continue, your changes will be lost. To keep your changes, click cancel and then Save As in the project manager tab');

	var form = [];
	form.push('<button type="submit" class="button popup-continue">Continue</button>');
	form.push('<button type="button" class="button popup-cancel">Cancel</button>');

	popup.form.append(form.join('')).off('submit').on('submit', function (e) {
		e.preventDefault();
		setTimeout(function () {
			cb(arg);
		}, delay);
		popup.hide();
	});

	popup.find('.popup-cancel').on('click', function () {
		popup.hide();
		if (cancelCb) cancelCb();
	});

	popup.show();

	popup.find('.popup-continue').trigger('focus');
}

},{}],19:[function(require,module,exports){
'use strict';

// replace most non alpha-numeric chars with '_'
function sanitise(name) {
	return name.replace(/[^a-zA-Z0-9\.\-\+\%\_\/~]/g, '_');
}

module.exports.sanitise = sanitise;

},{}]},{},[16])


//# sourceMappingURL=bundle.js.map
