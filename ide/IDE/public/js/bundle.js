(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
models.status.setData({running: false, building: false});
 
// set up views
// tab view
var tabView = require('./Views/TabView');
tabView.on('change', () => editorView.emit('resize') );

// settings view
var settingsView = new (require('./Views/SettingsView'))('settingsManager', [models.project, models.settings], models.settings);
settingsView.on('project-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('project-settings', data);
	socket.emit('project-settings', data);
});
settingsView.on('IDE-settings', (data) => {
	data.currentProject = models.project.getKey('currentProject');
	//console.log('IDE-settings', data);
	socket.emit('IDE-settings', data);
});
settingsView.on('run-on-boot', project => socket.emit('run-on-boot', project) );
settingsView.on('halt', () => {
	socket.emit('sh-command', 'halt');
	consoleView.emit('warn', 'Shutting down...');
});
settingsView.on('warning', text => consoleView.emit('warn', text) );
settingsView.on('upload-update', data => socket.emit('upload-update', data) );

// project view
var projectView = new (require('./Views/ProjectView'))('projectManager', [models.project]);
projectView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// file view
var fileView = new (require('./Views/FileView'))('fileManager', [models.project]);
fileView.on('message', (event, data) => {
	if (!data.currentProject && models.project.getKey('currentProject')){
		data.currentProject = models.project.getKey('currentProject');
	}
	if (!data.fileName && models.project.getKey('fileName')){
		data.fileName = models.project.getKey('fileName');
	}
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit(event, data);
});

// editor view
var editorView = new (require('./Views/EditorView'))('editor', [models.project, models.error, models.settings, models.debug], models.settings);
editorView.on('upload', fileData => {
	socket.emit('process-event', {
		event			: 'upload',
		currentProject	: models.project.getKey('currentProject'),
		newFile			: models.project.getKey('fileName'),
		fileData,
		checkSyntax		: parseInt(models.settings.getKey('liveSyntaxChecking'))
	});
});
editorView.on('breakpoint', line => {
	var breakpoints = models.project.getKey('breakpoints');
	for (let i=0; i<breakpoints.length; i++){
		if (breakpoints[i].line === line && breakpoints[i].file === models.project.getKey('fileName')){
			socket.emit('debugger-event', 'removeBreakpoint', breakpoints[i]);
			models.project.spliceFromKey('breakpoints', i);
			return;
		}
	}
	var newBreakpoint = {
		line,
		file: models.project.getKey('fileName')
	};
	socket.emit('debugger-event', 'addBreakpoint', newBreakpoint);
	models.project.pushIntoKey('breakpoints', newBreakpoint);
	//console.log('after', breakpoints);
	//models.project.setKey('breakpoints', breakpoints);
});
editorView.on('open-notification', data => consoleView.emit('openNotification', data) );
editorView.on('close-notification', data => consoleView.emit('closeNotification', data) );
editorView.on('editor-changed', () => {
	if (models.project.getKey('exampleName')) projectView.emit('example-changed');
});

// toolbar view
var toolbarView = new (require('./Views/ToolbarView'))('toolBar', [models.project, models.error, models.status, models.settings, models.debug]);
toolbarView.on('process-event', (event) => {
	var breakpoints;
	if (models.debug.getKey('debugMode')) breakpoints = models.project.getKey('breakpoints');
	var data = {
		event,
		currentProject	: models.project.getKey('currentProject'),
		debug			: models.debug.getKey('debugMode'),
		breakpoints
	};
	//data.timestamp = performance.now();
	if (event === 'stop') consoleView.emit('openProcessNotification', 'Stopping Bela...');
	socket.emit('process-event', data);
});
toolbarView.on('clear-console', () => consoleView.emit('clear') );

// console view
var consoleView = new (require('./Views/ConsoleView'))('IDEconsole', [models.status, models.project, models.error, models.settings, models.debug], models.settings);
consoleView.on('focus', (focus) =>  models.project.setKey('focus', focus) );
consoleView.on('open-file', (fileName, focus) => {
	var data = {
		func: 'openFile',
		fileName, 
		focus, 
		currentProject: models.project.getKey('currentProject')
	};
	socket.emit('project-event', data);
});
consoleView.on('input', value => socket.emit('sh-command', value) );
consoleView.on('tab', cmd => socket.emit('sh-tab', cmd) );

// debugger view
var debugView = new (require('./Views/DebugView'))('debugger', [models.debug, models.settings, models.project]);
debugView.on('debugger-event', (func) => socket.emit('debugger-event', func) );
debugView.on('debug-mode', (status) => models.debug.setKey('debugMode', status) );

// documentation view
var documentationView = new (require('./Views/DocumentationView'))

// git view
var gitView = new (require('./Views/GitView'))('gitManager', [models.git]);
gitView.on('git-event', data => {
	data.currentProject = models.project.getKey('currentProject');
	data.timestamp = performance.now();
	consoleView.emit('openNotification', data);
	socket.emit('git-event', data);
});
gitView.on('console', text => consoleView.emit('log', text, 'git') );
gitView.on('console-warn', text => consoleView.emit('warn', text) );

// refresh files
setInterval( () => socket.emit('list-files', models.project.getKey('currentProject')), 5000);

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => consoleView.emit('warn', error.message || error) );

socket.on('init', (data) => {
	
	consoleView.connect();
	
	//console.log(data);
	var timestamp = performance.now()
	socket.emit('project-event', {func: 'openProject', currentProject: data[2].project, timestamp})	
	consoleView.emit('openNotification', {func: 'init', timestamp});
	
	models.project.setData({projectList: data[0], exampleList: data[1], currentProject: data[2].project});
	models.settings.setData(data[2]);
	
	$('#runOnBoot').val(data[3]);
	
	models.status.setData(data[4]);
	
	//models.project.print();
	//models.settings.print();
	
	socket.emit('set-time', new Date().toString());
	
	documentationView.emit('init');
	
});

// project events
socket.on('project-data', (data) => {
	var debug;
	if (data.debug){
		debug = data.debug
		data.debug = undefined;
	}
	consoleView.emit('closeNotification', data);
	models.project.setData(data);
	if (debug){
		models.debug.setData(debug);
	}
	if (data.gitData) models.git.setData(data.gitData);
	//console.log(data);
	//models.settings.setData(data.settings);
	//models.project.print();
});
socket.on('stop-reply', (data) => {
	consoleView.emit('closeNotification', data);
});
socket.on('project-list', (project, list) =>  {
	//console.log(project, list);
	if (project && list.indexOf(models.project.getKey('currentProject')) === -1){
		// this project has just been deleted
		console.log('project-list', 'openProject');
		socket.emit('project-event', {func: 'openProject', currentProject: project});
	}
	models.project.setKey('projectList', list);
});
socket.on('file-list', (project, list) => {
	if (project && project === models.project.getKey('currentProject')){
		let currentFilenameFound = false;
		for (let item of list){
			if (item.name === models.project.getKey('fileName')){
				currentFilenameFound = true;
			}
		}
		if (!currentFilenameFound){
			// this file has just been deleted
			socket.emit('project-event', {func: 'openProject', currentProject: project});
		}
		models.project.setKey('fileList', list);
	}
});
socket.on('file-changed', (project, fileName) => {
	if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')){
		console.log('file changed!');
		models.project.setKey('readOnly', true);
		models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
		//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
	}
});

socket.on('status', (status, project) => {
	if (project === models.project.getKey('currentProject') || project === undefined){
		models.status.setData(status);
		//console.log('status', status);
	}
});

socket.on('project-settings-data', (project, settings) => {
	//console.log('project-settings-data', settings);
	if (project === models.project.getKey('currentProject'))
		models.project.setData(settings);
});
socket.on('IDE-settings-data', (settings) => models.settings.setData(settings) );

socket.on('cpu-usage', (data) => models.status.setKey('CPU', data) );

socket.on('disconnect', () => {
	consoleView.disconnect();
	toolbarView.emit('disconnected');
	models.project.setKey('readOnly', true);
});

socket.on('debugger-data', (data) => {
//console.log('b', data.debugProject, models.project.getKey('currentProject'), data.debugFile, models.project.getKey('fileName'));
	if (data.debugProject === undefined || data.debugProject === models.project.getKey('currentProject')){ 
		//(data.debugFile === undefined || data.debugFile === models.project.getKey('fileName'))){
		var debugFile = data.debugFile;
		if (debugFile && debugFile !== models.project.getKey('fileName')){
			//console.log(debugFile);
			var newData = {
				func			: 'openFile',
				currentProject	: models.project.getKey('currentProject'),
				fileName		: models.project.getKey('fileName'),
				newFile			: debugFile,
				timestamp		: performance.now(),
				debug			: {debugLine: data.debugLine, debugFile}
			};
			consoleView.emit('openNotification', newData);
			socket.emit('project-event', newData);
		} else {
			//console.log(data);
			models.debug.setData(data);
		}
	}
});
socket.on('debugger-variables', (project, variables) => {
	if (project === models.project.getKey('currentProject')){
		models.debug.setKey('variables', variables);
	}
});

// run-on-boot
socket.on('run-on-boot-log', text => consoleView.emit('log', text) );
//socket.on('run-on-boot-project', project => setTimeout( () => $('#runOnBoot').val(project), 100) );

// shell
socket.on('shell-event', (evt, data) => consoleView.emit('shell-'+evt, data) )

// generic log and warn
socket.on('std-log', text => consoleView.emit('log', text) );
socket.on('std-warn', text => consoleView.emit('warn', text) );

// model events
// build errors
models.status.on('set', (data, changedKeys) => {
	if (changedKeys.indexOf('syntaxError') !== -1){
		parseErrors(data.syntaxError);
	}
});
// debug mode
models.debug.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('debugMode') !== -1){
		//console.log(!data.debugMode, models.debug.getKey('debugRunning'));
		if (!data.debugMode && models.debug.getKey('debugRunning')) socket.emit('debugger-event', 'stop');
		var data = {
			func			: 'cleanProject',
			currentProject	: models.project.getKey('currentProject'),
			timestamp		: performance.now()
		};
		consoleView.emit('openNotification', data);
		socket.emit('project-event', data);
	}
});

// top-bar
models.project.on('change', (data, changedKeys) => {

	var projectName = data.exampleName ? data.exampleName+' (example)' : data.currentProject;

	// set the browser tab title
	$('title').html((data.fileName ? data.fileName+', ' : '')+projectName);
	
	// set the top-line stuff
	$('#top-open-project').html(projectName ? 'Open Project: '+projectName : '');
	$('#top-open-file').html(data.fileName ? 'Open File: '+data.fileName : '');
	
	if (data.exampleName){
		$('#top-example-docs').css('visibility', 'visible');
		$('#top-example-docs-link').prop('href', 'documentation/01-'+data.exampleName+'-example.html');
	} else {
		$('#top-example-docs').css('visibility', 'hidden');	
	}

});
models.status.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('running') !== -1 || changedKeys.indexOf('building') !== -1){
		if (data.running)
			$('#top-bela-status').html('Running Project: '+data.runProject);
		else if (data.building)
			$('#top-bela-status').html('Building Project: '+data.buildProject);
		else
			$('#top-bela-status').html('');
	}
});


// history
{
	let lastState = {}, poppingState = true;
	
	// file / project changed
	models.project.on('change', (data, changedKeys) => {
		if (changedKeys.indexOf('currentProject') !== -1 || changedKeys.indexOf('fileName') !== -1){
			var state = {file: data.fileName, project: data.currentProject};
			if (state.project !== lastState.project || state.file !== lastState.file){
				
				if (!poppingState){
					//console.log('push', state);
					history.pushState(state, null, null);
				}
				poppingState = false
				lastState = state;
			}
		}
	});

	// load previously open file / project when browser's back button is clicked
	window.addEventListener('popstate', function(e) {
		if (e.state){
			console.log('opening project '+e.state.project+' file '+e.state.file);
			var data = {
				currentProject	: e.state.project,
				fileName		: e.state.file,
				func			: 'openFile',
				timestamp 		: performance.now()
			};
			consoleView.emit('openNotification', data);
			socket.emit('project-event', data);
			poppingState = true;
		}
	});
}

// local functions
// parse errors from g++
function parseErrors(data){
//console.log('parsing', data, data.split('\n'));
	data = data.split('\n');
	
	var errors = [];
	for (let i=0; i<data.length; i++){

		// ignore errors which begin with 'make'
		if (data[i].length > 1 && data[i].slice(0,4) !== 'make'){
	
			var msg = data[i].split('\n');
		
			for (let j=0; j<msg.length; j++){
		
				var str = msg[j].split(':');
				//console.log(str);
				// str[0] -> file name + path
				// str[1] -> row number
				// str[2] -> column number
				// str[3] -> type of error
				// str[4+] > error message
			
				if (str[3] === ' error'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' fatal error'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "error"
					});
				} else if (str[3] == ' warning'){
					errors.push({
						file: str[0].split('/').pop(),
						row: str[1]-1,
						column: str[2],
						text: str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
						type: "warning"
					});
				} else {
					//console.log('rejected error string: '+str);
					if (str[2] && str[2].indexOf('linker') !== -1){
						console.log('linker error');
						consoleView.emit('warn', 'linker error detected, set verbose build output in settings for details');
					}
				}
			}
		}
	}

	// if no gcc errors have been parsed correctly, but make still thinks there is an error
	// error will contain string 'make: *** [<path>] Error 1'
	if (!errors.length && (data.indexOf('make: *** ') !== -1) && (data.indexOf('Error 1') !== -1)){
		errors.push({
			text: data,
			type: 'error'
		});
	}
	
	var currentFileErrors = [], otherFileErrors = [];
	for (let err of errors){
		if (!err.file || err.file === models.project.getKey('fileName')){
			err.currentFile = true;
			currentFileErrors.push(err);
		} else {
			err.currentFile = false;
			err.text = 'In file '+err.file+': '+err.text;
			otherFileErrors.push(err);
		}
	}
	
	models.error.setKey('allErrors', errors);
	models.error.setKey('currentFileErrors', currentFileErrors);
	models.error.setKey('otherFileErrors', otherFileErrors);
	
	models.error.setKey('verboseSyntaxError', data);

}

function getDateString(){

	var str = '';
	
	// get browser's system's time
	var date = new Date();
	
	// format into string suitable for linux date command
	var month = date.getMonth() + 1;
	if (month < 10){
		str += '0'+month;
	} else {
		str += month;
	}
	
	var day = date.getDate();
	if (day < 10){
		str += '0'+day;
	} else {
		str += day;
	}
	
	var hour = date.getHours();
	if (hour < 10){
		str += '0'+hour;
	} else {
		str += hour;
	}
	
	var minutes = date.getMinutes();
	if (minutes < 10){
		str += '0'+minutes;
	} else {
		str += minutes;
	}
	
	str += date.getFullYear();
	
	str += '.';
	
	var seconds = date.getSeconds();
	if (seconds < 10){
		str += '0'+seconds;
	} else {
		str += seconds;
	}
	
	return str;
	
}







},{"./Models/Model":2,"./Views/ConsoleView":3,"./Views/DebugView":4,"./Views/DocumentationView":5,"./Views/EditorView":6,"./Views/FileView":7,"./Views/GitView":8,"./Views/ProjectView":9,"./Views/SettingsView":10,"./Views/TabView":11,"./Views/ToolbarView":12}],2:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

class Model extends EventEmitter{

	constructor(data){
		super();
		var _data = data || {};
		this._getData = () => _data;
	}
	
	getKey(key){
		return this._getData()[key];
	}
	
	setData(newData){
		if (!newData) return;
		var newKeys = [];
		for (let key in newData){
			if (!_equals(newData[key], this._getData()[key], false)){
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
	
	setKey(key, value){
		if (!_equals(value, this._getData()[key], false)){
			this._getData()[key] = value;
			//console.log('changed setkey');
			this.emit('change', this._getData(), [key]);
		}
		this.emit('set', this._getData(), [key]);
	}
	
	pushIntoKey(key, value){
		this._getData()[key].push(value);
		this.emit('change', this._getData(), [key]);
		this.emit('set', this._getData(), [key]);
	}
	
	spliceFromKey(key, index){
		this._getData()[key].splice(index, 1);
		this.emit('change', this._getData(), [key]);
		this.emit('set', this._getData(), [key]);
	}
	
	print(){
		console.log(this._getData());
	}
	
}

module.exports = Model;

function _equals(a, b, log){
	if (log) console.log('a:', a, 'b:', b);
	if (a instanceof Array && b instanceof Array){
		if (log) console.log('arrays', 'a:', a, 'b:', b, (a.length === b.length), a.every( function(element, index){ return _equals(element, b[index], log) }));
		return ( (a.length === b.length) && a.every( function(element, index){ return _equals(element, b[index], log) }) );
	} else if (a instanceof Object && b instanceof Object){
		if (log) console.log('objects', 'a:', a, 'b:', b);
		for (let c in a){ 
			if (log) console.log('a[c]:', a[c], 'b[c]:', b[c], 'c:', c);
			if (!_equals(a[c], b[c], log)) return false;
		}
		return true;
	} else {
		if (log) console.log('a:', a, 'b:', b, Object.is(a, b), (a === b));
		return Object.is(a, b);
	}
}
	
	
	
	
	
	
	
},{"events":17}],3:[function(require,module,exports){
'use strict';
var View = require('./View');
var _console = require('../console');

var verboseDebugOutput = false;

var shellCWD = '~';

class ConsoleView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		
		
		this.on('clear', () => _console.clear() );
		_console.on('focus', (focus) => this.emit('focus', focus) );
		_console.on('open-file', (fileName, focus) => this.emit('open-file', fileName, focus) );
		
		this.on('openNotification', this.openNotification);
		this.on('closeNotification', this.closeNotification);
		this.on('openProcessNotification', this.openProcessNotification);

		this.on('log', (text, css) => _console.log(text, css));
		this.on('warn', function(warning, id){
			console.log(warning);
			_console.warn(warning, id);
		});
		
		this.form = document.getElementById('beaglert-consoleForm');
		this.input = document.getElementById('beaglert-consoleInput');
		
		// console command line input events
		this.history = [];
		this.historyIndex = 0;
		this.inputFocused = false;
		
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			
			this.history.push(this.input.value);
			this.historyIndex = 0;
		
			this.emit('input', this.input.value);
			_console.log(shellCWD+' '+this.input.value, 'log-in');
			this.input.value = '';
		});
		
		$('#beaglert-consoleInput-pre')
			.on('click', () => $(this.input).trigger('focus') );
		
		$('#beaglert-consoleInput-pre, #beaglert-consoleInput')
			.on('mouseover', function(){ $('#beaglert-consoleInput-pre').css('opacity', 1) })
			.on('mouseout', () => { if (!this.inputFocused) $('#beaglert-consoleInput-pre').css('opacity', 0.2) });
		
		this.input.addEventListener('focus', () => {
			this.inputFocused = true;
			$('#beaglert-consoleInput-pre').css('opacity', 1);//.html(shellCWD);
		});
		this.input.addEventListener('blur', () => {
			this.inputFocused = false;
			$('#beaglert-consoleInput-pre').css('opacity', 0.2);//.html('>');
		});
		window.addEventListener('keydown', (e) => {
			if (this.inputFocused){
				if (e.which === 38){	// up arrow
				
					if (this.history[this.history.length - ++this.historyIndex]){
						this.input.value = this.history[this.history.length - this.historyIndex];
					} else {
						this.historyIndex -= 1;
					}
					
					// force the cursor to the end
					setTimeout( () => {
						if(this.input.setSelectionRange !== undefined) {
							this.input.setSelectionRange(this.input.value.length, this.input.value.length);
						} else {
							$(this.input).val(this.input.value);
						}
					}, 0);
					
				} else if (e.which === 40){		// down arrow
					if (--this.historyIndex === 0){
						this.input.value = '';
					} else if (this.history[this.history.length - this.historyIndex]){
						this.input.value = this.history[this.history.length - this.historyIndex];
					} else {
						this.historyIndex += 1;
					}	
				} else if (e.which === 9){	// tab
					e.preventDefault();
					this.emit('tab', this.input.value);
				}
			}
		});
		
		$('#beaglert-console').on('click', () => $(this.input).trigger('focus') );
		$('#beaglert-consoleWrapper').on('click', (e) => e.stopPropagation() );
		
		this.on('shell-stdout', data => this.emit('log', data, 'shell') );
		this.on('shell-stderr', data => this.emit('warn', data) );
		this.on('shell-cwd', cwd => {
			//console.log('cwd', cwd);
			shellCWD = 'root@bela ' + cwd.replace('/root', '~') + '#';
			$('#beaglert-consoleInput-pre').html(shellCWD);
		});
		this.on('shell-tabcomplete', data => $('#beaglert-consoleInput').val(data) );
	}
	
	openNotification(data){
		//if (!funcKey[data.func]) console.log(data.func);
		if (data.func === 'command'){
			var output = 'Executing git ' + (data.command || '');
		} else if (data.func === 'editor'){
			var output = data.text;
		} else {
			var output = funcKey[data.func];
			if (data.newProject || data.currentProject) output += ' '+(data.newProject || data.currentProject);
			if (data.newFile || data.fileName) output += ' '+(data.newFile || data.fileName);
		}
		_console.notify(output+'...', data.timestamp);
	}
	closeNotification(data){
		if (data.error){
			_console.reject(' '+data.error, data.timestamp);
		} else {
			_console.fulfill(' done', data.timestamp);
		}
	}
	
	openProcessNotification(text){
		var timestamp = performance.now();
		_console.notify(text, timestamp);
		_console.fulfill('', timestamp, false);
	}
	
	connect(){
		$('#console-disconnect').remove();
		_console.unblock();
	}
	disconnect(){
		console.log('disconnected');
		_console.warn('You have been disconnected from the Bela IDE and any more changes you make will not be saved. Please check your USB connection and reboot your BeagleBone', 'console-disconnect');
		_console.block();
	}
	
	// model events
	// syntax
	_syntaxLog(log, data){
		if (this.settings.fullSyntaxCheckOutput){
			_console.log(log);
		}
	}
	__verboseSyntaxError(log, data){
		if (parseInt(this.settings.getKey('verboseErrors'))){
			for (let line of log){
				_console.log(line.split(' ').join('&nbsp;'), 'make');
			}
		}
	}
	__allErrors(errors, data){
	//console.log(data);
		_console.newErrors(errors);
	}
	
	// build
	_buildLog(log, data){
	//console.log(log, data);
		//if (this.settings.fullBuildOutput){
			_console.log(log, 'make');
		//}
	}
	
	// bela
	__belaLog(log, data){
		_console.log(log, 'bela');
	}
	__belaLogErr(log, data){
		//_console.warn(log);
		//_console.warn(log.split(' ').join('&nbsp;'));
	}
	__belaResult(data){
		if (data.stderr && data.stderr.split) _console.warn(data.stderr.split(' ').join('&nbsp;'));
		if (data.signal) _console.warn(data.signal);
		//console.log(data.signal)
	}
	
	_building(status, data){
		var timestamp = performance.now();
		if (status){
			_console.notify('Building project...', timestamp, true);
			_console.fulfill('', timestamp, true);
		} else {
			_console.notify('Build finished', timestamp, true);
			_console.fulfill('', timestamp, true);
		}
	}
	_running(status, data){
		var timestamp = performance.now();
		if (status){
			_console.notify('Running project...', timestamp, true);
			_console.fulfill('', timestamp, true);
		} else {
			_console.notify('Bela stopped', timestamp, true);
			if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined'){
				_console.reject(' with signal '+data.belaResult.signal, timestamp, true);
			} else {
				_console.fulfill('', timestamp, true);
			}
		}
	}
	
	_CPU(data){
		if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela != 0){
			_console.log(data.bela.split(' ').join('&nbsp;'));
		}
	}
	
	_consoleDelete(value){
		_console.setConsoleDelete(parseInt(value));
	}
	_verboseDebug(value){
		verboseDebugOutput = parseInt(value);
	}
	
	__debugReason(reason){
		console.log('reason', reason);
		var timestamp = performance.now();
		_console.notify(reason, timestamp, true);
		if (reason === 'exited' || reason === 'exited-signalled')
			_console.reject('', timestamp, true);
		else 
			_console.fulfill('', timestamp, false);
	}
	_debugSignal(signal){
		console.log('signal', signal);
		var timestamp = performance.now();
		_console.notify(signal, timestamp, true);
		_console.reject('', timestamp, true);
	}
	_gdbLog(data){
		if (verboseDebugOutput) _console.log(data);
		else console.log(data);
	}
	__debugBelaLog(data){
		_console.log(data);
	}

	
}

module.exports = ConsoleView;

var funcKey = {
	'openProject'	: 'Opening project',
	'openExample'	: 'Opening example',
	'newProject'	: 'Creating project',
	'saveAs'		: 'Saving project',
	'deleteProject'	: 'Deleting project',
	'cleanProject'	: 'Cleaning project',
	'openFile'		: 'Opening file',
	'newFile'		: 'Creating file',
	'uploadFile'	: 'Uploading file',
	'renameFile'	: 'Renaming file',
	'deleteFile'	: 'Deleting file',
	'init'			: 'Initialising',
	'stop'			: 'Stopping'
};
},{"../console":14,"./View":13}],4:[function(require,module,exports){
var View = require('./View');

class DebugView extends View {
	
	constructor(className, models){
		super(className, models);
		this._debugMode(false);
	}
	
	// UI events
	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		if (func && this[func]){
			this[func]($element.val());
		}
	}
	buttonClicked($element, e){
		this.setLocation('');
		this.emit('debugger-event', $element.data().func);
	}
	debugMode(status){
		this.emit('debug-mode', (status==true));
	}
	
	// model events
	_debugMode(status){
		if (!status){
			this.$parents.find('button').prop('disabled', 'disabled');
		}
	}
	// debugger process has started or stopped
	_debugRunning(status){
		this.clearVariableList();
		this.clearBacktrace();
		this.$parents.find('button').prop('disabled', 'disabled');
		if (!status) this.setLocation('n/a');
	}
	// debugger is doing something
	_debugBelaRunning(status){
		if (!status){
			this.$parents.find('button:not(#debugInterrupt)').prop('disabled', '');
			$('#expList, #backtraceList').removeClass('debuggerOutOfScope');
		} else {
			this.$parents.find('button:not(#debugInterrupt)').prop('disabled', 'disabled');
			$('#expList, #backtraceList').addClass('debuggerOutOfScope');
		}
	}
	_debugInterruptable(status){
		if (status) $('#debugInterrupt').prop('disabled', '');
		else $('#debugInterrupt').prop('disabled', 'disabled');
	}
	_debugStatus(value, data){
		if (value) this.setStatus(value);
	}
	_debugReason(value){
		this.setStatus($('#debuggerStatus').html()+', '+value);
	}
	_debugLine(line, data){
		var location = '';
		if (data.debugFile)
			location += data.debugFile+', line ';
		
		if (data.debugLine)
			location += data.debugLine;
		
		this.setLocation(location);
	}
	_variables(variables){
		console.log(variables);
		this.clearVariableList();
		for (let variable of variables){
			this.addVariable($('#expList'), variable);
		}
		prepareList();
	}
	_backtrace(trace){
		this.clearBacktrace();
		for (let item of trace){
			$('<li></li>').text(item).appendTo($('#backtraceList'));
		}
	}
	
	// utility methods
	setStatus(value){
		$('#debuggerStatus').html(value);
	}
	setLocation(value){
		$('#debuggerLocation').html(value);
	}
	clearVariableList(){
		$('#expList').empty();
	}
	clearBacktrace(){
		$('#backtraceList').empty();
	}
	addVariable(parent, variable){
		var name;
		if (variable.key) 
			name = variable.key;
		else {
			name = variable.name.split('.');
			if (name.length) name = name[name.length-1];
		}
		//console.log('adding variable', name, variable);
		var li = $('<li></li>');
		var table = $('<table></table>').appendTo(li);
		$('<td></td>').text(variable.type).addClass('debuggerType').appendTo(table);
		$('<td></td>').text(name).addClass('debuggerName').appendTo(table);
		var valTD = $('<td></td>').text(variable.value).addClass('debuggerValue').appendTo(table);
		li.attr('id', variable.name).appendTo(parent);
		if (variable.numchild && variable.children && variable.children.length){
			var ul = $('<ul></ul>').appendTo(li);
			for (let child of variable.children){
				this.addVariable(ul, child);
			}
		}
		if (variable.value == undefined){
			li.addClass('debuggerOutOfScope');
			valTD.text('out of scope');
		}
	}
}

module.exports = DebugView;

function prepareList() {
    $('#expList').find('li:has(ul)').each(function(){
    	var $this = $(this);
    	if (!$this.hasClass('collapsed')){
    		$this.click( function(event) {
				$(this).toggleClass('expanded');
				$(this).children('ul').toggle('fast');
				return false;
			})
			.addClass('collapsed')
			.children('ul').hide();
    	}
    });
    
};










},{"./View":13}],5:[function(require,module,exports){
var View = require('./View');

var apiFuncs = ['setup', 'render', 'cleanup', 'Bela_createAuxiliaryTask', 'Bela_scheduleAuxiliaryTask'];

class DocumentationView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.on('init', this.init);
	}
	
	init(){
		
		// The API
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=Bela_8h",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				for (let item of apiFuncs){
					var li = createlifrommemberdef($(xml).find('memberdef:has(name:contains('+item+'))'), 'APIDocs'+counter);
					li.appendTo($('#APIDocs'));
					counter += 1;
				}
			}
		});
		
		// The Audio Context
		$.ajax({
			type: "GET",
			url: "documentation_xml?file=structBelaContext",
			dataType: "xml",
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'contextDocs'+counter);
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
			success: function(xml){
				//console.log(xml);
				var counter = 0;
				$(xml).find('memberdef').each(function(){
					var li = createlifrommemberdef($(this), 'utilityDocs'+counter);
					li.appendTo($('#utilityDocs'));
					counter += 1;
				});
			}
		});
		
	}
	
}

module.exports = DocumentationView;

function createlifrommemberdef($xml, id){
	var li = $('<li></li>');
	li.append($('<input></input>').prop('type', 'checkbox').addClass('docs').prop('id', id));
	li.append($('<label></label>').prop('for', id).addClass('docSectionHeader').addClass('sub').html($xml.find('name').html()));
	
	var content = $('<div></div>');
	
	// title
	content.append($('<h2></h2>').html( $xml.find('definition').html() + $xml.find('argsstring').html() ));
	
	// subtitle
	content.append($('<h3></h3>').html( $xml.find('briefdescription > para').html() || '' ));
	
	// main text
	content.append($('<p></p>').html( $xml.find('detaileddescription > para').html() || '' ));

	li.append(content);
	return li;
}
},{"./View":13}],6:[function(require,module,exports){
var View = require('./View');
var Range = ace.require('ace/range').Range;

const uploadDelay = 50;

var uploadBlocked = false;
var currentFile;
var imageUrl;

class EditorView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.editor = ace.edit('editor');
		ace.require("ace/ext/language_tools");
		
		// set syntax mode
		this.editor.session.setMode('ace/mode/c_cpp');
		this.editor.$blockScrolling = Infinity;
		
		// set theme
		this.editor.setTheme("ace/theme/chrome");
		this.editor.setShowPrintMargin(false);
		
		// autocomplete settings
		this.editor.setOptions({
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: false,
			enableSnippets: true
		});
		
		// this function is called when the user modifies the editor
		this.editor.session.on('change', (e) => {
			//console.log('upload', !uploadBlocked);
			if (!uploadBlocked) this.editorChanged();
		});
		
		// set/clear breakpoints when the gutter is clicked
		this.editor.on("guttermousedown", (e) => { 
			var target = e.domEvent.target; 
			if (target.className.indexOf("ace_gutter-cell") == -1) 
				return; 
			if (!this.editor.isFocused()) 
				return; 
			if (e.clientX > 25 + target.getBoundingClientRect().left) 
				return; 

			var row = e.getDocumentPosition().row;

			this.emit('breakpoint', row);

			e.stop();

		});
		
		$('#audioControl').find('button').on('click', () => audioSource.start(0) );
		
		this.on('resize', () => this.editor.resize() );
		
	}
	
	editorChanged(){
		this.emit('editor-changed');
		clearTimeout(this.uploadTimeout);
		this.uploadTimeout = setTimeout( () => this.emit('upload', this.editor.getValue()), uploadDelay );
	}
	
	// model events
	// new file saved
	__fileData(data, opts){

		// hide the pd patch and image displays if present, and the editor
		$('#pd-svg-parent, #img-display-parent, #editor, #audio-parent').css('display', 'none');
		
		if (!opts.fileType) opts.fileType = '0';
		
		if (opts.fileType.indexOf('image') !== -1){
		
			// opening image file
			$('#img-display-parent, #img-display').css({
				'max-width'	: $('#editor').width()+'px',
				'max-height': $('#editor').height()+'px'
			});
			$('#img-display-parent').css('display', 'block');
			
			$('#img-display').prop('src', 'media/'+opts.fileName);
			
		} else if (opts.fileType.indexOf('audio') !== -1){
			
			//console.log('opening audio file');
			
			$('#audio-parent').css({
				'display'	: 'block',
				'max-width'	: $('#editor').width()+'px',
				'max-height': $('#editor').height()+'px'
			});
						
			$('#audio').prop('src', 'media/'+opts.fileName); 
			
		} else {
		
			if (opts.fileType === 'pd'){
			
				// we're opening a pd patch
				let timestamp = performance.now();
				this.emit('open-notification', {
					func: 'editor',
					timestamp,
					text: 'Rendering pd patch'
				});
		
				// render pd patch
				try{
					
					$('#pd-svg').html(pdfu.renderSvg(pdfu.parse(data), {svgFile: false})).css({
						'max-width'	: $('#editor').width()+'px',
						'max-height': $('#editor').height()+'px'
					});
					
					$('#pd-svg-parent').css({
						'display'	: 'block',
						'max-width'	: $('#editor').width()+'px',
						'max-height': $('#editor').height()+'px'
					});
					
					this.emit('close-notification', {timestamp});
					
				}
				catch(e){
					this.emit('close-notification', {
						timestamp,
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
	_focus(data){

		if (data && data.line !== undefined && data.column !== undefined)
			this.editor.gotoLine(data.line, data.column);
			
		this.editor.focus();
	}
	// syntax errors in current file have changed
	_currentFileErrors(errors){

		// clear any error annotations on the ace editor
		this.editor.session.clearAnnotations();

		if (errors.length >= 1){		
			// errors exist!
			// annotate the errors in this file
			this.editor.session.setAnnotations(errors);
						
		}
	}	
	// autocomplete settings have changed
	_liveAutocompletion(status){
	//console.log(status, (parseInt(status) === 1));
		this.editor.setOptions({
			enableLiveAutocompletion: (parseInt(status) === 1)
		});
	}
	// readonly status has changed
	_readOnly(status){
		if (status){
			this.editor.setReadOnly(true);
		} else {
			this.editor.setReadOnly(false);
		}
	}
	// a new file has been opened
	_fileName(name, data){
		currentFile = name;
		this.__breakpoints(data.breakpoints, data);
	}
	// breakpoints have been changed
	__breakpoints(breakpoints, data){
		//console.log('setting breakpoints', breakpoints);
		this.editor.session.clearBreakpoints();
		for (let breakpoint of breakpoints){
			if (breakpoint.file === data.fileName){
				this.editor.session.setBreakpoint(breakpoint.line);
			}
		}
	}
	// debugger highlight line has changed
	__debugLine(line, data){
	console.log(line, data.debugFile, currentFile);
		this.removeDebuggerMarker();
		
		// add new marker at line
		if (line && data.debugFile === currentFile){
			this.editor.session.addMarker(new Range(line-1, 0, line-1, 1), "breakpointMarker", "fullLine");
			this.editor.gotoLine(line, 0);
		}
	}
	// debugger process has started or stopped
	_debugRunning(status){
		if (!status){
			this.removeDebuggerMarker();
		}
	}
	_debugBelaRunning(status){
		if (status){
			this.removeDebuggerMarker();
		}
	}
	
	removeDebuggerMarker(){
		var markers = this.editor.session.getMarkers();
		
		// remove existing marker
		Object.keys(markers).forEach( (key,index) => {
			if (markers[key].clazz === 'breakpointMarker'){
				this.editor.session.removeMarker(markers[key].id);
			}
		});
	}
}

module.exports = EditorView;
},{"./View":13}],7:[function(require,module,exports){
var View = require('./View');
var popup = require('../popup');

var sourceIndeces = ['cpp', 'c', 'S'];
var headerIndeces = ['h', 'hh', 'hpp'];

var askForOverwrite = true;

class FileView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.listOfFiles = [];

		// hack to upload file
		$('#uploadFileInput').on('change', (e) => {
			for (let file of e.target.files){
				this.doFileUpload(file);
			}
		});
		
		// drag and drop file upload on editor
		$('body').on('dragenter dragover drop', (e) => {
			e.stopPropagation();
			if (e.type === 'drop'){
				for (let file of e.originalEvent.dataTransfer.files){
					this.doFileUpload(file);
				}
			}
			return false;
		});
	
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newFile(func){
	
		// build the popup content
		popup.title('Creating a new file');
		popup.subtitle('Enter the name of the new file. Only files with extensions .cpp, .c or .S will be compiled.');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter the file name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-create">Create</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	uploadFile(func){
		$('#uploadFileInput').trigger('click');
	}
	renameFile(func){
		
		// build the popup content
		popup.title('Renaming this file');
		popup.subtitle('Enter the new name of the file. Only files with extensions .cpp, .c or .S will be compiled.');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter the new file name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-rename">Rename</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newFile: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	deleteFile(func){
	
		// build the popup content
		popup.title('Deleting file');
		popup.subtitle('Are you sure you wish to delete this file? This cannot be undone!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-delete">Delete</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-delete').trigger('focus');
		
	}
	openFile(e){
		this.emit('message', 'project-event', {func: 'openFile', newFile: $(e.currentTarget).data('file')})
	}
	
	// model events
	_fileList(files, data){
	
		this.listOfFiles = files;

		var $files = $('#fileList')
		$files.empty();
		
		if (!files.length) return;

		var headers = [];
		var sources = [];
		var resources = [];
		var directories = [];
		
		for (let item of files){
		
			if (item.dir){
			
				directories.push(item);
				
			} else {
			
				let ext = item.name.split('.').pop();
			
				if (sourceIndeces.indexOf(ext) !== -1){
					sources.push(item);
				} else if (headerIndeces.indexOf(ext) !== -1){
					headers.push(item);
				} else if (item){
					resources.push(item);
				}
				
			}
			
		}
		
		//console.log(headers, sources, resources, directories);

		headers.sort( (a, b) => a.name - b.name );
		sources.sort( (a, b) => a.name - b.name );
		resources.sort( (a, b) => a.name - b.name );
		directories.sort( (a, b) => a.name - b.name );
		
		//console.log(headers, sources, resources, directories);
				
		if (headers.length){
			$('<li></li>').html('Headers:').appendTo($files);
		}
		for (let i=0; i<headers.length; i++){
			$('<li></li>').addClass('sourceFile').html(headers[i].name).data('file', headers[i].name).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (sources.length){
			$('<li></li>').html('Sources:').appendTo($files);
		}
		for (let i=0; i<sources.length; i++){
			$('<li></li>').addClass('sourceFile').html(sources[i].name).data('file', sources[i].name).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (resources.length){
			$('<li></li>').html('Resources:').appendTo($files);
		}
		for (let i=0; i<resources.length; i++){
			$('<li></li>').addClass('sourceFile').html(resources[i].name).data('file', resources[i].name).appendTo($files).on('click', (e) => this.openFile(e));
		}
		
		if (directories.length){
			$('<li></li>').html('Directories:').appendTo($files);
		}
		for (let dir of directories){
			$files.append(this.subDirs(dir));
		}
		
		if (data && data.fileName) this._fileName(data.fileName);
	}
	_fileName(file, data){

		// select the opened file in the file manager tab
		$('.selectedFile').removeClass('selectedFile');
		
		var foundFile = false
		$('#fileList li').each(function(){
			if ($(this).data('file') === file){
				$(this).addClass('selectedFile');
				foundFile = true;
			}
		});
				
		if (data && data.currentProject){
			// set download link
			$('#downloadFileLink').attr('href', '/download?project='+data.currentProject+'&file='+file);
		}
	}
	
	subDirs(dir){
		var ul = $('<ul></ul>').html(dir.name+':');
		for (let child of dir.children){
			if (!child.dir)
				$('<li></li>').addClass('sourceFile').html(child.name).data('file', (dir.dirPath || dir.name)+'/'+child.name).appendTo(ul).on('click', (e) => this.openFile(e));
			else {
				child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
				ul.append(this.subDirs(child));
			}
		}
		return ul;
	}
	
	doFileUpload(file){
	
		var fileExists = false;
		for (let item of this.listOfFiles){
			if (item.name === file.name) fileExists = true;
		}
		
		if (fileExists && askForOverwrite){

			// build the popup content
			popup.title('Overwriting file');
			popup.subtitle('The file '+file.name+' already exists in this project. Would you like to overwrite it?');
		
			var form = [];
			form.push('<input id="popup-remember-upload" type="checkbox">');
			form.push('<label for="popup-remember-upload">don\'t ask me again this session</label>')
			form.push('</br >');
			form.push('<button type="submit" class="button popup-upload">Upload</button>');
			form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
			popup.form.append(form.join('')).off('submit').on('submit', e => {
				e.preventDefault();
				if (popup.find('input[type=checkbox]').is(':checked')) askForOverwrite = false;
				this.actuallyDoFileUpload(file, true);
				popup.hide();
			});
		
			popup.find('.popup-cancel').on('click', popup.hide );
		
			popup.show();
			
			popup.find('.popup-cancel').focus();
			
		} else {
		
			this.actuallyDoFileUpload(file, !askForOverwrite);
			
		}
	}
	
	actuallyDoFileUpload(file, force){
		var reader = new FileReader();
		reader.onload = (ev) => this.emit('message', 'project-event', {func: 'uploadFile', newFile: sanitise(file.name), fileData: ev.target.result, force} );
		reader.readAsArrayBuffer(file);
	}
	
}

module.exports = FileView;

// replace all non alpha-numeric chars other than '-' and '.' with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-\/~]/g, '_');
}
},{"../popup":16,"./View":13}],8:[function(require,module,exports){
'use strict';
var View = require('./View');
var popup = require('../popup');

class GitView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		

		this.$form = $('#gitForm');
		this.$input = $('#gitInput');

		// git input events
		this.$form.on('submit', (e) => {
			e.preventDefault();
			this.emit('git-event', {
				func: 'command', 
				command: this.$input.val()
			});
			this.$input.val('');
		});
	}
	
	buttonClicked($element, e){
		var func = $element.data().func;
		if (this[func]){
			this[func]();
			return;
		}
		var command = $element.data().command;
		this.emit('git-event', {func, command});
	}
	
	selectChanged($element, e){
		this.emit('git-event', {
			func: 'command',
			command: 'checkout ' + ($("option:selected", $element).data('hash') || $("option:selected", $element).val())
		});
	}
	
	commit(){
	
		// build the popup content
		popup.title('Committing to the project repository');
		popup.subtitle('Enter a commit message');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter your commit message">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-commit">Commit</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('git-event', {func: 'command', command: 'commit -am "'+popup.find('input[type=text]').val()+'"'});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	branch(){
		
		// build the popup content
		popup.title('Creating a new branch');
		popup.subtitle('Enter a name for the branch');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter your new branch name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-create">Create</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('git-event', {func: 'command', command: 'checkout -b '+popup.find('input[type=text]').val()});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	
	discardChanges(){
		
		// build the popup content
		popup.title('Discarding changes');
		popup.subtitle('You are about to discard all changes made in your project since the last commit. The command used is "git checkout -- .". Are you sure you wish to continue? This cannot be undone.');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('git-event', {func: 'command', command: 'checkout -- .'});
			popup.hide();
		});
		
		popup.find('.popup-create').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
		
	}
	
	_repoExists(exists){
		if (exists){
			$('#repo').css('display', 'block');
			$('#noRepo').css('display', 'none');
		} else {
			$('#repo').css('display', 'none');
			$('#noRepo').css('display', 'block');
		}
	}
	__commits(commits, git){

		var commits = commits.split('\n');
		var current = git.currentCommit.trim();
		var branches = git.branches.split('\n');
		
		// fill commits menu
		var $commits = $('#commits');
		$commits.empty();

		var commit, hash, opt;
		for (var i=0; i<commits.length; i++){
			commit = commits[i].split(' ');
			if (commit.length > 2){
				hash = commit.pop().trim();
				opt = $('<option></option>').html(commit.join(' ')).data('hash', hash).appendTo($commits);
				if (hash === current){
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
		
		for (var i=0; i<branches.length; i++){
			if (branches[i]){
				opt = $('<option></option>').html(branches[i]).appendTo($branches);
				if (branches[i][0] === '*'){
					$(opt).attr('selected', 'selected');
				}
			}
		}
	}
	__stdout(text, git){
		this.emit('console', text);
	}
	__stderr(text){
		this.emit('console', text);
	}
	
}

module.exports = GitView;

},{"../popup":16,"./View":13}],9:[function(require,module,exports){
var View = require('./View');
var popup = require('../popup');

class ProjectView extends View {
	
	constructor(className, models){
		super(className, models);
		
		this.exampleChanged = false;
		this.on('example-changed', () => this.exampleChanged = true );
	}
	
	// UI events
	selectChanged($element, e){
	
		if (this.exampleChanged){
			this.exampleChanged = false;
			popup.exampleChanged( () => {
				this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()});
			}, undefined, 0, () => {
				$element.find('option').filter(':selected').attr('selected', '');
				$element.val($('#projects > option:first').val());
				this.exampleChanged = true;
			});
			return;
		}

		this.emit('message', 'project-event', {func: $element.data().func, currentProject: $element.val()})
		
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	newProject(func){

		if (this.exampleChanged){
			this.exampleChanged = false;
			popup.exampleChanged(this.newProject.bind(this), func, 500, () => this.exampleChanged = true );
			return;
		}
				
		// build the popup content
		popup.title('Creating a new project');
		popup.subtitle('Choose what kind of project you would like to create, and enter the name of your new project');
		
		var form = [];
		form.push('<input id="popup-C" type="radio" name="project-type" data-type="C" checked>');
		form.push('<label for="popup-C">C++</label>')
		form.push('</br>');
		form.push('<input id="popup-PD" type="radio" name="project-type" data-type="PD">');
		form.push('<label for="popup-PD">Pure Data</label>')
		form.push('</br>');
		form.push('<input type="text" placeholder="Enter your project name">');
		form.push('</br>');
		form.push('<button type="submit" class="button popup-save">Save</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {
				func, 
				newProject	: sanitise(popup.find('input[type=text]').val()),
				projectType	: popup.find('input[type=radio]:checked').data('type')
			});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	saveAs(func){
	
		// build the popup content
		popup.title('Saving project');
		popup.subtitle('Enter the name of your project');
		
		var form = [];
		form.push('<input type="text" placeholder="Enter the new project name">');
		form.push('</br >');
		form.push('<button type="submit" class="button popup-save">Save</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func, newProject: sanitise(popup.find('input[type=text]').val())});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();

	}
	deleteProject(func){

		// build the popup content
		popup.title('Deleting project');
		popup.subtitle('Are you sure you wish to delete this project? This cannot be undone!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-delete">Delete</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('message', 'project-event', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-delete').trigger('focus');
		
	}
	cleanProject(func){
		this.emit('message', 'project-event', {func});
	}
	
	// model events
	_projectList(projects, data){

		var $projects = $('#projects');
		$projects.empty();
		
		// add an empty option to menu and select it
		var opt = $('<option></option>').attr({'value': '', 'selected': 'selected'}).html('--Projects--').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				var opt = $('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}
		
		if (data && data.currentProject) this._currentProject(data.currentProject);
		
	}
	_exampleList(examplesDir){

		var $examples = $('#examples');
		$examples.empty();

		if (!examplesDir.length) return;

		for (let item of examplesDir){
			let ul = $('<ul></ul>').html(item.name+':');
			for (let child of item.children){
				if (child && child.length && child[0] === '.') continue;
				$('<li></li>').addClass('sourceFile').html(child).appendTo(ul)
					.on('click', (e) => {
					
						if (this.exampleChanged){
							this.exampleChanged = false;
							popup.exampleChanged( () => {
								this.emit('message', 'project-event', {
									func: 'openExample',
									currentProject: item.name+'/'+child
								});
								$('.selectedExample').removeClass('selectedExample');
								$(e.target).addClass('selectedExample');
							}, undefined, 0, () => this.exampleChanged = true );
							return;
						}
							
						this.emit('message', 'project-event', {
							func: 'openExample',
							currentProject: item.name+'/'+child
						});
						$('.selectedExample').removeClass('selectedExample');
						$(e.target).addClass('selectedExample');
						
					});
			}
			ul.appendTo($examples);
		}
		
	}
	_currentProject(project){
	
		// unselect currently selected project
		$('#projects').find('option').filter(':selected').attr('selected', '');
		
		if (project === 'exampleTempProject'){
			// select no project
			$('#projects').val($('#projects > option:first').val());
		} else {
			// select new project
			//$('#projects option[value="'+project+'"]').attr('selected', 'selected');
			$('#projects').val($('#projects > option[value="'+project+'"]').val());
			// unselect currently selected example
			$('.selectedExample').removeClass('selectedExample');
		}
		
		// set download link
		$('#downloadLink').attr('href', '/download?project='+project);
		
	}
	
	__currentProject(){
		this.exampleChanged = false;
	}
	
	subDirs(dir){
		var ul = $('<ul></ul>').html(dir.name+':');
		for (let child of dir.children){
			if (!child.dir)
				$('<li></li>').addClass('sourceFile').html(child.name).data('file', (dir.dirPath || dir.name)+'/'+child.name).appendTo(ul);
			else {
				child.dirPath = (dir.dirPath || dir.name) + '/' + child.name;
				ul.append(this.subDirs(child));
			}
		}
		return ul;
	}
	
}

module.exports = ProjectView;

// replace all non alpha-numeric chars other than '-' and '.' with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-]/g, '_');
}
},{"../popup":16,"./View":13}],10:[function(require,module,exports){
var View = require('./View');
var popup = require('../popup');

var inputChangedTimeout;

class SettingsView extends View {
	
	constructor(className, models, settings){
		super(className, models, settings);
		//this.$elements.filter('input').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.settings.on('change', (data) => this._IDESettings(data) );
		this.$elements.filterByData = function(prop, val) {
			return this.filter(
				function() { return $(this).data(prop)==val; }
			);
		}
		
		$('#runOnBoot').on('change', () => {
			if ($('#runOnBoot').val() && $('#runOnBoot').val() !== '--select--')
				this.emit('run-on-boot', $('#runOnBoot').val());
		});
		
		this.inputJustChanged = false;
		
	}
	
	selectChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		if (func && this[func]){
			this[func](func, key, $element.val());
		}
	}
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	inputChanged($element, e){
		var data = $element.data();
		var func = data.func;
		var key = data.key;
		var type = $element.prop('type');
		
		if (inputChangedTimeout) clearTimeout(inputChangedTimeout);
		inputChangedTimeout = setTimeout( () => this.inputJustChanged = false, 100);
		this.inputJustChanged = true;
		
		if (type === 'number' || type === 'text'){
			if (func && this[func]){
				this[func](func, key, $element.val());
			}
		} else if (type === 'checkbox'){
			if (func && this[func]){
				this[func](func, key, $element.is(':checked') ? 1 : 0);
			}
		}
	}
	
	setCLArg(func, key, value){
		this.emit('project-settings', {func, key, value});
	}
	restoreDefaultCLArgs(func){
		
		// build the popup content
		popup.title('Restoring default project settings');
		popup.subtitle('Are you sure you wish to continue? Your current project settings will be lost!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('project-settings', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');

	}
	
	setIDESetting(func, key, value){
	console.log(func, key, value);
		this.emit('IDE-settings', {func, key, value: value});
	}
	restoreDefaultIDESettings(func){
		
		// build the popup content
		popup.title('Restoring default IDE settings');
		popup.subtitle('Are you sure you wish to continue? Your current IDE settings will be lost!');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('IDE-settings', {func});
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
		
	}
	
	shutdownBBB(){
	
		// build the popup content
		popup.title('Shutting down Bela');
		popup.subtitle('Are you sure you wish to continue? The BeagleBone will shutdown gracefully, and the IDE will disconnect.');
		
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Continue</button>');
		form.push('<button type="button" class="button popup-cancel">Cancel</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			this.emit('halt');
			popup.hide();
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
		
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
	
	}
	aboutPopup(){
		
		// build the popup content
		popup.title('About Bela');
		popup.subtitle('You are using Bela Version 0.1, July 2016. Bela is an open source project licensed under GPL, and is a product of the Augmented Instruments Laboratory at Queen Mary University of London. For more information, visit http://bela.io');
		var form = [];
		form.push('<button type="submit" class="button popup-continue">Close</button>');
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			e.preventDefault();
			popup.hide();
		});
				
		popup.show();
		
		popup.find('.popup-continue').trigger('focus');
		
	}
	updateBela(){
	
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
		
		popup.form.append(form.join('')).off('submit').on('submit', e => {
			
			e.preventDefault();
			
			var file = popup.find('input[type=file]').prop('files')[0];
			if (file && file.type === 'application/zip'){
			
				this.emit('warning', 'Beginning the update - this may take several minutes');
				this.emit('warning', 'The browser may become unresponsive and will temporarily disconnect');
				this.emit('warning', 'Do not use the IDE during the update process!');
				
				var reader = new FileReader();
				reader.onload = (ev) => this.emit('upload-update', {name: file.name, file: ev.target.result} );
				reader.readAsArrayBuffer(file);
				
			} else {
			
				this.emit('warning', 'not a valid update zip archive');
				
			}
			
			popup.hide();
			
		});
		
		popup.find('.popup-cancel').on('click', popup.hide );
				
		popup.show();
		
	}
	
	// model events
	_CLArgs(data){
		var args = '';
		for (let key in data) {
		
			let el = this.$elements.filterByData('key', key);
			
			// set the input value when neccesary
			if (el[0].type === 'checkbox') {
				el.prop('checked', (data[key] == 1));
			} else if (key === '-C' || (el.val() !== data[key] && !this.inputJustChanged)){
				//console.log(el.val(), data[key]);
				el.val(data[key]);
			}

			// fill in the full string
			if (key[0] === '-' && key[1] === '-'){
				args += key+'='+data[key]+' ';
			} else if (key === 'user'){
				args += data[key];
			} else if (key !== 'make'){
				args += key+data[key]+' ';
			}
		}

		$('#C_L_ARGS').val(args);
	}
	_IDESettings(data){
		for (let key in data){
			this.$elements.filterByData('key', key).val(data[key]).prop('checked', data[key]);
		}
	}
	_breakpoints(value, keys){
		this.emit('project-settings', {func: 'setBreakpoints', value});
	}
	_projectList(projects, data){

		var $projects = $('#runOnBoot');
		$projects.empty();
		
		// add an empty option to menu and select it
		$('<option></option>').html('--select--').appendTo($projects);
		
		// add a 'none' option
		$('<option></option>').attr('value', 'none').html('none').appendTo($projects);

		// fill project menu with projects
		for (let i=0; i<projects.length; i++){
			if (projects[i] && projects[i] !== 'undefined' && projects[i] !== 'exampleTempProject' && projects[i][0] !== '.'){
				$('<option></option>').attr('value', projects[i]).html(projects[i]).appendTo($projects);
			}
		}

		
	}
}

module.exports = SettingsView;
},{"../popup":16,"./View":13}],11:[function(require,module,exports){
var View = require('./View');

// private variables
var _tabsOpen = false;

class TabView extends View {
	
	constructor(){
	
		super('tab');

		// open/close tabs 
		$('#flexit').on('click', () => {
			if (_tabsOpen){
				this.closeTabs();
			} else {				
				this.openTabs();
			}
		});

		$('.tab > label').on('click', (e) => {
			if (!_tabsOpen){
				if ($(e.currentTarget).prop('id') === 'tab-0' && $('[type=radio]:checked ~ label').prop('id') === 'tab-0')
					$('#file-explorer').parent().trigger('click');

				this.openTabs();
				e.stopPropagation();
			}
		});
		
		// golden layout
		var layout = new GoldenLayout({
			settings:{
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
					type:'row',
					content: [{
						type:'component',
						componentName: 'Editor',
					}]
				}, {
					type:'component',
					componentName: 'Console',
					height: 25
				}]
			}]
		});
		layout.registerComponent( 'Editor', function( container, componentState ){
			container.getElement().append($('#innerContent'));
		});
		layout.registerComponent( 'Console', function( container, componentState ){
			container.getElement().append($('#beaglert-console'));
		});
		
		layout.init();
		layout.on('initialised', () => this.emit('change') );
		layout.on('stateChanged', () => this.emit('change') );
		
		$(window).on('resize', () => {
			if (_tabsOpen){
				this.openTabs();
			} else {
				this.closeTabs();
			}
		});
		
	}
	
	openTabs(){
		$('#editor').css('right', '500px');
		$('#top-line').css('margin-right', '500px');
		$('#right').css('left', window.innerWidth - 500 + 'px');
		_tabsOpen = true;
		this.emit('change');
		$('#tab-0').addClass('open');
		
		// fix pd patch
		$('#pd-svg-parent').css({
			'max-width'	: $('#editor').width()+'px',
			'max-height': $('#editor').height()+'px'
		});
	}

	closeTabs(){
		$('#editor').css('right', '60px');
		$('#top-line').css('margin-right', '60px');
		$('#right').css('left', window.innerWidth - 60 + 'px');
		_tabsOpen = false;
		this.emit('change');
		$('#tab-0').removeClass('open');
		
		// fix pd patch
		$('#pd-svg-parent').css({
			'max-width'	: $('#editor').width()+'px',
			'max-height': $('#editor').height()+'px'
		});
		
	}
	
}

module.exports = new TabView();
},{"./View":13}],12:[function(require,module,exports){
var View = require('./View');

// ohhhhh i am a comment

class ToolbarView extends View {
	
	constructor(className, models){
		super(className, models);

		this.$elements.on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
		this.on('disconnected', () => {
			$('#run').removeClass('spinning');
		});
		
		$('#run')
			.mouseover(function() {
				$('#control-text-1').html('<p>Run</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});
		
		$('#stop')
			.mouseover(function() {
				$('#control-text-1').html('<p>Stop</p>');
			})
			.mouseout(function() {
				$('#control-text-1').html('');
			});

		$('#new-tab')
			.mouseover(function() {
				$('#control-text-2').html('<p>New Tab</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});
		
		$('#download')
			.mouseover(function() {
				$('#control-text-2').html('<p>Download</p>');
			})
			.mouseout(function() {
				$('#control-text-2').html('');
			});

		$('#console')
			.mouseover(function() {
				$('#control-text-3').html('<p>Clear console</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
		
		$('#scope')
			.mouseover(function() {
				$('#control-text-3').html('<p>Open scope</p>');
			})
			.mouseout(function() {
				$('#control-text-3').html('');
			});
	}
	
	// UI events
	buttonClicked($element, e){
		var func = $element.data().func;
		if (func && this[func]){
			this[func](func);
		}
	}
	
	run(func){
		this.emit('process-event', func);
	}
	
	stop(func){
		this.emit('process-event', func);
	}
	
	clearConsole(){
		this.emit('clear-console');
	}
	
	// model events
	__running(status){
		if (status){
			$('#run').removeClass('building-button').addClass('running-button');
		} else {
			$('#run').removeClass('running-button');
		}
	}
	__building(status){
		if (status){
			$('#run').removeClass('running-button').addClass('building-button');
		} else {
			$('#run').removeClass('building-button');
		}
	}
	__checkingSyntax(status){
		if (status){
			$('#status').css('background', 'url("images/icons/status_wait.png")').prop('title', 'checking syntax...');
		} else {
			//this.syntaxTimeout = setTimeout(() => $('#status').css('background', 'url("images/toolbar.png") -140px 35px'), 10);
		}
	}
	__allErrors(errors){
		//if (this.syntaxTimeout) clearTimeout(this.syntaxTimeout); 
		if (errors.length){
			$('#status').css('background', 'url("images/icons/status_stop.png")').prop('title', 'syntax errors found'); 
		} else {
			$('#status').css('background', 'url("images/icons/status_ok.png")').prop('title', 'syntax check clear');
		}
	}
	
	_CPU(data){

		var ide = data.syntaxCheckProcess + data.buildProcess + data.node + data.gdb;
		var bela = 0, rootCPU = 1;
		
		if (data.bela != 0){
		
			// extract the data from the output
			var lines = data.bela.split('\n');
			var taskData = [], output = [];
			for (var j=0; j<lines.length; j++){
				taskData.push([]);
				lines[j] = lines[j].split(' ');
				for (var k=0; k<lines[j].length; k++){
					if (lines[j][k]){
						taskData[j].push(lines[j][k]);
					}
				}
			}
				
			for (var j=0; j<taskData.length; j++){
				if (taskData[j].length){
					var proc = {
						'name'	: taskData[j][7],
						'cpu'	: taskData[j][6],
						'msw'	: taskData[j][2],
						'csw'	: taskData[j][3]
					};
					if (proc.name === 'ROOT') rootCPU = proc.cpu*0.01;
					// ignore uninteresting data
					if (proc && proc.name && proc.name !== 'ROOT' && proc.name !== 'NAME' && proc.name !== 'IRQ29:'){
						output.push(proc);
					}
				}
			}
	
			for (var j=0; j<output.length; j++){
				if (output[j].cpu){
					bela += parseFloat(output[j].cpu);
				}
			}
				
		
		}

		$('#ide-cpu').html('IDE: '+(ide*rootCPU).toFixed(1)+'%');
		$('#bela-cpu').html('Bela: '+( bela ? bela.toFixed(1)+'%' : '--'));
	}
	
	_cpuMonitoring(value){
		if (parseInt(value))
			$('#ide-cpu, #bela-cpu').css('visibility', 'visible');
		else
			$('#ide-cpu, #bela-cpu').css('visibility', 'hidden');
	}
	
	_debugBelaRunning(status){
		if (status){
			if (!$('#run').hasClass('spinning')){
				$('#run').addClass('spinning');
			}
		} else {
			if ($('#run').hasClass('spinning')){
				$('#run').removeClass('spinning');
			}
		}
	}
	_debugRunning(status){
		if (!status && $('#run').hasClass('spinning'))  $('#run').removeClass('spinning');
	}
	
}

module.exports = ToolbarView;
},{"./View":13}],13:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

class View extends EventEmitter{

	constructor(CSSClassName, models, settings){
		super();
		this.className = CSSClassName;
		this.models = models;
		this.settings = settings;
		this.$elements = $('.'+CSSClassName);
		this.$parents = $('.'+CSSClassName+'-parent');
		
		if (models){
			for (var i=0; i<models.length; i++){
				models[i].on('change', (data, changedKeys) => {
					this.modelChanged(data, changedKeys);
				});
				models[i].on('set', (data, changedKeys) => {
					this.modelSet(data, changedKeys);
				});
			}
		}
		
		this.$elements.filter('select').on('change', (e) => this.selectChanged($(e.currentTarget), e));
		this.$elements.filter('input').on('input', (e) => this.inputChanged($(e.currentTarget), e));
		this.$elements.filter('input[type=checkbox]').on('change', (e) => this.inputChanged($(e.currentTarget), e));
		this.$elements.filter('button').on('click', (e) => this.buttonClicked($(e.currentTarget), e));
		
	}
	
	modelChanged(data, changedKeys){
		for (let value of changedKeys){
			if (this['_'+value]){
				this['_'+value](data[value], data, changedKeys);
			}
		}
	}
	modelSet(data, changedKeys){
		for (let value of changedKeys){
			if (this['__'+value]){
				this['__'+value](data[value], data, changedKeys);
			}
		}
	}
	
	selectChanged(element, e){}
	buttonClicked(element, e){}
	
	printElements(){
		console.log('elements:', this.$elements, 'parents:', this.$parents);
	}
		
}

module.exports = View;
},{"events":17}],14:[function(require,module,exports){
'use strict';
var EventEmitter = require('events').EventEmitter;
//var $ = require('jquery-browserify');

var enabled = true;

// module variables
var numElements = 0, maxElements = 200, consoleDelete = true;

class Console extends EventEmitter {

	constructor(){
		super();
		this.$element = $('#beaglert-consoleWrapper');
		this.parent = document.getElementById('beaglert-console');
	}
	
	block(){
		enabled = false;
	}
	unblock(){
		enabled = true;
	}
	
	print(text, className, id, onClick){
		if (!enabled) return;
		var el = $('<div></div>').addClass('beaglert-console-'+className).appendTo(this.$element);
		if (id) el.prop('id', id);
		$('<span></span>').html(text).appendTo(el);
		if (numElements++ > maxElements) this.clear(numElements/4);
		if (onClick) el.on('click', onClick);
		return el;
	}

	// log an unhighlighted message to the console
	log(text, css){
		var msgs = text.split('\n');
		for (let i=0;  i<msgs.length; i++){
			if (msgs[i] !== '' && msgs[i] !== ' '){
				this.print(msgs[i], css || 'log');
			}
		}
		this.scroll();
	}
	// log a warning message to the console
	warn(text, id){
		var msgs = text.split('\n');
		for (let i=0;  i<msgs.length; i++){
			if (msgs[i] !== ''){
				this.print(msgs[i], 'warning', id, function(){ 
					var $el = $(this);
					$el.addClass('beaglert-console-collapsed');
					$el.on('transitionend', () => {
						if ($el.hasClass('beaglert-console-collapsed')){
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
	
	newErrors(errors){
	
		$('.beaglert-console-ierror, .beaglert-console-iwarning').remove();
		
		for (let err of errors){
		
			// create the element and add it to the error object
			var div = $('<div></div>').addClass('beaglert-console-i'+err.type)
			
			// create the link and add it to the element
			var anchor = $('<a></a>').html(err.text+', line: '+err.row).appendTo(div);
			
			div.appendTo(this.$element);
			
			if (err.currentFile){
				div.on('click', () => this.emit('focus', {line: err.row+1, column: err.column-1}) );
			} else {
				div.on('click', () => this.emit('open-file', err.file, {line: err.row+1, column: err.column-1}) );
			}
			
		}
		this.scroll();
	}
	
	// log a positive notification to the console
	// if persist is not true, the notification will be removed quickly
	// otherwise it will just fade
	notify(notice, id){
		if (!enabled) return;
		$('#'+id).remove();
		var el = this.print(notice, 'notify', id);
		this.scroll();
		return el;
	}
	
	fulfill(message, id, persist){
		if (!enabled) return;
		var el = document.getElementById(id);
		//if (!el) el = this.notify(message, id);
		var $el = $(el);
		$el.appendTo(this.$element);//.removeAttr('id');
		$el.html($el.html()+message);
		setTimeout( () => $el.addClass('beaglert-console-faded'), 500);
		if (!persist){
			$el.on('transitionend', () => {
				if ($el.hasClass('beaglert-console-collapsed')){
					$el.remove();
				} else {
					$el.addClass('beaglert-console-collapsed');
				}
			});
		}
	}
	
	reject(message, id, persist){
		var el = document.getElementById(id);
		//if (!el) el = this.notify(message, id);
		var $el = $(el);
		$el.appendTo(this.$element);//.removeAttr('id');
		$el.html($el.html()+message);
		$el.addClass('beaglert-console-rejectnotification');
		setTimeout( () => $el.removeClass('beaglert-console-rejectnotification').addClass('beaglert-console-faded'), 500);
		$el.on('click', () => $el.addClass('beaglert-console-collapsed').on('transitionend', () => $el.remove() ));
	}
	
	// clear the console
	clear(number){
		if (!consoleDelete) return;
		if (number){
			$("#beaglert-consoleWrapper > div:lt("+parseInt(number)+")").remove();
			numElements -= parseInt(number);
		} else {
			$('#beaglert-consoleWrapper > div').remove();
			numElements = 0;
		}
	}
	
	// force the console to scroll to the bottom
	scroll(){
		setTimeout((() => this.parent.scrollTop = this.parent.scrollHeight), 0);
	}
	
	setConsoleDelete(to){
		consoleDelete = to;
	}
	
};

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
},{"events":17}],15:[function(require,module,exports){
//var $ = require('jquery-browserify');
var IDE;

$(() => {
	IDE = require('./IDE-browser');
});


},{"./IDE-browser":1}],16:[function(require,module,exports){
var overlay	= $('#overlay');
var parent	= $('#popup');
var content	= $('#popup-content');
var titleEl	= parent.find('h1');
var subEl	= parent.find('p');
var formEl	= parent.find('form');

var popup = {
	
	show(){
		overlay.addClass('active');
		parent.addClass('active');
		content.find('input[type=text]').first().trigger('focus');
	},
	
	hide(){
		overlay.removeClass('active');
		parent.removeClass('active');
		titleEl.empty();
		subEl.empty();
		formEl.empty();
	},
	
	find: selector => content.find(selector),
	
	title: text => titleEl.text(text),
	subtitle: text => subEl.text(text),
	formEl: html => formEl.html(html),
	
	append: child => content.append(child),
	
	form: formEl,
	
	exampleChanged: example
	
};

module.exports = popup;

function example(cb, arg, delay, cancelCb){

	// build the popup content
	popup.title('Save your changes?');
	popup.subtitle('You have made changes to an example project. If you continue, your changes will be lost. To keep your changes, click cancel and then Save As in the project manager tab');
	
	var form = [];
	form.push('<button type="submit" class="button popup-continue">Continue</button>');
	form.push('<button type="button" class="button popup-cancel">Cancel</button>');
	
	popup.form.append(form.join('')).off('submit').on('submit', e => {
		e.preventDefault();
		setTimeout(function(){
			cb(arg);
		}, delay);
		popup.hide();
	});
		
	popup.find('.popup-cancel').on('click', () => {
		popup.hide();
		if (cancelCb) cancelCb();
	});
	
	popup.show();
	
	popup.find('.popup-continue').trigger('focus');
	
}
},{}],17:[function(require,module,exports){
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

},{}]},{},[15])


//# sourceMappingURL=bundle.js.map
