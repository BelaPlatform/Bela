"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

(function e(t, n, r) {
	function s(o, u) {
		if (!n[o]) {
			if (!t[o]) {
				var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw f.code = "MODULE_NOT_FOUND", f;
			}var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
				var n = t[o][1][e];return s(n ? n : e);
			}, l, l.exports, e, t, n, r);
		}return n[o].exports;
	}var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
		s(r[o]);
	}return s;
})({ 1: [function (require, module, exports) {
		// IDE controller
		module.exports = {};

		var Model = require('./Models/Model');

		// set up models
		var models = {};
		models.project = new Model();
		models.settings = new Model();
		models.status = new Model();
		models.error = new Model();
		models.debug = new Model();
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
			socket.emit('sh-command', 'halt');
			consoleView.emit('warn', 'Shutting down...');
		});
		settingsView.on('warning', function (text) {
			return consoleView.emit('warn', text);
		});
		settingsView.on('upload-update', function (data) {
			return socket.emit('upload-update', data);
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
		var fileView = new (require('./Views/FileView'))('fileManager', [models.project]);
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

		// editor view
		var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings, models.debug], models.settings);
		editorView.on('upload', function (fileData) {
			socket.emit('process-event', {
				event: 'upload',
				currentProject: models.project.getKey('currentProject'),
				newFile: models.project.getKey('fileName'),
				fileData: fileData,
				checkSyntax: parseInt(models.settings.getKey('liveSyntaxChecking'))
			});
		});
		editorView.on('breakpoint', function (line) {
			var breakpoints = models.project.getKey('breakpoints');
			for (var i = 0; i < breakpoints.length; i++) {
				if (breakpoints[i].line === line && breakpoints[i].file === models.project.getKey('fileName')) {
					socket.emit('debugger-event', 'removeBreakpoint', breakpoints[i]);
					models.project.spliceFromKey('breakpoints', i);
					return;
				}
			}
			var newBreakpoint = {
				line: line,
				file: models.project.getKey('fileName')
			};
			socket.emit('debugger-event', 'addBreakpoint', newBreakpoint);
			models.project.pushIntoKey('breakpoints', newBreakpoint);
			//console.log('after', breakpoints);
			//models.project.setKey('breakpoints', breakpoints);
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

		// toolbar view
		var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings, models.debug]);
		toolbarView.on('process-event', function (event) {
			var breakpoints;
			if (models.debug.getKey('debugMode')) breakpoints = models.project.getKey('breakpoints');
			var data = {
				event: event,
				currentProject: models.project.getKey('currentProject'),
				debug: models.debug.getKey('debugMode'),
				breakpoints: breakpoints
			};
			//data.timestamp = performance.now();
			if (event === 'stop') consoleView.emit('openProcessNotification', 'Stopping Bela...');
			socket.emit('process-event', data);
		});
		toolbarView.on('clear-console', function () {
			return consoleView.emit('clear');
		});

		// console view
		var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings, models.debug], models.settings);
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

		// debugger view
		var debugView = new (require('./Views/DebugView'))('debugger', [models.debug, models.settings, models.project]);
		debugView.on('debugger-event', function (func) {
			return socket.emit('debugger-event', func);
		});
		debugView.on('debug-mode', function (status) {
			return models.debug.setKey('debugMode', status);
		});

		// documentation view
		var documentationView = new (require('./Views/DocumentationView'))();

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

		// refresh files
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

			//console.log(data);
			var timestamp = performance.now();
			socket.emit('project-event', { func: 'openProject', currentProject: data[2].project, timestamp: timestamp });
			consoleView.emit('openNotification', { func: 'init', timestamp: timestamp });

			models.project.setData({ projectList: data[0], exampleList: data[1], currentProject: data[2].project });
			models.settings.setData(data[2]);

			$('#runOnBoot').val(data[3]);

			models.status.setData(data[4]);

			//models.project.print();
			//models.settings.print();

			socket.emit('set-time', new Date().toString());

			documentationView.emit('init');
		});

		// project events
		socket.on('project-data', function (data) {
			var debug;
			if (data.debug) {
				debug = data.debug;
				data.debug = undefined;
			}
			consoleView.emit('closeNotification', data);
			models.project.setData(data);
			if (debug) {
				models.debug.setData(debug);
			}
			if (data.gitData) models.git.setData(data.gitData);
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
				var currentFilenameFound = false;
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = list[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var item = _step.value;

						if (item.name === models.project.getKey('fileName')) {
							currentFilenameFound = true;
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

				if (!currentFilenameFound) {
					// this file has just been deleted
					socket.emit('project-event', { func: 'openProject', currentProject: project });
				}
				models.project.setKey('fileList', list);
			}
		});
		socket.on('file-changed', function (project, fileName) {
			if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')) {
				console.log('file changed!');
				models.project.setKey('readOnly', true);
				models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
				//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
			}
		});

		socket.on('status', function (status, project) {
			if (project === models.project.getKey('currentProject') || project === undefined) {
				models.status.setData(status);
				//console.log('status', status);
			}
		});

		socket.on('project-settings-data', function (project, settings) {
			//console.log('project-settings-data', settings);
			if (project === models.project.getKey('currentProject')) models.project.setData(settings);
		});
		socket.on('IDE-settings-data', function (settings) {
			return models.settings.setData(settings);
		});

		socket.on('cpu-usage', function (data) {
			return models.status.setKey('CPU', data);
		});

		socket.on('disconnect', function () {
			consoleView.disconnect();
			toolbarView.emit('disconnected');
			models.project.setKey('readOnly', true);
		});

		socket.on('debugger-data', function (data) {
			//console.log('b', data.debugProject, models.project.getKey('currentProject'), data.debugFile, models.project.getKey('fileName'));
			if (data.debugProject === undefined || data.debugProject === models.project.getKey('currentProject')) {
				//(data.debugFile === undefined || data.debugFile === models.project.getKey('fileName'))){
				var debugFile = data.debugFile;
				if (debugFile && debugFile !== models.project.getKey('fileName')) {
					//console.log(debugFile);
					var newData = {
						func: 'openFile',
						currentProject: models.project.getKey('currentProject'),
						fileName: models.project.getKey('fileName'),
						newFile: debugFile,
						timestamp: performance.now(),
						debug: { debugLine: data.debugLine, debugFile: debugFile }
					};
					consoleView.emit('openNotification', newData);
					socket.emit('project-event', newData);
				} else {
					//console.log(data);
					models.debug.setData(data);
				}
			}
		});
		socket.on('debugger-variables', function (project, variables) {
			if (project === models.project.getKey('currentProject')) {
				models.debug.setKey('variables', variables);
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

		// model events
		// build errors
		models.status.on('set', function (data, changedKeys) {
			if (changedKeys.indexOf('syntaxError') !== -1) {
				parseErrors(data.syntaxError);
			}
		});
		// debug mode
		models.debug.on('change', function (data, changedKeys) {
			if (changedKeys.indexOf('debugMode') !== -1) {
				//console.log(!data.debugMode, models.debug.getKey('debugRunning'));
				if (!data.debugMode && models.debug.getKey('debugRunning')) socket.emit('debugger-event', 'stop');
				var data = {
					func: 'cleanProject',
					currentProject: models.project.getKey('currentProject'),
					timestamp: performance.now()
				};
				consoleView.emit('openNotification', data);
				socket.emit('project-event', data);
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
							fileName: e.state.file,
							func: 'openFile',
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
						//console.log(str);
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
								text: str.slice(4).join(':').slice(1) + '\ncolumn: ' + str[2],
								type: "warning"
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
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = errors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var err = _step2.value;

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

			models.error.setKey('allErrors', errors);
			models.error.setKey('currentFileErrors', currentFileErrors);
			models.error.setKey('otherFileErrors', otherFileErrors);

			models.error.setKey('verboseSyntaxError', data);
		}

		function getDateString() {

			var str = '';

			// get browser's system's time
			var date = new Date();

			// format into string suitable for linux date command
			var month = date.getMonth() + 1;
			if (month < 10) {
				str += '0' + month;
			} else {
				str += month;
			}

			var day = date.getDate();
			if (day < 10) {
				str += '0' + day;
			} else {
				str += day;
			}

			var hour = date.getHours();
			if (hour < 10) {
				str += '0' + hour;
			} else {
				str += hour;
			}

			var minutes = date.getMinutes();
			if (minutes < 10) {
				str += '0' + minutes;
			} else {
				str += minutes;
			}

			str += date.getFullYear();

			str += '.';

			var seconds = date.getSeconds();
			if (seconds < 10) {
				str += '0' + seconds;
			} else {
				str += seconds;
			}

			return str;
		}
	}, { "./Models/Model": 2, "./Views/ConsoleView": 3, "./Views/DebugView": 4, "./Views/DocumentationView": 5, "./Views/EditorView": 6, "./Views/FileView": 7, "./Views/GitView": 8, "./Views/ProjectView": 9, "./Views/SettingsView": 10, "./Views/TabView": 11, "./Views/ToolbarView": 12 }], 2: [function (require, module, exports) {
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
				key: "getKey",
				value: function getKey(key) {
					return this._getData()[key];
				}
			}, {
				key: "setData",
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
				key: "setKey",
				value: function setKey(key, value) {
					if (!_equals(value, this._getData()[key], false)) {
						this._getData()[key] = value;
						//console.log('changed setkey');
						this.emit('change', this._getData(), [key]);
					}
					this.emit('set', this._getData(), [key]);
				}
			}, {
				key: "pushIntoKey",
				value: function pushIntoKey(key, value) {
					this._getData()[key].push(value);
					this.emit('change', this._getData(), [key]);
					this.emit('set', this._getData(), [key]);
				}
			}, {
				key: "spliceFromKey",
				value: function spliceFromKey(key, index) {
					this._getData()[key].splice(index, 1);
					this.emit('change', this._getData(), [key]);
					this.emit('set', this._getData(), [key]);
				}
			}, {
				key: "print",
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
	}, { "events": 17 }], 3: [function (require, module, exports) {
		'use strict';

		var View = require('./View');
		var _console = require('../console');

		var verboseDebugOutput = false;

		var shellCWD = '~';

		var ConsoleView = function (_View) {
			_inherits(ConsoleView, _View);

			function ConsoleView(className, models, settings) {
				_classCallCheck(this, ConsoleView);

				var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(ConsoleView).call(this, className, models, settings));

				_this2.on('clear', function () {
					return _console.clear();
				});
				_console.on('focus', function (focus) {
					return _this2.emit('focus', focus);
				});
				_console.on('open-file', function (fileName, focus) {
					return _this2.emit('open-file', fileName, focus);
				});

				_this2.on('openNotification', _this2.openNotification);
				_this2.on('closeNotification', _this2.closeNotification);
				_this2.on('openProcessNotification', _this2.openProcessNotification);

				_this2.on('log', function (text, css) {
					return _console.log(text, css);
				});
				_this2.on('warn', function (warning, id) {
					console.log(warning);
					_console.warn(warning, id);
				});

				_this2.form = document.getElementById('beaglert-consoleForm');
				_this2.input = document.getElementById('beaglert-consoleInput');

				// console command line input events
				_this2.history = [];
				_this2.historyIndex = 0;
				_this2.inputFocused = false;

				_this2.form.addEventListener('submit', function (e) {
					e.preventDefault();

					_this2.history.push(_this2.input.value);
					_this2.historyIndex = 0;

					_this2.emit('input', _this2.input.value);
					_console.log(shellCWD + ' ' + _this2.input.value, 'log-in');
					_this2.input.value = '';
				});

				$('#beaglert-consoleInput-pre').on('click', function () {
					return $(_this2.input).trigger('focus');
				});

				$('#beaglert-consoleInput-pre, #beaglert-consoleInput').on('mouseover', function () {
					$('#beaglert-consoleInput-pre').css('opacity', 1);
				}).on('mouseout', function () {
					if (!_this2.inputFocused) $('#beaglert-consoleInput-pre').css('opacity', 0.2);
				});

				_this2.input.addEventListener('focus', function () {
					_this2.inputFocused = true;
					$('#beaglert-consoleInput-pre').css('opacity', 1); //.html(shellCWD);
				});
				_this2.input.addEventListener('blur', function () {
					_this2.inputFocused = false;
					$('#beaglert-consoleInput-pre').css('opacity', 0.2); //.html('>');
				});
				window.addEventListener('keydown', function (e) {
					if (_this2.inputFocused) {
						if (e.which === 38) {
							// up arrow

							if (_this2.history[_this2.history.length - ++_this2.historyIndex]) {
								_this2.input.value = _this2.history[_this2.history.length - _this2.historyIndex];
							} else {
								_this2.historyIndex -= 1;
							}

							// force the cursor to the end
							setTimeout(function () {
								if (_this2.input.setSelectionRange !== undefined) {
									_this2.input.setSelectionRange(_this2.input.value.length, _this2.input.value.length);
								} else {
									$(_this2.input).val(_this2.input.value);
								}
							}, 0);
						} else if (e.which === 40) {
							// down arrow
							if (--_this2.historyIndex === 0) {
								_this2.input.value = '';
							} else if (_this2.history[_this2.history.length - _this2.historyIndex]) {
								_this2.input.value = _this2.history[_this2.history.length - _this2.historyIndex];
							} else {
								_this2.historyIndex += 1;
							}
						} else if (e.which === 9) {
							// tab
							e.preventDefault();
							_this2.emit('tab', _this2.input.value);
						}
					}
				});

				$('#beaglert-console').on('click', function () {
					return $(_this2.input).trigger('focus');
				});
				$('#beaglert-consoleWrapper').on('click', function (e) {
					return e.stopPropagation();
				});

				_this2.on('shell-stdout', function (data) {
					return _this2.emit('log', data, 'shell');
				});
				_this2.on('shell-stderr', function (data) {
					return _this2.emit('warn', data);
				});
				_this2.on('shell-cwd', function (cwd) {
					//console.log('cwd', cwd);
					shellCWD = 'root@bela ' + cwd.replace('/root', '~') + '#';
					$('#beaglert-consoleInput-pre').html(shellCWD);
				});
				_this2.on('shell-tabcomplete', function (data) {
					return $('#beaglert-consoleInput').val(data);
				});
				return _this2;
			}

			_createClass(ConsoleView, [{
				key: "openNotification",
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
				key: "closeNotification",
				value: function closeNotification(data) {
					if (data.error) {
						_console.reject(' ' + data.error, data.timestamp);
					} else {
						_console.fulfill(' done', data.timestamp);
					}
				}
			}, {
				key: "openProcessNotification",
				value: function openProcessNotification(text) {
					var timestamp = performance.now();
					_console.notify(text, timestamp);
					_console.fulfill('', timestamp, false);
				}
			}, {
				key: "connect",
				value: function connect() {
					$('#console-disconnect').remove();
					_console.unblock();
				}
			}, {
				key: "disconnect",
				value: function disconnect() {
					console.log('disconnected');
					_console.warn('You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone', 'console-disconnect');
					_console.block();
				}

				// model events
				// syntax

			}, {
				key: "_syntaxLog",
				value: function _syntaxLog(log, data) {
					if (this.settings.fullSyntaxCheckOutput) {
						_console.log(log);
					}
				}
			}, {
				key: "__verboseSyntaxError",
				value: function __verboseSyntaxError(log, data) {
					if (parseInt(this.settings.getKey('verboseErrors'))) {
						var _iteratorNormalCompletion3 = true;
						var _didIteratorError3 = false;
						var _iteratorError3 = undefined;

						try {
							for (var _iterator3 = log[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
								var line = _step3.value;

								_console.log(line.split(' ').join('&nbsp;'), 'make');
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
				}
			}, {
				key: "__allErrors",
				value: function __allErrors(errors, data) {
					//console.log(data);
					_console.newErrors(errors);
				}

				// build

			}, {
				key: "_buildLog",
				value: function _buildLog(log, data) {
					//console.log(log, data);
					//if (this.settings.fullBuildOutput){
					_console.log(log, 'make');
					//}
				}

				// bela

			}, {
				key: "__belaLog",
				value: function __belaLog(log, data) {
					_console.log(log, 'bela');
				}
			}, {
				key: "__belaLogErr",
				value: function __belaLogErr(log, data) {
					//_console.warn(log);
					//_console.warn(log.split(' ').join('&nbsp;'));
				}
			}, {
				key: "__belaResult",
				value: function __belaResult(data) {
					if (data.stderr && data.stderr.split) _console.warn(data.stderr.split(' ').join('&nbsp;'));
					if (data.signal) _console.warn(data.signal);
					//console.log(data.signal)
				}
			}, {
				key: "_building",
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
				key: "_running",
				value: function _running(status, data) {
					var timestamp = performance.now();
					if (status) {
						_console.notify('Running project...', timestamp, true);
						_console.fulfill('', timestamp, true);
					} else {
						_console.notify('Bela stopped', timestamp, true);
						if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined') {
							_console.reject(' with signal ' + data.belaResult.signal, timestamp, true);
						} else {
							_console.fulfill('', timestamp, true);
						}
					}
				}
			}, {
				key: "_CPU",
				value: function _CPU(data) {
					if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela != 0) {
						_console.log(data.bela.split(' ').join('&nbsp;'));
					}
				}
			}, {
				key: "_consoleDelete",
				value: function _consoleDelete(value) {
					_console.setConsoleDelete(parseInt(value));
				}
			}, {
				key: "_verboseDebug",
				value: function _verboseDebug(value) {
					verboseDebugOutput = parseInt(value);
				}
			}, {
				key: "__debugReason",
				value: function __debugReason(reason) {
					console.log('reason', reason);
					var timestamp = performance.now();
					_console.notify(reason, timestamp, true);
					if (reason === 'exited' || reason === 'exited-signalled') _console.reject('', timestamp, true);else _console.fulfill('', timestamp, false);
				}
			}, {
				key: "_debugSignal",
				value: function _debugSignal(signal) {
					console.log('signal', signal);
					var timestamp = performance.now();
					_console.notify(signal, timestamp, true);
					_console.reject('', timestamp, true);
				}
			}, {
				key: "_gdbLog",
				value: function _gdbLog(data) {
					if (verboseDebugOutput) _console.log(data);else console.log(data);
				}
			}, {
				key: "__debugBelaLog",
				value: function __debugBelaLog(data) {
					_console.log(data);
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
			'stop': 'Stopping'
		};
	}, { "../console": 14, "./View": 13 }], 4: [function (require, module, exports) {
		var View = require('./View');

		var DebugView = function (_View2) {
			_inherits(DebugView, _View2);

			function DebugView(className, models) {
				_classCallCheck(this, DebugView);

				var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(DebugView).call(this, className, models));

				_this3._debugMode(false);
				return _this3;
			}

			// UI events


			_createClass(DebugView, [{
				key: "selectChanged",
				value: function selectChanged($element, e) {
					var data = $element.data();
					var func = data.func;
					if (func && this[func]) {
						this[func]($element.val());
					}
				}
			}, {
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					this.setLocation('');
					this.emit('debugger-event', $element.data().func);
				}
			}, {
				key: "debugMode",
				value: function debugMode(status) {
					this.emit('debug-mode', status == true);
				}

				// model events

			}, {
				key: "_debugMode",
				value: function _debugMode(status) {
					if (!status) {
						this.$parents.find('button').prop('disabled', 'disabled');
					}
				}
				// debugger process has started or stopped

			}, {
				key: "_debugRunning",
				value: function _debugRunning(status) {
					this.clearVariableList();
					this.clearBacktrace();
					this.$parents.find('button').prop('disabled', 'disabled');
					if (!status) this.setLocation('n/a');
				}
				// debugger is doing something

			}, {
				key: "_debugBelaRunning",
				value: function _debugBelaRunning(status) {
					if (!status) {
						this.$parents.find('button:not(#debugInterrupt)').prop('disabled', '');
						$('#expList, #backtraceList').removeClass('debuggerOutOfScope');
					} else {
						this.$parents.find('button:not(#debugInterrupt)').prop('disabled', 'disabled');
						$('#expList, #backtraceList').addClass('debuggerOutOfScope');
					}
				}
			}, {
				key: "_debugInterruptable",
				value: function _debugInterruptable(status) {
					if (status) $('#debugInterrupt').prop('disabled', '');else $('#debugInterrupt').prop('disabled', 'disabled');
				}
			}, {
				key: "_debugStatus",
				value: function _debugStatus(value, data) {
					if (value) this.setStatus(value);
				}
			}, {
				key: "_debugReason",
				value: function _debugReason(value) {
					this.setStatus($('#debuggerStatus').html() + ', ' + value);
				}
			}, {
				key: "_debugLine",
				value: function _debugLine(line, data) {
					var location = '';
					if (data.debugFile) location += data.debugFile + ', line ';

					if (data.debugLine) location += data.debugLine;

					this.setLocation(location);
				}
			}, {
				key: "_variables",
				value: function _variables(variables) {
					console.log(variables);
					this.clearVariableList();
					var _iteratorNormalCompletion4 = true;
					var _didIteratorError4 = false;
					var _iteratorError4 = undefined;

					try {
						for (var _iterator4 = variables[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
							var variable = _step4.value;

							this.addVariable($('#expList'), variable);
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

					prepareList();
				}
			}, {
				key: "_backtrace",
				value: function _backtrace(trace) {
					this.clearBacktrace();
					var _iteratorNormalCompletion5 = true;
					var _didIteratorError5 = false;
					var _iteratorError5 = undefined;

					try {
						for (var _iterator5 = trace[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
							var item = _step5.value;

							$('<li></li>').text(item).appendTo($('#backtraceList'));
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

				// utility methods

			}, {
				key: "setStatus",
				value: function setStatus(value) {
					$('#debuggerStatus').html(value);
				}
			}, {
				key: "setLocation",
				value: function setLocation(value) {
					$('#debuggerLocation').html(value);
				}
			}, {
				key: "clearVariableList",
				value: function clearVariableList() {
					$('#expList').empty();
				}
			}, {
				key: "clearBacktrace",
				value: function clearBacktrace() {
					$('#backtraceList').empty();
				}
			}, {
				key: "addVariable",
				value: function addVariable(parent, variable) {
					var name;
					if (variable.key) name = variable.key;else {
						name = variable.name.split('.');
						if (name.length) name = name[name.length - 1];
					}
					//console.log('adding variable', name, variable);
					var li = $('<li></li>');
					var table = $('<table></table>').appendTo(li);
					$('<td></td>').text(variable.type).addClass('debuggerType').appendTo(table);
					$('<td></td>').text(name).addClass('debuggerName').appendTo(table);
					var valTD = $('<td></td>').text(variable.value).addClass('debuggerValue').appendTo(table);
					li.attr('id', variable.name).appendTo(parent);
					if (variable.numchild && variable.children && variable.children.length) {
						var ul = $('<ul></ul>').appendTo(li);
						var _iteratorNormalCompletion6 = true;
						var _didIteratorError6 = false;
						var _iteratorError6 = undefined;

						try {
							for (var _iterator6 = variable.children[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
								var child = _step6.value;

								this.addVariable(ul, child);
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
					}
					if (variable.value == undefined) {
						li.addClass('debuggerOutOfScope');
						valTD.text('out of scope');
					}
				}
			}]);

			return DebugView;
		}(View);

		module.exports = DebugView;

		function prepareList() {
			$('#expList').find('li:has(ul)').each(function () {
				var $this = $(this);
				if (!$this.hasClass('collapsed')) {
					$this.click(function (event) {
						$(this).toggleClass('expanded');
						$(this).children('ul').toggle('fast');
						return false;
					}).addClass('collapsed').children('ul').hide();
				}
			});
		};
	}, { "./View": 13 }], 5: [function (require, module, exports) {
		var View = require('./View');

		var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];

		var DocumentationView = function (_View3) {
			_inherits(DocumentationView, _View3);

			function DocumentationView(className, models) {
				_classCallCheck(this, DocumentationView);

				var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(DocumentationView).call(this, className, models));

				_this4.on('init', _this4.init);
				return _this4;
			}

			_createClass(DocumentationView, [{
				key: "init",
				value: function init() {

					// The API
					$.ajax({
						type: "GET",
						url: "documentation_xml?file=Bela_8h",
						dataType: "xml",
						success: function success(xml) {
							//console.log(xml);
							var counter = 0;
							var _iteratorNormalCompletion7 = true;
							var _didIteratorError7 = false;
							var _iteratorError7 = undefined;

							try {
								for (var _iterator7 = apiFuncs[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
									var item = _step7.value;

									var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains(' + item + '))'), 'APIDocs' + counter);
									li.appendTo($('#APIDocs'));
									counter += 1;
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
						}
					});

					// The Audio Context
					$.ajax({
						type: "GET",
						url: "documentation_xml?file=structBelaContext",
						dataType: "xml",
						success: function success(xml) {
							//console.log(xml);
							var counter = 0;
							$(xml).find('memberdef').each(function () {
								var li = createlifrommemberdef($(this), 'contextDocs' + counter);
								li.appendTo($('#contextDocs'));
								counter += 1;
							});
						}
					});

					// Utilities
					$.ajax({
						type: "GET",
						url: "documentation_xml?file=Utilities_8h",
						dataType: "xml",
						success: function success(xml) {
							//console.log(xml);
							var counter = 0;
							$(xml).find('memberdef').each(function () {
								var li = createlifrommemberdef($(this), 'utilityDocs' + counter);
								li.appendTo($('#utilityDocs'));
								counter += 1;
							});
						}
					});
				}
			}]);

			return DocumentationView;
		}(View);

		module.exports = DocumentationView;

		function createlifrommemberdef($xml, id) {
			var li = $('<li></li>');
			li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
			li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html($xml.find('name').html()));

			var content = $('<div></div>');

			// title
			content.append($('<h2></h2>').html($xml.find('definition').html() + $xml.find('argsstring').html()));

			// subtitle
			content.append($('<h3></h3>').html($xml.find('briefdescription > para').html() || ''));

			// main text
			content.append($('<p></p>').html($xml.find('detaileddescription > para').html() || ''));

			li.append(content);
			return li;
		}
	}, { "./View": 13 }], 6: [function (require, module, exports) {
		var View = require('./View');
		var Range = ace.require('ace/range').Range;

		var uploadDelay = 50;

		var uploadBlocked = false;
		var currentFile;
		var imageUrl;

		var EditorView = function (_View4) {
			_inherits(EditorView, _View4);

			function EditorView(className, models) {
				_classCallCheck(this, EditorView);

				var _this5 = _possibleConstructorReturn(this, Object.getPrototypeOf(EditorView).call(this, className, models));

				_this5.editor = ace.edit('editor');
				ace.require("ace/ext/language_tools");

				// set syntax mode
				_this5.editor.session.setMode('ace/mode/c_cpp');
				_this5.editor.$blockScrolling = Infinity;

				// set theme
				_this5.editor.setTheme("ace/theme/chrome");
				_this5.editor.setShowPrintMargin(false);

				// autocomplete settings
				_this5.editor.setOptions({
					enableBasicAutocompletion: true,
					enableLiveAutocompletion: false,
					enableSnippets: true
				});

				// this function is called when the user modifies the editor
				_this5.editor.session.on('change', function (e) {
					//console.log('upload', !uploadBlocked);
					if (!uploadBlocked) _this5.editorChanged();
				});

				// set/clear breakpoints when the gutter is clicked
				_this5.editor.on("guttermousedown", function (e) {
					var target = e.domEvent.target;
					if (target.className.indexOf("ace_gutter-cell") == -1) return;
					if (!_this5.editor.isFocused()) return;
					if (e.clientX > 25 + target.getBoundingClientRect().left) return;

					var row = e.getDocumentPosition().row;

					_this5.emit('breakpoint', row);

					e.stop();
				});

				$('#audioControl').find('button').on('click', function () {
					return audioSource.start(0);
				});

				_this5.on('resize', function () {
					return _this5.editor.resize();
				});

				return _this5;
			}

			_createClass(EditorView, [{
				key: "editorChanged",
				value: function editorChanged() {
					var _this6 = this;

					this.emit('editor-changed');
					clearTimeout(this.uploadTimeout);
					this.uploadTimeout = setTimeout(function () {
						return _this6.emit('upload', _this6.editor.getValue());
					}, uploadDelay);
				}

				// model events
				// new file saved

			}, {
				key: "__fileData",
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
					} else if (opts.fileType.indexOf('audio') !== -1) {

						//console.log('opening audio file');

						$('#audio-parent').css({
							'display': 'block',
							'max-width': $('#editor').width() + 'px',
							'max-height': $('#editor').height() + 'px'
						});

						$('#audio').prop('src', 'media/' + opts.fileName);
					} else {

						if (opts.fileType === 'pd') {

							// we're opening a pd patch
							var timestamp = performance.now();
							this.emit('open-notification', {
								func: 'editor',
								timestamp: timestamp,
								text: 'Rendering pd patch'
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
									text: 'failed!'
								});
								throw e;
							}

							// load an empty string into the editor
							data = '';
						} else {

							// show the editor
							$('#editor').css('display', 'block');
						}

						// block upload
						uploadBlocked = true;

						// put the file into the editor
						this.editor.session.setValue(data, -1);

						// unblock upload
						uploadBlocked = false;

						// force a syntax check
						this.emit('change');

						// focus the editor
						this._focus(opts.focus);
					}
				}
				// editor focus has changed

			}, {
				key: "_focus",
				value: function _focus(data) {

					if (data && data.line !== undefined && data.column !== undefined) this.editor.gotoLine(data.line, data.column);

					this.editor.focus();
				}
				// syntax errors in current file have changed

			}, {
				key: "_currentFileErrors",
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
				key: "_liveAutocompletion",
				value: function _liveAutocompletion(status) {
					//console.log(status, (parseInt(status) === 1));
					this.editor.setOptions({
						enableLiveAutocompletion: parseInt(status) === 1
					});
				}
				// readonly status has changed

			}, {
				key: "_readOnly",
				value: function _readOnly(status) {
					if (status) {
						this.editor.setReadOnly(true);
					} else {
						this.editor.setReadOnly(false);
					}
				}
				// a new file has been opened

			}, {
				key: "_fileName",
				value: function _fileName(name, data) {
					currentFile = name;
					this.__breakpoints(data.breakpoints, data);
				}
				// breakpoints have been changed

			}, {
				key: "__breakpoints",
				value: function __breakpoints(breakpoints, data) {
					//console.log('setting breakpoints', breakpoints);
					this.editor.session.clearBreakpoints();
					var _iteratorNormalCompletion8 = true;
					var _didIteratorError8 = false;
					var _iteratorError8 = undefined;

					try {
						for (var _iterator8 = breakpoints[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
							var breakpoint = _step8.value;

							if (breakpoint.file === data.fileName) {
								this.editor.session.setBreakpoint(breakpoint.line);
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
				}
				// debugger highlight line has changed

			}, {
				key: "__debugLine",
				value: function __debugLine(line, data) {
					console.log(line, data.debugFile, currentFile);
					this.removeDebuggerMarker();

					// add new marker at line
					if (line && data.debugFile === currentFile) {
						this.editor.session.addMarker(new Range(line - 1, 0, line - 1, 1), "breakpointMarker", "fullLine");
						this.editor.gotoLine(line, 0);
					}
				}
				// debugger process has started or stopped

			}, {
				key: "_debugRunning",
				value: function _debugRunning(status) {
					if (!status) {
						this.removeDebuggerMarker();
					}
				}
			}, {
				key: "_debugBelaRunning",
				value: function _debugBelaRunning(status) {
					if (status) {
						this.removeDebuggerMarker();
					}
				}
			}, {
				key: "removeDebuggerMarker",
				value: function removeDebuggerMarker() {
					var _this7 = this;

					var markers = this.editor.session.getMarkers();

					// remove existing marker
					Object.keys(markers).forEach(function (key, index) {
						if (markers[key].clazz === 'breakpointMarker') {
							_this7.editor.session.removeMarker(markers[key].id);
						}
					});
				}
			}]);

			return EditorView;
		}(View);

		module.exports = EditorView;
	}, { "./View": 13 }], 7: [function (require, module, exports) {
		var View = require('./View');
		var popup = require('../popup');

		var sourceIndeces = ['cpp', 'c', 'S'];
		var headerIndeces = ['h', 'hh', 'hpp'];

		var askForOverwrite = true;

		var FileView = function (_View5) {
			_inherits(FileView, _View5);

			function FileView(className, models) {
				_classCallCheck(this, FileView);

				var _this8 = _possibleConstructorReturn(this, Object.getPrototypeOf(FileView).call(this, className, models));

				_this8.listOfFiles = [];

				// hack to upload file
				$('#uploadFileInput').on('change', function (e) {
					var _iteratorNormalCompletion9 = true;
					var _didIteratorError9 = false;
					var _iteratorError9 = undefined;

					try {
						for (var _iterator9 = e.target.files[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
							var file = _step9.value;

							_this8.doFileUpload(file);
						}
					} catch (err) {
						_didIteratorError9 = true;
						_iteratorError9 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion9 && _iterator9.return) {
								_iterator9.return();
							}
						} finally {
							if (_didIteratorError9) {
								throw _iteratorError9;
							}
						}
					}
				});

				// drag and drop file upload on editor
				$('body').on('dragenter dragover drop', function (e) {
					e.stopPropagation();
					if (e.type === 'drop') {
						var _iteratorNormalCompletion10 = true;
						var _didIteratorError10 = false;
						var _iteratorError10 = undefined;

						try {
							for (var _iterator10 = e.originalEvent.dataTransfer.files[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
								var file = _step10.value;

								_this8.doFileUpload(file);
							}
						} catch (err) {
							_didIteratorError10 = true;
							_iteratorError10 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion10 && _iterator10.return) {
									_iterator10.return();
								}
							} finally {
								if (_didIteratorError10) {
									throw _iteratorError10;
								}
							}
						}
					}
					return false;
				});

				return _this8;
			}

			// UI events


			_createClass(FileView, [{
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "newFile",
				value: function newFile(func) {
					var _this9 = this;

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
						_this9.emit('message', 'project-event', { func: func, newFile: sanitise(popup.find('input[type=text]').val()) });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();
				}
			}, {
				key: "uploadFile",
				value: function uploadFile(func) {
					$('#uploadFileInput').trigger('click');
				}
			}, {
				key: "renameFile",
				value: function renameFile(func) {
					var _this10 = this;

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
						_this10.emit('message', 'project-event', { func: func, newFile: sanitise(popup.find('input[type=text]').val()) });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();
				}
			}, {
				key: "deleteFile",
				value: function deleteFile(func) {
					var _this11 = this;

					// build the popup content
					popup.title('Deleting file');
					popup.subtitle('Are you sure you wish to delete this file? This cannot be undone!');

					var form = [];
					form.push('<button type="submit" class="button popup-delete">Delete</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this11.emit('message', 'project-event', { func: func });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();

					popup.find('.popup-delete').trigger('focus');
				}
			}, {
				key: "openFile",
				value: function openFile(e) {
					this.emit('message', 'project-event', { func: 'openFile', newFile: $(e.currentTarget).data('file') });
				}

				// model events

			}, {
				key: "_fileList",
				value: function _fileList(files, data) {
					var _this12 = this;

					this.listOfFiles = files;

					var $files = $('#fileList');
					$files.empty();

					if (!files.length) return;

					var headers = [];
					var sources = [];
					var resources = [];
					var directories = [];

					var _iteratorNormalCompletion11 = true;
					var _didIteratorError11 = false;
					var _iteratorError11 = undefined;

					try {
						for (var _iterator11 = files[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
							var item = _step11.value;


							if (item.dir) {

								directories.push(item);
							} else {

								var ext = item.name.split('.').pop();

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
						_didIteratorError11 = true;
						_iteratorError11 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion11 && _iterator11.return) {
								_iterator11.return();
							}
						} finally {
							if (_didIteratorError11) {
								throw _iteratorError11;
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
						$('<li></li>').addClass('sourceFile').html(headers[i].name).data('file', headers[i].name).appendTo($files).on('click', function (e) {
							return _this12.openFile(e);
						});
					}

					if (sources.length) {
						$('<li></li>').html('Sources:').appendTo($files);
					}
					for (var _i = 0; _i < sources.length; _i++) {
						$('<li></li>').addClass('sourceFile').html(sources[_i].name).data('file', sources[_i].name).appendTo($files).on('click', function (e) {
							return _this12.openFile(e);
						});
					}

					if (resources.length) {
						$('<li></li>').html('Resources:').appendTo($files);
					}
					for (var _i2 = 0; _i2 < resources.length; _i2++) {
						$('<li></li>').addClass('sourceFile').html(resources[_i2].name).data('file', resources[_i2].name).appendTo($files).on('click', function (e) {
							return _this12.openFile(e);
						});
					}

					if (directories.length) {
						$('<li></li>').html('Directories:').appendTo($files);
					}
					var _iteratorNormalCompletion12 = true;
					var _didIteratorError12 = false;
					var _iteratorError12 = undefined;

					try {
						for (var _iterator12 = directories[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
							var dir = _step12.value;

							$files.append(this.subDirs(dir));
						}
					} catch (err) {
						_didIteratorError12 = true;
						_iteratorError12 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion12 && _iterator12.return) {
								_iterator12.return();
							}
						} finally {
							if (_didIteratorError12) {
								throw _iteratorError12;
							}
						}
					}

					if (data && data.fileName) this._fileName(data.fileName);
				}
			}, {
				key: "_fileName",
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
				key: "subDirs",
				value: function subDirs(dir) {
					var _this13 = this;

					var ul = $('<ul></ul>').html(dir.name + ':');
					var _iteratorNormalCompletion13 = true;
					var _didIteratorError13 = false;
					var _iteratorError13 = undefined;

					try {
						for (var _iterator13 = dir.children[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
							var child = _step13.value;

							if (!child.dir) $('<li></li>').addClass('sourceFile').html(child.name).data('file', (dir.dirPath || dir.name) + '/' + child.name).appendTo(ul).on('click', function (e) {
								return _this13.openFile(e);
							});else {
								child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
								ul.append(this.subDirs(child));
							}
						}
					} catch (err) {
						_didIteratorError13 = true;
						_iteratorError13 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion13 && _iterator13.return) {
								_iterator13.return();
							}
						} finally {
							if (_didIteratorError13) {
								throw _iteratorError13;
							}
						}
					}

					return ul;
				}
			}, {
				key: "doFileUpload",
				value: function doFileUpload(file) {
					var _this14 = this;

					var fileExists = false;
					var _iteratorNormalCompletion14 = true;
					var _didIteratorError14 = false;
					var _iteratorError14 = undefined;

					try {
						for (var _iterator14 = this.listOfFiles[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
							var item = _step14.value;

							if (item.name === file.name) fileExists = true;
						}
					} catch (err) {
						_didIteratorError14 = true;
						_iteratorError14 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion14 && _iterator14.return) {
								_iterator14.return();
							}
						} finally {
							if (_didIteratorError14) {
								throw _iteratorError14;
							}
						}
					}

					if (fileExists && askForOverwrite) {

						// build the popup content
						popup.title('Overwriting file');
						popup.subtitle('The file ' + file.name + ' already exists in this project. Would you like to overwrite it?');

						var form = [];
						form.push('<input id="popup-remember-upload" type="checkbox">');
						form.push('<label for="popup-remember-upload">don\'t ask me again this session</label>');
						form.push('</br >');
						form.push('<button type="submit" class="button popup-upload">Upload</button>');
						form.push('<button type="button" class="button popup-cancel">Cancel</button>');

						popup.form.append(form.join('')).off('submit').on('submit', function (e) {
							e.preventDefault();
							if (popup.find('input[type=checkbox]').is(':checked')) askForOverwrite = false;
							_this14.actuallyDoFileUpload(file, true);
							popup.hide();
						});

						popup.find('.popup-cancel').on('click', popup.hide);

						popup.show();

						popup.find('.popup-cancel').focus();
					} else {

						this.actuallyDoFileUpload(file, !askForOverwrite);
					}
				}
			}, {
				key: "actuallyDoFileUpload",
				value: function actuallyDoFileUpload(file, force) {
					var _this15 = this;

					var reader = new FileReader();
					reader.onload = function (ev) {
						return _this15.emit('message', 'project-event', { func: 'uploadFile', newFile: sanitise(file.name), fileData: ev.target.result, force: force });
					};
					reader.readAsArrayBuffer(file);
				}
			}]);

			return FileView;
		}(View);

		module.exports = FileView;

		// replace all non alpha-numeric chars other than '-' and '.' with '_'
		function sanitise(name) {
			return name.replace(/[^a-zA-Z0-9\.\-\/~]/g, '_');
		}
	}, { "../popup": 16, "./View": 13 }], 8: [function (require, module, exports) {
		'use strict';

		var View = require('./View');
		var popup = require('../popup');

		var GitView = function (_View6) {
			_inherits(GitView, _View6);

			function GitView(className, models, settings) {
				_classCallCheck(this, GitView);

				var _this16 = _possibleConstructorReturn(this, Object.getPrototypeOf(GitView).call(this, className, models, settings));

				_this16.$form = $('#gitForm');
				_this16.$input = $('#gitInput');

				// git input events
				_this16.$form.on('submit', function (e) {
					e.preventDefault();
					_this16.emit('git-event', {
						func: 'command',
						command: _this16.$input.val()
					});
					_this16.$input.val('');
				});
				return _this16;
			}

			_createClass(GitView, [{
				key: "buttonClicked",
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
				key: "selectChanged",
				value: function selectChanged($element, e) {
					this.emit('git-event', {
						func: 'command',
						command: 'checkout ' + ($("option:selected", $element).data('hash') || $("option:selected", $element).val())
					});
				}
			}, {
				key: "commit",
				value: function commit() {
					var _this17 = this;

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
						_this17.emit('git-event', { func: 'command', command: 'commit -am "' + popup.find('input[type=text]').val() + '"' });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();
				}
			}, {
				key: "branch",
				value: function branch() {
					var _this18 = this;

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
						_this18.emit('git-event', { func: 'command', command: 'checkout -b ' + popup.find('input[type=text]').val() });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();
				}
			}, {
				key: "discardChanges",
				value: function discardChanges() {
					var _this19 = this;

					// build the popup content
					popup.title('Discarding changes');
					popup.subtitle('You are about to discard all changes made in your project since the last commit. The command used is "git checkout -- .". Are you sure you wish to continue? This cannot be undone.');

					var form = [];
					form.push('<button type="submit" class="button popup-continue">Continue</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this19.emit('git-event', { func: 'command', command: 'checkout -- .' });
						popup.hide();
					});

					popup.find('.popup-create').on('click', popup.hide);

					popup.show();

					popup.find('.popup-continue').trigger('focus');
				}
			}, {
				key: "_repoExists",
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
				key: "__commits",
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
				key: "__stdout",
				value: function __stdout(text, git) {
					this.emit('console', text);
				}
			}, {
				key: "__stderr",
				value: function __stderr(text) {
					this.emit('console', text);
				}
			}]);

			return GitView;
		}(View);

		module.exports = GitView;
	}, { "../popup": 16, "./View": 13 }], 9: [function (require, module, exports) {
		var View = require('./View');
		var popup = require('../popup');

		var ProjectView = function (_View7) {
			_inherits(ProjectView, _View7);

			function ProjectView(className, models) {
				_classCallCheck(this, ProjectView);

				var _this20 = _possibleConstructorReturn(this, Object.getPrototypeOf(ProjectView).call(this, className, models));

				_this20.exampleChanged = false;
				_this20.on('example-changed', function () {
					return _this20.exampleChanged = true;
				});
				return _this20;
			}

			// UI events


			_createClass(ProjectView, [{
				key: "selectChanged",
				value: function selectChanged($element, e) {
					var _this21 = this;

					if (this.exampleChanged) {
						this.exampleChanged = false;
						popup.exampleChanged(function () {
							_this21.emit('message', 'project-event', { func: $element.data().func, currentProject: $element.val() });
						}, undefined, 0, function () {
							$element.find('option').filter(':selected').attr('selected', '');
							$element.val($('#projects > option:first').val());
							_this21.exampleChanged = true;
						});
						return;
					}

					this.emit('message', 'project-event', { func: $element.data().func, currentProject: $element.val() });
				}
			}, {
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "newProject",
				value: function newProject(func) {
					var _this22 = this;

					if (this.exampleChanged) {
						this.exampleChanged = false;
						popup.exampleChanged(this.newProject.bind(this), func, 500, function () {
							return _this22.exampleChanged = true;
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
					form.push('<input type="text" placeholder="Enter your project name">');
					form.push('</br>');
					form.push('<button type="submit" class="button popup-save">Save</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this22.emit('message', 'project-event', {
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
				key: "saveAs",
				value: function saveAs(func) {
					var _this23 = this;

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
						_this23.emit('message', 'project-event', { func: func, newProject: sanitise(popup.find('input[type=text]').val()) });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();
				}
			}, {
				key: "deleteProject",
				value: function deleteProject(func) {
					var _this24 = this;

					// build the popup content
					popup.title('Deleting project');
					popup.subtitle('Are you sure you wish to delete this project? This cannot be undone!');

					var form = [];
					form.push('<button type="submit" class="button popup-delete">Delete</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this24.emit('message', 'project-event', { func: func });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();

					popup.find('.popup-delete').trigger('focus');
				}
			}, {
				key: "cleanProject",
				value: function cleanProject(func) {
					this.emit('message', 'project-event', { func: func });
				}

				// model events

			}, {
				key: "_projectList",
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
				key: "_exampleList",
				value: function _exampleList(examplesDir) {
					var _this25 = this;

					var $examples = $('#examples');
					$examples.empty();

					if (!examplesDir.length) return;

					var _iteratorNormalCompletion15 = true;
					var _didIteratorError15 = false;
					var _iteratorError15 = undefined;

					try {
						var _loop = function _loop() {
							var item = _step15.value;

							var ul = $('<ul></ul>').html(item.name + ':');
							var _iteratorNormalCompletion16 = true;
							var _didIteratorError16 = false;
							var _iteratorError16 = undefined;

							try {
								var _loop2 = function _loop2() {
									var child = _step16.value;

									if (child && child.length && child[0] === '.') return "continue";
									$('<li></li>').addClass('sourceFile').html(child).appendTo(ul).on('click', function (e) {

										if (_this25.exampleChanged) {
											_this25.exampleChanged = false;
											popup.exampleChanged(function () {
												_this25.emit('message', 'project-event', {
													func: 'openExample',
													currentProject: item.name + '/' + child
												});
												$('.selectedExample').removeClass('selectedExample');
												$(e.target).addClass('selectedExample');
											}, undefined, 0, function () {
												return _this25.exampleChanged = true;
											});
											return;
										}

										_this25.emit('message', 'project-event', {
											func: 'openExample',
											currentProject: item.name + '/' + child
										});
										$('.selectedExample').removeClass('selectedExample');
										$(e.target).addClass('selectedExample');
									});
								};

								for (var _iterator16 = item.children[Symbol.iterator](), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
									var _ret3 = _loop2();

									if (_ret3 === "continue") continue;
								}
							} catch (err) {
								_didIteratorError16 = true;
								_iteratorError16 = err;
							} finally {
								try {
									if (!_iteratorNormalCompletion16 && _iterator16.return) {
										_iterator16.return();
									}
								} finally {
									if (_didIteratorError16) {
										throw _iteratorError16;
									}
								}
							}

							ul.appendTo($examples);
						};

						for (var _iterator15 = examplesDir[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
							_loop();
						}
					} catch (err) {
						_didIteratorError15 = true;
						_iteratorError15 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion15 && _iterator15.return) {
								_iterator15.return();
							}
						} finally {
							if (_didIteratorError15) {
								throw _iteratorError15;
							}
						}
					}
				}
			}, {
				key: "_currentProject",
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
				key: "__currentProject",
				value: function __currentProject() {
					this.exampleChanged = false;
				}
			}, {
				key: "subDirs",
				value: function subDirs(dir) {
					var ul = $('<ul></ul>').html(dir.name + ':');
					var _iteratorNormalCompletion17 = true;
					var _didIteratorError17 = false;
					var _iteratorError17 = undefined;

					try {
						for (var _iterator17 = dir.children[Symbol.iterator](), _step17; !(_iteratorNormalCompletion17 = (_step17 = _iterator17.next()).done); _iteratorNormalCompletion17 = true) {
							var _child = _step17.value;

							if (!_child.dir) $('<li></li>').addClass('sourceFile').html(_child.name).data('file', (dir.dirPath || dir.name) + '/' + _child.name).appendTo(ul);else {
								_child.dirPath = (dir.dirPath || dir.name) + '/' + _child.name;
								ul.append(this.subDirs(_child));
							}
						}
					} catch (err) {
						_didIteratorError17 = true;
						_iteratorError17 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion17 && _iterator17.return) {
								_iterator17.return();
							}
						} finally {
							if (_didIteratorError17) {
								throw _iteratorError17;
							}
						}
					}

					return ul;
				}
			}]);

			return ProjectView;
		}(View);

		module.exports = ProjectView;

		// replace all non alpha-numeric chars other than '-' and '.' with '_'
		function sanitise(name) {
			return name.replace(/[^a-zA-Z0-9\.\-]/g, '_');
		}
	}, { "../popup": 16, "./View": 13 }], 10: [function (require, module, exports) {
		var View = require('./View');
		var popup = require('../popup');

		var inputChangedTimeout;

		var SettingsView = function (_View8) {
			_inherits(SettingsView, _View8);

			function SettingsView(className, models, settings) {
				_classCallCheck(this, SettingsView);

				//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));

				var _this26 = _possibleConstructorReturn(this, Object.getPrototypeOf(SettingsView).call(this, className, models, settings));

				_this26.settings.on('change', function (data) {
					return _this26._IDESettings(data);
				});
				_this26.$elements.filterByData = function (prop, val) {
					return this.filter(function () {
						return $(this).data(prop) == val;
					});
				};

				$('#runOnBoot').on('change', function () {
					if ($('#runOnBoot').val() && $('#runOnBoot').val() !== '--select--') _this26.emit('run-on-boot', $('#runOnBoot').val());
				});

				_this26.inputJustChanged = false;

				return _this26;
			}

			_createClass(SettingsView, [{
				key: "selectChanged",
				value: function selectChanged($element, e) {
					var data = $element.data();
					var func = data.func;
					var key = data.key;
					if (func && this[func]) {
						this[func](func, key, $element.val());
					}
				}
			}, {
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "inputChanged",
				value: function inputChanged($element, e) {
					var _this27 = this;

					var data = $element.data();
					var func = data.func;
					var key = data.key;
					var type = $element.prop('type');

					if (inputChangedTimeout) clearTimeout(inputChangedTimeout);
					inputChangedTimeout = setTimeout(function () {
						return _this27.inputJustChanged = false;
					}, 100);
					this.inputJustChanged = true;

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
				key: "setCLArg",
				value: function setCLArg(func, key, value) {
					this.emit('project-settings', { func: func, key: key, value: value });
				}
			}, {
				key: "restoreDefaultCLArgs",
				value: function restoreDefaultCLArgs(func) {
					var _this28 = this;

					// build the popup content
					popup.title('Restoring default project settings');
					popup.subtitle('Are you sure you wish to continue? Your current project settings will be lost!');

					var form = [];
					form.push('<button type="submit" class="button popup-continue">Continue</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this28.emit('project-settings', { func: func });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();

					popup.find('.popup-continue').trigger('focus');
				}
			}, {
				key: "setIDESetting",
				value: function setIDESetting(func, key, value) {
					console.log(func, key, value);
					this.emit('IDE-settings', { func: func, key: key, value: value });
				}
			}, {
				key: "restoreDefaultIDESettings",
				value: function restoreDefaultIDESettings(func) {
					var _this29 = this;

					// build the popup content
					popup.title('Restoring default IDE settings');
					popup.subtitle('Are you sure you wish to continue? Your current IDE settings will be lost!');

					var form = [];
					form.push('<button type="submit" class="button popup-continue">Continue</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this29.emit('IDE-settings', { func: func });
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();

					popup.find('.popup-continue').trigger('focus');
				}
			}, {
				key: "shutdownBBB",
				value: function shutdownBBB() {
					var _this30 = this;

					// build the popup content
					popup.title('Shutting down Bela');
					popup.subtitle('Are you sure you wish to continue? The BeagleBone will shutdown gracefully, and the IDE will disconnect.');

					var form = [];
					form.push('<button type="submit" class="button popup-continue">Continue</button>');
					form.push('<button type="button" class="button popup-cancel">Cancel</button>');

					popup.form.append(form.join('')).off('submit').on('submit', function (e) {
						e.preventDefault();
						_this30.emit('halt');
						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();

					popup.find('.popup-continue').trigger('focus');
				}
			}, {
				key: "aboutPopup",
				value: function aboutPopup() {

					// build the popup content
					popup.title('About Bela');
					popup.subtitle('You are using Bela Version 0.1, July 2016. Bela is an open source project licensed under GPL, and is a product of the Augmented Instruments Laboratory at Queen Mary University of London. For more information, visit http://bela.io');
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
				key: "updateBela",
				value: function updateBela() {
					var _this31 = this;

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

						e.preventDefault();

						var file = popup.find('input[type=file]').prop('files')[0];
						if (file && file.type === 'application/zip') {

							_this31.emit('warning', 'Beginning the update - this may take several minutes');
							_this31.emit('warning', 'The browser may become unresponsive and will temporarily disconnect');
							_this31.emit('warning', 'Do not use the IDE during the update process!');

							var reader = new FileReader();
							reader.onload = function (ev) {
								return _this31.emit('upload-update', { name: file.name, file: ev.target.result });
							};
							reader.readAsArrayBuffer(file);
						} else {

							_this31.emit('warning', 'not a valid update zip archive');
						}

						popup.hide();
					});

					popup.find('.popup-cancel').on('click', popup.hide);

					popup.show();
				}

				// model events

			}, {
				key: "_CLArgs",
				value: function _CLArgs(data) {
					var args = '';
					for (var key in data) {

						var el = this.$elements.filterByData('key', key);

						// set the input value when neccesary
						if (el[0].type === 'checkbox') {
							el.prop('checked', data[key] == 1);
						} else if (key === '-C' || el.val() !== data[key] && !this.inputJustChanged) {
							//console.log(el.val(), data[key]);
							el.val(data[key]);
						}

						// fill in the full string
						if (key[0] === '-' && key[1] === '-') {
							args += key + '=' + data[key] + ' ';
						} else if (key === 'user') {
							args += data[key];
						} else if (key !== 'make') {
							args += key + data[key] + ' ';
						}
					}

					$('#C_L_ARGS').val(args);
				}
			}, {
				key: "_IDESettings",
				value: function _IDESettings(data) {
					for (var key in data) {
						this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
					}
				}
			}, {
				key: "_breakpoints",
				value: function _breakpoints(value, keys) {
					this.emit('project-settings', { func: 'setBreakpoints', value: value });
				}
			}, {
				key: "_projectList",
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
			}]);

			return SettingsView;
		}(View);

		module.exports = SettingsView;
	}, { "../popup": 16, "./View": 13 }], 11: [function (require, module, exports) {
		var View = require('./View');

		// private variables
		var _tabsOpen = false;

		var TabView = function (_View9) {
			_inherits(TabView, _View9);

			function TabView() {
				_classCallCheck(this, TabView);

				// open/close tabs

				var _this32 = _possibleConstructorReturn(this, Object.getPrototypeOf(TabView).call(this, 'tab'));

				$('#flexit').on('click', function () {
					if (_tabsOpen) {
						_this32.closeTabs();
					} else {
						_this32.openTabs();
					}
				});

				$('.tab > label').on('click', function (e) {
					if (!_tabsOpen) {
						if ($(e.currentTarget).prop('id') === 'tab-0' && $('[type=radio]:checked ~ label').prop('id') === 'tab-0') $('#file-explorer').parent().trigger('click');

						_this32.openTabs();
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
					return _this32.emit('change');
				});
				layout.on('stateChanged', function () {
					return _this32.emit('change');
				});

				$(window).on('resize', function () {
					if (_tabsOpen) {
						_this32.openTabs();
					} else {
						_this32.closeTabs();
					}
				});

				return _this32;
			}

			_createClass(TabView, [{
				key: "openTabs",
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
				key: "closeTabs",
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
			}]);

			return TabView;
		}(View);

		module.exports = new TabView();
	}, { "./View": 13 }], 12: [function (require, module, exports) {
		var View = require('./View');

		// ohhhhh i am a comment

		var ToolbarView = function (_View10) {
			_inherits(ToolbarView, _View10);

			function ToolbarView(className, models) {
				_classCallCheck(this, ToolbarView);

				var _this33 = _possibleConstructorReturn(this, Object.getPrototypeOf(ToolbarView).call(this, className, models));

				_this33.$elements.on('click', function (e) {
					return _this33.buttonClicked($(e.currentTarget), e);
				});

				_this33.on('disconnected', function () {
					$('#run').removeClass('spinning');
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
				return _this33;
			}

			// UI events


			_createClass(ToolbarView, [{
				key: "buttonClicked",
				value: function buttonClicked($element, e) {
					var func = $element.data().func;
					if (func && this[func]) {
						this[func](func);
					}
				}
			}, {
				key: "run",
				value: function run(func) {
					this.emit('process-event', func);
				}
			}, {
				key: "stop",
				value: function stop(func) {
					this.emit('process-event', func);
				}
			}, {
				key: "clearConsole",
				value: function clearConsole() {
					this.emit('clear-console');
				}

				// model events

			}, {
				key: "__running",
				value: function __running(status) {
					if (status) {
						$('#run').removeClass('building-button').addClass('running-button');
					} else {
						$('#run').removeClass('running-button');
					}
				}
			}, {
				key: "__building",
				value: function __building(status) {
					if (status) {
						$('#run').removeClass('running-button').addClass('building-button');
					} else {
						$('#run').removeClass('building-button');
					}
				}
			}, {
				key: "__checkingSyntax",
				value: function __checkingSyntax(status) {
					if (status) {
						$('#status').css('background', 'url("images/icons/status_wait.png")').prop('title', 'checking syntax...');
					} else {
						//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
					}
				}
			}, {
				key: "__allErrors",
				value: function __allErrors(errors) {
					//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout);
					if (errors.length) {
						$('#status').css('background', 'url("images/icons/status_stop.png")').prop('title', 'syntax errors found');
					} else {
						$('#status').css('background', 'url("images/icons/status_ok.png")').prop('title', 'syntax check clear');
					}
				}
			}, {
				key: "_CPU",
				value: function _CPU(data) {

					var ide = data.syntaxCheckProcess + data.buildProcess + data.node + data.gdb;
					var bela = 0,
					    rootCPU = 1;

					if (data.bela != 0) {

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
									'name': taskData[j][7],
									'cpu': taskData[j][6],
									'msw': taskData[j][2],
									'csw': taskData[j][3]
								};
								if (proc.name === 'ROOT') rootCPU = proc.cpu * 0.01;
								// ignore uninteresting data
								if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ29:') {
									output.push(proc);
								}
							}
						}

						for (var j = 0; j < output.length; j++) {
							if (output[j].cpu) {
								bela += parseFloat(output[j].cpu);
							}
						}
					}

					$('#ide-cpu').html('IDE: ' + (ide * rootCPU).toFixed(1) + '%');
					$('#bela-cpu').html('Bela: ' + (bela ? bela.toFixed(1) + '%' : '--'));
				}
			}, {
				key: "_cpuMonitoring",
				value: function _cpuMonitoring(value) {
					if (parseInt(value)) $('#ide-cpu, #bela-cpu').css('visibility', 'visible');else $('#ide-cpu, #bela-cpu').css('visibility', 'hidden');
				}
			}, {
				key: "_debugBelaRunning",
				value: function _debugBelaRunning(status) {
					if (status) {
						if (!$('#run').hasClass('spinning')) {
							$('#run').addClass('spinning');
						}
					} else {
						if ($('#run').hasClass('spinning')) {
							$('#run').removeClass('spinning');
						}
					}
				}
			}, {
				key: "_debugRunning",
				value: function _debugRunning(status) {
					if (!status && $('#run').hasClass('spinning')) $('#run').removeClass('spinning');
				}
			}]);

			return ToolbarView;
		}(View);

		module.exports = ToolbarView;
	}, { "./View": 13 }], 13: [function (require, module, exports) {
		var EventEmitter = require('events').EventEmitter;

		var View = function (_EventEmitter2) {
			_inherits(View, _EventEmitter2);

			function View(CSSClassName, models, settings) {
				_classCallCheck(this, View);

				var _this34 = _possibleConstructorReturn(this, Object.getPrototypeOf(View).call(this));

				_this34.className = CSSClassName;
				_this34.models = models;
				_this34.settings = settings;
				_this34.$elements = $('.' + CSSClassName);
				_this34.$parents = $('.' + CSSClassName + '-parent');

				if (models) {
					for (var i = 0; i < models.length; i++) {
						models[i].on('change', function (data, changedKeys) {
							_this34.modelChanged(data, changedKeys);
						});
						models[i].on('set', function (data, changedKeys) {
							_this34.modelSet(data, changedKeys);
						});
					}
				}

				_this34.$elements.filter('select').on('change', function (e) {
					return _this34.selectChanged($(e.currentTarget), e);
				});
				_this34.$elements.filter('input').on('input', function (e) {
					return _this34.inputChanged($(e.currentTarget), e);
				});
				_this34.$elements.filter('input[type=checkbox]').on('change', function (e) {
					return _this34.inputChanged($(e.currentTarget), e);
				});
				_this34.$elements.filter('button').on('click', function (e) {
					return _this34.buttonClicked($(e.currentTarget), e);
				});

				return _this34;
			}

			_createClass(View, [{
				key: "modelChanged",
				value: function modelChanged(data, changedKeys) {
					var _iteratorNormalCompletion18 = true;
					var _didIteratorError18 = false;
					var _iteratorError18 = undefined;

					try {
						for (var _iterator18 = changedKeys[Symbol.iterator](), _step18; !(_iteratorNormalCompletion18 = (_step18 = _iterator18.next()).done); _iteratorNormalCompletion18 = true) {
							var value = _step18.value;

							if (this['_' + value]) {
								this['_' + value](data[value], data, changedKeys);
							}
						}
					} catch (err) {
						_didIteratorError18 = true;
						_iteratorError18 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion18 && _iterator18.return) {
								_iterator18.return();
							}
						} finally {
							if (_didIteratorError18) {
								throw _iteratorError18;
							}
						}
					}
				}
			}, {
				key: "modelSet",
				value: function modelSet(data, changedKeys) {
					var _iteratorNormalCompletion19 = true;
					var _didIteratorError19 = false;
					var _iteratorError19 = undefined;

					try {
						for (var _iterator19 = changedKeys[Symbol.iterator](), _step19; !(_iteratorNormalCompletion19 = (_step19 = _iterator19.next()).done); _iteratorNormalCompletion19 = true) {
							var value = _step19.value;

							if (this['__' + value]) {
								this['__' + value](data[value], data, changedKeys);
							}
						}
					} catch (err) {
						_didIteratorError19 = true;
						_iteratorError19 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion19 && _iterator19.return) {
								_iterator19.return();
							}
						} finally {
							if (_didIteratorError19) {
								throw _iteratorError19;
							}
						}
					}
				}
			}, {
				key: "selectChanged",
				value: function selectChanged(element, e) {}
			}, {
				key: "buttonClicked",
				value: function buttonClicked(element, e) {}
			}, {
				key: "printElements",
				value: function printElements() {
					console.log('elements:', this.$elements, 'parents:', this.$parents);
				}
			}]);

			return View;
		}(EventEmitter);

		module.exports = View;
	}, { "events": 17 }], 14: [function (require, module, exports) {
		'use strict';

		var EventEmitter = require('events').EventEmitter;
		//var $ = require('jquery-browserify');

		var enabled = true;

		// module variables
		var numElements = 0,
		    maxElements = 200,
		    consoleDelete = true;

		var Console = function (_EventEmitter3) {
			_inherits(Console, _EventEmitter3);

			function Console() {
				_classCallCheck(this, Console);

				var _this35 = _possibleConstructorReturn(this, Object.getPrototypeOf(Console).call(this));

				_this35.$element = $('#beaglert-consoleWrapper');
				_this35.parent = document.getElementById('beaglert-console');
				return _this35;
			}

			_createClass(Console, [{
				key: "block",
				value: function block() {
					enabled = false;
				}
			}, {
				key: "unblock",
				value: function unblock() {
					enabled = true;
				}
			}, {
				key: "print",
				value: function print(text, className, id, onClick) {
					if (!enabled) return;
					var el = $('<div></div>').addClass('beaglert-console-' + className).appendTo(this.$element);
					if (id) el.prop('id', id);
					$('<span></span>').html(text).appendTo(el);
					if (numElements++ > maxElements) this.clear(numElements / 4);
					if (onClick) el.on('click', onClick);
					return el;
				}

				// log an unhighlighted message to the console

			}, {
				key: "log",
				value: function log(text, css) {
					var msgs = text.split('\n');
					for (var i = 0; i < msgs.length; i++) {
						if (msgs[i] !== '' && msgs[i] !== ' ') {
							this.print(msgs[i], css || 'log');
						}
					}
					this.scroll();
				}
				// log a warning message to the console

			}, {
				key: "warn",
				value: function warn(text, id) {
					var msgs = text.split('\n');
					for (var i = 0; i < msgs.length; i++) {
						if (msgs[i] !== '') {
							this.print(msgs[i], 'warning', id, function () {
								var $el = $(this);
								$el.addClass('beaglert-console-collapsed');
								$el.on('transitionend', function () {
									if ($el.hasClass('beaglert-console-collapsed')) {
										$el.remove();
									} else {
										$el.addClass('beaglert-console-collapsed');
									}
								});
							});
						}
					}
					this.scroll();
				}
			}, {
				key: "newErrors",
				value: function newErrors(errors) {
					var _this36 = this;

					$('.beaglert-console-ierror, .beaglert-console-iwarning').remove();

					var _iteratorNormalCompletion20 = true;
					var _didIteratorError20 = false;
					var _iteratorError20 = undefined;

					try {
						var _loop3 = function _loop3() {
							var err = _step20.value;


							// create the element and add it to the error object
							div = $('<div></div>').addClass('beaglert-console-i' + err.type);

							// create the link and add it to the element

							anchor = $('<a></a>').html(err.text + ', line: ' + err.row).appendTo(div);


							div.appendTo(_this36.$element);

							if (err.currentFile) {
								div.on('click', function () {
									return _this36.emit('focus', { line: err.row + 1, column: err.column - 1 });
								});
							} else {
								div.on('click', function () {
									return _this36.emit('open-file', err.file, { line: err.row + 1, column: err.column - 1 });
								});
							}
						};

						for (var _iterator20 = errors[Symbol.iterator](), _step20; !(_iteratorNormalCompletion20 = (_step20 = _iterator20.next()).done); _iteratorNormalCompletion20 = true) {
							var div;
							var anchor;

							_loop3();
						}
					} catch (err) {
						_didIteratorError20 = true;
						_iteratorError20 = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion20 && _iterator20.return) {
								_iterator20.return();
							}
						} finally {
							if (_didIteratorError20) {
								throw _iteratorError20;
							}
						}
					}

					this.scroll();
				}

				// log a positive notification to the console
				// if persist is not true, the notification will be removed quickly
				// otherwise it will just fade

			}, {
				key: "notify",
				value: function notify(notice, id) {
					if (!enabled) return;
					$('#' + id).remove();
					var el = this.print(notice, 'notify', id);
					this.scroll();
					return el;
				}
			}, {
				key: "fulfill",
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
				key: "reject",
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
				key: "clear",
				value: function clear(number) {
					if (!consoleDelete) return;
					if (number) {
						$("#beaglert-consoleWrapper > div:lt(" + parseInt(number) + ")").remove();
						numElements -= parseInt(number);
					} else {
						$('#beaglert-consoleWrapper > div').remove();
						numElements = 0;
					}
				}

				// force the console to scroll to the bottom

			}, {
				key: "scroll",
				value: function scroll() {
					var _this37 = this;

					setTimeout(function () {
						return _this37.parent.scrollTop = _this37.parent.scrollHeight;
					}, 0);
				}
			}, {
				key: "setConsoleDelete",
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
	}, { "events": 17 }], 15: [function (require, module, exports) {
		//var $ = require('jquery-browserify');
		var IDE;

		$(function () {
			IDE = require('./IDE-browser');
		});
	}, { "./IDE-browser": 1 }], 16: [function (require, module, exports) {
		var overlay = $('#overlay');
		var parent = $('#popup');
		var content = $('#popup-content');
		var titleEl = parent.find('h1');
		var subEl = parent.find('p');
		var _formEl = parent.find('form');

		var popup = {
			show: function show() {
				overlay.addClass('active');
				parent.addClass('active');
				content.find('input[type=text]').first().trigger('focus');
			},
			hide: function hide() {
				overlay.removeClass('active');
				parent.removeClass('active');
				titleEl.empty();
				subEl.empty();
				_formEl.empty();
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
	}, {}], 17: [function (require, module, exports) {
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
		EventEmitter.prototype.setMaxListeners = function (n) {
			if (!isNumber(n) || n < 0 || isNaN(n)) throw TypeError('n must be a positive number');
			this._maxListeners = n;
			return this;
		};

		EventEmitter.prototype.emit = function (type) {
			var er, handler, len, args, i, listeners;

			if (!this._events) this._events = {};

			// If there is no 'error' event listener then throw.
			if (type === 'error') {
				if (!this._events.error || isObject(this._events.error) && !this._events.error.length) {
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

			if (isUndefined(handler)) return false;

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
				for (i = 0; i < len; i++) {
					listeners[i].apply(this, args);
				}
			}

			return true;
		};

		EventEmitter.prototype.addListener = function (type, listener) {
			var m;

			if (!isFunction(listener)) throw TypeError('listener must be a function');

			if (!this._events) this._events = {};

			// To avoid recursion in the case that type === "newListener"! Before
			// adding it to the listeners, first emit "newListener".
			if (this._events.newListener) this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);

			if (!this._events[type])
				// Optimize the case of one listener. Don't need the extra array object.
				this._events[type] = listener;else if (isObject(this._events[type]))
				// If we've already got an array, just append.
				this._events[type].push(listener);else
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
					console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
					if (typeof console.trace === 'function') {
						// not supported in IE 10
						console.trace();
					}
				}
			}

			return this;
		};

		EventEmitter.prototype.on = EventEmitter.prototype.addListener;

		EventEmitter.prototype.once = function (type, listener) {
			if (!isFunction(listener)) throw TypeError('listener must be a function');

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
		EventEmitter.prototype.removeListener = function (type, listener) {
			var list, position, length, i;

			if (!isFunction(listener)) throw TypeError('listener must be a function');

			if (!this._events || !this._events[type]) return this;

			list = this._events[type];
			length = list.length;
			position = -1;

			if (list === listener || isFunction(list.listener) && list.listener === listener) {
				delete this._events[type];
				if (this._events.removeListener) this.emit('removeListener', type, listener);
			} else if (isObject(list)) {
				for (i = length; i-- > 0;) {
					if (list[i] === listener || list[i].listener && list[i].listener === listener) {
						position = i;
						break;
					}
				}

				if (position < 0) return this;

				if (list.length === 1) {
					list.length = 0;
					delete this._events[type];
				} else {
					list.splice(position, 1);
				}

				if (this._events.removeListener) this.emit('removeListener', type, listener);
			}

			return this;
		};

		EventEmitter.prototype.removeAllListeners = function (type) {
			var key, listeners;

			if (!this._events) return this;

			// not listening for removeListener, no need to emit
			if (!this._events.removeListener) {
				if (arguments.length === 0) this._events = {};else if (this._events[type]) delete this._events[type];
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
				while (listeners.length) {
					this.removeListener(type, listeners[listeners.length - 1]);
				}
			}
			delete this._events[type];

			return this;
		};

		EventEmitter.prototype.listeners = function (type) {
			var ret;
			if (!this._events || !this._events[type]) ret = [];else if (isFunction(this._events[type])) ret = [this._events[type]];else ret = this._events[type].slice();
			return ret;
		};

		EventEmitter.prototype.listenerCount = function (type) {
			if (this._events) {
				var evlistener = this._events[type];

				if (isFunction(evlistener)) return 1;else if (evlistener) return evlistener.length;
			}
			return 0;
		};

		EventEmitter.listenerCount = function (emitter, type) {
			return emitter.listenerCount(type);
		};

		function isFunction(arg) {
			return typeof arg === 'function';
		}

		function isNumber(arg) {
			return typeof arg === 'number';
		}

		function isObject(arg) {
			return (typeof arg === "undefined" ? "undefined" : _typeof(arg)) === 'object' && arg !== null;
		}

		function isUndefined(arg) {
			return arg === void 0;
		}
	}, {}] }, {}, [15]);

//# sourceMappingURL=bundle.js.map
