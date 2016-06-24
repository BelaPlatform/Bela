'use strict';
// node modules
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var ngdbmi = require('./ngdbmi');
var util = require('util');
var pgrep = require('pgrep');
var pusage = Promise.promisifyAll(require('pidusage'));

var ProjectManager = require('./ProjectManager');
var projectPath = '/root/Bela/projects/';
var print_debug = true;

var maxChildren = 50, maxRecursions = 20;

class DebugManager extends EventEmitter {
	
	constructor(){
		super();
		this.running = false;
		this.recursionCounter = 0;
	}
	
	// start the debugger
	run(project, breakpoints){
	
		this.project = project;
		this.variables = [];
		this.numBreakpoints = breakpoints.length;
		
		_co(ProjectManager, 'getCLArgs', project)
			.then( (CLArgs) => {
				
				var args = ' ';
				
				for (let key in CLArgs) {
					if (key[0] === '-' && key[1] === '-'){
						args += (key+'='+CLArgs[key]+' ');
					} else {
						args += (key+CLArgs[key]+' ');
					}
				}

				// launch the process by giving ngdbmi the path to the project's binary
				this.process = new ngdbmi(projectPath+project+'/'+project+args);
				
				this.running = true;
				this.emit('status', {debugRunning: true, debugInterruptable: true});
		
				this.registerHandlers();
		
				_co(this, 'start', breakpoints)
					.catch(nonFatalDebuggerError, (e) => this.gdb_error(e, true))
					.catch((e) => this.gdb_error(e));
			
			});
		
	}
	
	// kill the debugger
	stop(){
		if (this.running){
			console.log('stopping');
			this.process.command('exit');
			setTimeout( () => this.process.interrupt(), 500);
		}
	}
	
	// listen to ngdbmi process events
	registerHandlers(){

		// Notify event
		this.process.on("notify", function( state ){
			if (!print_debug) return;
			console.log( "//-------------------NOTIFY----------------//" );
			console.log( JSON.stringify(state, null, "\t") );
			console.log( "//-----------------------------------------//" );
		});
		
		// Gdb close event
		this.process.on("close", (return_code, signal) => {
			this.running = false;
			this.emit('status', {
				gdbLog			: 'Debugger closed with code '+return_code+' '+signal, 
				debugStatus		: 'inactive', 
				debugRunning	: false
			});
		});
		
		// GDB output
		this.process.on('gdb', (data) => this.emit('status', {gdbLog: 'GDB> '+data}) );
		
		// Application output
		this.process.on('app', (data) => this.emit('status', {debugBelaLog: data}) );
		
	}
	
	// process ngdbmi command, return a promise
	command(cmd, opts){

		return new Promise( (resolve, reject) => {
	
			this.process.command(cmd, (state) => {
		
				if (print_debug){
					console.log( "//---------------------"+cmd+"-----------------//" );
					console.log( JSON.stringify(state, null, "\t") );
					console.log( "//-----------------------------------------//" );
				}

				resolve(JSON.parse(JSON.stringify(state)));
		
			}, opts);
		
		});

	}
	
	*start(breakpoints){
		
		this.emit('status', {
			debugBelaRunning	: false, 
			debugStatus			: 'setting breakpoints'
		});
		
		yield this.setBreakpoints(breakpoints);
		
		this.emit('status', {
			debugBelaRunning	: true, 
			debugStatus			: 'running'
		});
		
		var state = yield this.command('run');
		
		this.stopped(state);
			
		this.emit('status', {debugStatus: 'getting local variables'});

		var localVariables = yield this.getLocals();
		
		if (localVariables.length){
			yield _co(this, 'createVariables', localVariables);
			this.emit('variables', this.project, localVariables);
		}

		//console.log(util.inspect(this.variables, false, null));
		
		this.emit('status', {debugStatus: 'getting backtrace'});
		
		var frameState = yield this.command('stackListFrames');
		if (frameState && frameState.status && frameState.status.stack){
			let backtrace = [];
			for (let frame of frameState.status.stack){
				let output = frame.level+': '+frame.func;
				let location;
				if (frame.file) location = frame.file.split('/');
				else if (frame.from) location = frame.from.split('/');
				if (location && location.length) output += ': '+location[location.length-1];
				backtrace.push(output);
			}
			this.emit('status', {backtrace});
		}
		
		this.emit('status', {debugBelaRunning: false, debugStatus: 'idle'});
	}
	
	stopped(state){
		console.log('stopped', state);
		
		this.emit('status', {debugInterruptable: false});
				
		if (state.state !== 'stopped')
			throw(new nonFatalDebuggerError('bad frame state: '+state.state));
		
		// parse the reason for the halt
		var reason = state.status.reason, signal;
		if (reason === 'signal-received'){
			signal = reason+' '+state.status['signal-name']+' '+state.status['signal-meaning'];
		} else if (reason === 'exited'){
			throw('program exited');
		}
		if (reason) this.emit('status', {debugReason: reason});
		if (signal) this.emit('status', {debugSignal: signal});

		// check the frame data is valid && we haven't fallen off the end of the render function
		if (!state.status || !state.status.frame){
			throw(new nonFatalDebuggerError('bad frame data '+state.state));
		}
		if (state.status.frame.func === 'PRU::loop(rt_intr_placeholder*, void*)' || state.status.frame.func === 'Bela_initAudio(BelaInitSettings*, void*)'){
			console.log('debugger out of range');
			setTimeout(() => this.debugContinue(), 100);
			return;
		}
		
		try{
			// parse the location of the halt
			var path = state.status.frame.file.split('/');
			var file = path[path.length-1];
			var line = state.status.frame.line;
			//var frameAddr = state.status.frame.addr;
			//console.log('stopped, file '+file+' line '+line);
		}
		catch(e){
			this.emit('status', {gdbLog: 'GDB> '+JSON.stringify(state)})
			if (signal) throw('cannot parse halt location');
			else throw(new nonFatalDebuggerError('cannot parse halt location'));
		}
		
		this.emit('status', { 
			debugProject	: this.project,
			debugFile		: file,
			debugLine		: line
		});

	}
	
	setBreakpoints(breakpoints){
		return new Promise.mapSeries(breakpoints, (breakpoint) => this.command('breakInsert', {location: breakpoint.file+':'+(breakpoint.line+1)}) );
	}
	
	getLocals(){
		
		return this.command('stackListVariables', {skip: false, print: 2})
			.then((state) => {
				if (!state.status || (state.status.variables === undefined) )
					throw(new nonFatalDebuggerError('could not list variables'));
				
				return state.status.variables;
			});
		
	}
	
	// creates gdbmi variable objects for each top-level variable passed to it
	// recursively lists children with listChildren
	// implemented with coroutines to avoid stack overflows
	*createVariables(variables){

		for (let variable of variables){
		
			//console.log('STATUS: creating variable', variable);
						
			var state = yield this.command('varCreate', {'name': '-', 'frame': '*', 'expression': variable.name});
			if (!state.status){
				throw(new nonFatalError('bad varCreate return state'));
			}
			
			// save the variable's state
			if (state.status.name){
				variable.key = variable.name;
				variable.name = state.status.name;
			}
			if (state.status.value)
				variable.value = state.status.value;
			if (state.status.type)
				variable.type = state.status.type;
			if (state.status.numchild)
				variable.numchild = parseInt(state.status.numchild);
			
			if (variable.numchild) {
				console.log('STATUS: variable created, listing children', variable);
				this.recursionCounter = 0;
				variable = yield _co(this, 'listChildren', variable);
			} else {
				console.log('STATUS: variable created, no children', variable);
			}
			
		}
		
		return Promise.resolve();
		
	}
	
	// recursively lists children of variables
	*listChildren(variable){
	
		if (variable.numchild > maxChildren){
			console.log('too many children to list!');
			return variable;
		}
		
		if (this.recursionCounter++ > maxRecursions){
			console.log('max recursions reached');
			return variable;
		}
	
		//console.log('STATUS: listing children of', variable.name);
		
		// list the children of the variable, and save them in an array variable.children
		var state = yield this.command('varListChildren', {'print': 1, 'name': variable.name});
		
		if (state.state !== 'done' || !state.status.children || !state.status.children.length){
			console.log('error listing children', variable);
			return variable;
		}
		
		variable.children = state.status.children;
		//console.log(state.status.children);
		
		// iterate over the array of children and check if THEY have children themselves
		for (let child of variable.children){
			child.numchild = parseInt(child.numchild);
			//console.log('CHILD', child);
			
			// skip char variables for now - they sometimes cause parse errors in ngdmi
			if (child.type && child.type.indexOf('char') !== -1){
				//console.log('CHAR', child.name);
			} else if (child.numchild){
			
				// if the child has children, recursively call this.listChildren on it as a coroutine
				// so we wait for it to be finished before proceeding
				var grandchild = yield _co(this, 'listChildren', child);
				//console.log('GRANDCHILD', grandchild);
			}
		}
		//console.log('STATUS: finished listing children of', variable);
		return variable;
	}
	
	// execute a command (usually continue, step or next) and check if any
	// local variables have been changed
	*update(command){
	console.log('executing', command);
		var state = yield this.command(command);
		this.stopped(state);
		
		this.emit('status', {debugStatus: 'getting local variables'});
		console.log('getting locals');
		var localVariables = yield this.getLocals();
		
		if (localVariables && localVariables.length){
			yield _co(this, 'createVariables', localVariables);
			this.emit('variables', this.project, localVariables);
		}
		
		this.emit('status', {debugStatus: 'getting backtrace'});
		console.log('getting backtrace');
		var frameState = yield this.command('stackListFrames');
		if (frameState && frameState.status && frameState.status.stack){
			let backtrace = [];
			for (let frame of frameState.status.stack){
				let output = frame.level+': '+frame.func;
				let location;
				if (frame.file) location = frame.file.split('/');
				else if (frame.from) location = frame.from.split('/');
				if (location && location.length) output += ': '+location[location.length-1];
				backtrace.push(output);
			}
			this.emit('status', {backtrace});
		}
		
		this.emit('status', {debugBelaRunning: false, debugStatus: 'idle'});
		
	}
	

	// commands
	debugContinue(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugInterruptable	: true,
			debugStatus			: 'continuing to next breakpoint'
		});
		_co(this, 'update', 'continue')
			.catch(nonFatalDebuggerError, (e) => this.gdb_error(e, true))
			.catch((e) => this.gdb_error(e));
	}
	debugStep(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugStatus		: 'stepping'
		});
		_co(this, 'update', 'step')
			.catch(nonFatalDebuggerError, (e) => this.gdb_error(e, true))
			.catch((e) => this.gdb_error(e));
	}
	debugNext(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugStatus		: 'stepping over'
		});
		_co(this, 'update', 'next')
			.catch(nonFatalDebuggerError, (e) => this.gdb_error(e, true))
			.catch((e) => this.gdb_error(e));
	}
	debugFinish(){
		this.emit('status', {
			debugBelaRunning	: true,
			debugStatus		: 'stepping out'
		});
		_co(this, 'update', 'finish')
			.catch(nonFatalDebuggerError, (e) => this.gdb_error(e, true))
			.catch((e) => this.gdb_error(e));
	}
	debugInterrupt(){
		this.emit('status', {
			debugStatus		: 'interrupting'
		});
		_co(this, 'update', 'interrupt')
			.catch(nonFatalDebuggerError, (e) => this.gdb_error(e, true))
			.catch((e) => this.gdb_error(e));
	}
	exec(command){
		this.process.wrapper.write(command+'\n');
	}
	addBreakpoint(breakpoint){
		if (!this.running) return;
		console.log('adding breakpoint', breakpoint);
		this.setBreakpoints([breakpoint]).then(() => this.numBreakpoints += 1 );
	}
	removeBreakpoint(breakpoint){
		if (!this.running) return;
		console.log('removing breakpoint', breakpoint);
		var location = breakpoint.file+':'+(breakpoint.line+1);
		this.command('breakList')
			.then((state) => {
				if (state && state.status && state.status.BreakpointTable && state.status.BreakpointTable.body && state.status.BreakpointTable.body.length){
					for (let bp of state.status.BreakpointTable.body){
						if (bp['original-location'] === location) 
							return this.command('breakDelete', {id: bp.number}).then((state) => this.numBreakpoints -= 1 );
					}
				}
			});
	}
	
	CPU(){
		if (!this.running) return Promise.resolve(0);
		return pgrep.exec({
				name: 'gdb'
			})
			.then(pusage.statAsync)
			.then((stat) => stat.cpu )
			.catch((e) => console.log('error getting gdb CPU usage'));
		
	}
	gdb_error(e, nonFatal){
	console.log('emitting error', e, nonFatal);
		this.emit('error', e);
		
		if (e.stack)
			console.log('gdb error:', e, e.stack.split('\n'));
		
		if (nonFatal){
			this.emit('status', {debugRunning: false, debugInterruptable: false});
		} else {
			this.stop();
		}
	}
	
}

module.exports = new DebugManager();

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}

// custom errors
function nonFatalDebuggerError(message) {
	this.message = message;
	this.name = "nonFatalDebuggerError";
	Error.captureStackTrace(this, nonFatalDebuggerError);
}
nonFatalDebuggerError.prototype = Object.create(Error.prototype);
nonFatalDebuggerError.prototype.constructor = nonFatalDebuggerError;