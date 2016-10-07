// IDE controller
module.exports = {};

var Model = require('./Models/Model');
var popup = require('./popup');

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
settingsView.on('error', text => consoleView.emit('warn', text) );

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
var fileView = new (require('./Views/FileView'))('fileManager', [models.project, models.settings]);
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
fileView.on('force-rebuild', () => {
	socket.emit('process-event', {
		event			: 'rebuild',
		currentProject	: models.project.getKey('currentProject')
	});
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
editorView.on('check-syntax', () => {
	if (parseInt(models.settings.getKey('liveSyntaxChecking'))){
		socket.emit('process-event', {
			event			: 'checkSyntax',
			currentProject	: models.project.getKey('currentProject'),
			newFile			: models.project.getKey('fileName')
		});
	}
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
editorView.on('goto-docs', (word, id) => {
	if (tabView.getOpenTab() === 'tab-5' && word !== 'BelaContext'){
		documentationView.emit('open', id);
	} else {
		$('#iDocsLink')
			.addClass('iDocsVisible')
			.prop('title', 'cmd + h: '+word)
			.off('click').on('click', () => {
				tabView.emit('open-tab', 'tab-5');
				documentationView.emit('open', id);
			});
	}
});
editorView.on('clear-docs', () => $('#iDocsLink').removeClass('iDocsVisible').off('click') );
editorView.on('highlight-syntax', (names) => socket.emit('highlight-syntax', names) );
editorView.on('compare-files', compare => {
	/*if (compare && !models.project.getKey('readOnly'))
		setCompareFilesInterval();
	else if (!compare && compareFilesInterval)
		clearInterval(compareFilesInterval);*/
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
toolbarView.on('mode-switch-warning', num => consoleView.emit('warn', num+' mode switch'+(num!=1?'es':'')+' detected on the audio thread!') );

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
var documentationView = new (require('./Views/DocumentationView'));
documentationView.on('open-example', (example) => {
	if (projectView.exampleChanged){
		projectView.exampleChanged = false;
		popup.exampleChanged( () => {
			projectView.emit('message', 'project-event', {
				func: 'openExample',
				currentProject: example
			});
			$('.selectedExample').removeClass('selectedExample');
		}, undefined, 0, () => projectView.exampleChanged = true );
		return;
	}
		
	projectView.emit('message', 'project-event', {
		func: 'openExample',
		currentProject: example
	});
	$('.selectedExample').removeClass('selectedExample');
});
documentationView.on('add-link', (link, type) => {
	editorView.emit('add-link', link, type);
});

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

// refresh file list
setInterval( () => socket.emit('list-files', models.project.getKey('currentProject')), 5000);

// setup socket
var socket = io('/IDE');

// socket events
socket.on('report-error', (error) => consoleView.emit('warn', error.message || error) );

socket.on('init', (data) => {
	
	consoleView.connect();
	
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
	
	// hack to stop changes to read-only example being overwritten when opening a new tab
	if (data[2].project === 'exampleTempProject') models.project.once('set', () => projectView.emit('example-changed') );

	// socket.io timeout	
	socket.io.engine.pingTimeout = 6000;
	socket.io.engine.pingInterval = 3000;
	
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
	/*if (debug){
		models.debug.setData(debug);
	}*/
	if (data.gitData) models.git.setData(data.gitData);
	setModifiedTimeInterval(data.mtime);
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
		models.project.setKey('fileList', list);
	}
});

socket.on('status', (status, project) => {
	if (project === models.project.getKey('currentProject') || project === undefined){
		models.status.setData(status);
		//console.log('status', status);
	}
});

socket.on('project-settings-data', (project, settings) => {
	// console.log('project-settings-data', settings);
	if (project === models.project.getKey('currentProject'))
		models.project.setData(settings);
});
socket.on('IDE-settings-data', (settings) => models.settings.setData(settings) );

socket.on('cpu-usage', data => models.status.setKey('CPU', data) );
socket.on('mode-switch', data => models.status.setKey('msw', data) );

socket.on('disconnect', () => {
	consoleView.disconnect();
	toolbarView.emit('disconnected');
	models.project.setKey('readOnly', true);
});

socket.on('file-changed', (project, fileName) => {
	if (project === models.project.getKey('currentProject') && fileName === models.project.getKey('fileName')){
		console.log('file changed!');
		if (compareFilesInterval) clearInterval(compareFilesInterval);
		models.project.setKey('readOnly', true);
		models.project.setKey('fileData', 'This file has been edited in another window. Reopen the file to continue');
		//socket.emit('project-event', {func: 'openFile', currentProject: project, fileName: fileName});
	}
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

socket.on('syntax-highlighted', () => editorView.emit('syntax-highlighted') );

socket.on('force-reload', () => window.location.reload(true) );

socket.on('mtime', setModifiedTimeInterval);
socket.on('mtime-compare', data => {
	if (data.currentProject === models.project.getKey('currentProject') && data.fileName === models.project.getKey('fileName')){
		// console.log(data, data.fileData, editorView.getData());
		if (data.fileData !== editorView.getData())
			fileChangedPopup(data.fileName);
	}
});

var checkModifiedTimeInterval;
function setModifiedTimeInterval(mtime){
	// console.log('received mtime', mtime);
	if (checkModifiedTimeInterval) clearInterval(checkModifiedTimeInterval);
	if (!mtime) return;
	checkModifiedTimeInterval = setInterval(() => {
		// console.log('sent compare-mtime', mtime);
		socket.emit('compare-mtime', {
			currentProject	:	models.project.getKey('currentProject'),
			fileName		:	models.project.getKey('fileName'),
			mtime
		});
	}, 5000);
}

// current file changed
var fileChangedPopupVisible = false;
function fileChangedPopup(fileName){
	
	if (fileChangedPopupVisible) return;
	
	popup.title('File Changed on Disk');
	popup.subtitle('Would you like to reload '+fileName+'?');
	
	var form = [];
	form.push('<button type="submit" class="button popup-save">Reload from Disk</button>');
	form.push('<button type="button" class="button popup-cancel">Keep Current</button>');
	
	popup.form.append(form.join('')).off('submit').on('submit', e => {
		fileChangedPopupVisible = false;
		e.preventDefault();
		var data = {
			func			: 'openProject', 
			currentProject	: models.project.getKey('currentProject'),
			timestamp		: performance.now()
		};
		socket.emit('project-event', data);
		consoleView.emit('openNotification', data);
		popup.hide();
	});
	
	popup.find('.popup-cancel').on('click', () => {
		popup.hide();
		fileChangedPopupVisible = false;
		editorView.emit('upload', editorView.getData());
	});
	
	popup.show();
	fileChangedPopupVisible = true;
}

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
	$('#top-open-project').html(projectName ? 'Project: '+projectName : '');
	$('#top-open-file').html(data.fileName ? 'File: '+data.fileName : '');
	
	if (data.exampleName){
		$('#top-example-docs').css('visibility', 'visible');
		$('#top-example-docs-link').prop('href', 'documentation/'+data.exampleName+'_2render_8cpp-example.html');
	} else {
		$('#top-example-docs').css('visibility', 'hidden');	
	}

});
models.status.on('change', (data, changedKeys) => {
	if (changedKeys.indexOf('running') !== -1 || changedKeys.indexOf('building') !== -1){
		if (data.running)
			$('#top-bela-status').html('Running: '+data.runProject);
		else if (data.building)
			$('#top-bela-status').html('Building: '+data.buildProject);
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
						text: '[warning] '+str.slice(4).join(':').slice(1) + '\ncolumn: '+str[2],
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

// hotkeys
var keypress = new window.keypress.Listener();

keypress.simple_combo("meta s", function(){ toolbarView.emit('process-event', 'run') });
keypress.simple_combo("meta o", function(){ tabView.emit('toggle') });
keypress.simple_combo("meta k", function(){ consoleView.emit('clear') });
keypress.simple_combo("meta h", function(){ $('#iDocsLink').trigger('click') });