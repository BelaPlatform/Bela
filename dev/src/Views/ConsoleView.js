'use strict';
var View = require('./View');
var _console = require('../console');

var shellCWD = '~';

var modeSwitches;

class ConsoleView extends View{

	constructor(className, models, settings){
		super(className, models, settings);		
		
		this.on('clear', force => _console.clear(undefined, force) );
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
		_console.warn(log);
		//_console.warn(log.split(' ').join('&nbsp;'));
	}
	__belaResult(data){
		//if (data.stderr && data.stderr.split) _console.warn(data.stderr.split(' ').join('&nbsp;'));
		//if (data.signal) _console.warn(data.signal);
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
			/*if (data && data.belaResult && data.belaResult.signal && data.belaResult.signal !== 'undefined'){
				_console.reject(' with signal '+data.belaResult.signal, timestamp, true);
			} else {*/
				_console.fulfill('', timestamp, true);
			//}
		}
	}
	
	_CPU(data){
		if (parseInt(this.settings.getKey('cpuMonitoringVerbose')) && data.bela && data.bela.split){
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
	
	_consoleDelete(value){
		_console.setConsoleDelete(parseInt(value));
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