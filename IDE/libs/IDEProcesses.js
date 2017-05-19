'use strict';
var Promise = require('bluebird');
var MakeProcess = require('./MakeProcess');
var ProjectManager = require('./ProjectManager');
var pusage = Promise.promisifyAll(require('pidusage'));
var pgrep = require('pgrep');
var fs = Promise.promisifyAll(require('fs-extra'));
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var belaPath = '/root/Bela/';
var makePath = belaPath;
var projectPath = belaPath+'projects/';

class SyntaxCheckProcess extends MakeProcess{
	
	constructor(){
		super('syntax');
		this.readingCLArgs = false;
	}
	
	start(project){
	
		if (this.readingCLArgs) return;	
		this.readingCLArgs = true;
		
		//console.log('getting clargs');
		_co(ProjectManager, 'getCLArgs', project)
			.then( (CLArgs) => {
				//console.log('got clargs');
				this.readingCLArgs = false;
				this.active = false;
				super.start(project, undefined, CLArgs.make);
			});

		return this;
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		var makeCPU;
		return super.CPU()
			.then((cpu) => {
				makeCPU = cpu;
				return pgrep.exec({
					name: 'clang'
				});
			})
			.map( pid => pusage.statAsync(pid) )
			.then((stats) => {
				for (let stat of stats){
					makeCPU += stat.cpu;
				}
				return makeCPU;
			})
			.catch((e) => {
				console.log('error calculating cpu', this.command);
				return Promise.resolve(makeCPU);
			});
	}
}

class buildProcess extends MakeProcess{

	constructor(){
		super('all');
	}
	
	start(project, _args, opts){
		
		this.buildError = false;
		
		_co(ProjectManager, 'getCLArgs', project)
			.then( (CLArgs) => {
				this.active = false;
				
				super.start(project, _args, CLArgs.make);
				
				this.childProcess.stderr.on('data', (data) => {
					// separate errors from warnings in the stderr of g++
					var lines = data.split('\n');
					for (let line of lines){
						// do not count warnings as buildErrors
						// this allows the executable to be built and run even with warnings
						line = line.split(':');
						if (line.length > 4){
							if (line[3] === ' error' || line[3] === ' fatal error'){
								this.buildError = true;
							} else if (line[3] === ' warning'){
								//console.log('warning');
							}
						}
					}
				});
				
			});

		return this;
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		var makeCPU;
		return super.CPU()
			.then((cpu) => {
				makeCPU = cpu;
				return pgrep.exec({
					name: 'clang'
				});
			})
			.map( pid => pusage.statAsync(pid) )
			.then((stats) => {
				for (let stat of stats){
					makeCPU += stat.cpu;
				}
				return makeCPU;
			})
			.catch((e) => {
				console.log('error calculating cpu', this.command);
				return Promise.resolve(makeCPU);
			});
	}

}

class belaProcess extends MakeProcess{

	constructor(){
		super('runide');
	}
	
	start(project){

		_co(ProjectManager, 'getCLArgs', project)
			.then( (CLArgs) => {
				this.active = false;
				if (this.next) {
					this.dequeue();
				} else {
					//this.args = ['-i0', '-o0', '-e0', projectPath+project+'/'+project];
					var args = '';
					for (let key in CLArgs) {
						if (key[0] === '-' && key[1] === '-'){
							args += key+'='+CLArgs[key]+' ';
						} else if (key === 'user'){
							args += CLArgs[key]+' ';
						} else if (key !== 'make' && key !== 'audioExpander' && CLArgs[key] !== ''){
							args += key+CLArgs[key]+' ';
						}
					}
				}
				
				// there's a bug where the name of the linux process gets cut off at 15 characters length
				this.projectName = project.substring(0, 15);
				
				this.mainPID = undefined;
				this.pgrepErrors = 0;
				
				super.start(project, args, CLArgs.make);
				
				var msd = spawn('stdbuf', ['-i0', '-e0', '-o0', belaPath+'IDE/bin/mode_switches_detector']);
				msd.stdout.setEncoding('utf8');
				msd.stderr.setEncoding('utf8');
				msd.stdout.on('data', data => this.emit('mode-switch', data.trim()) );
				msd.stderr.on('data', data => console.log('msd stderr:', data.trim()) );
				msd.on('close', code => console.log('msd exited with code', code) );

			});
		
		return this;
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		return fs.readFileAsync('/proc/xenomai/sched/stat', 'utf8');
	}
	
	CPULinux(){
	
		if (!this.active || !this.pid) return Promise.resolve(0);

		if (!this.mainPID){
			if (this.pgrepErrors > 2) return new Promise.resolve(0);
			return pgrep.exec({
					name: this.projectName
				})
				.then( pids => {
					if (this.pgrepErrors > 0) console.log('pgrep succeeded')
					this.mainPID = pids[0];
					return pusage.statAsync(pids[0]);
				})
				.catch( e => {
					console.log('error running pgrep', this.projectName, this.pgrepErrors);
					this.mainPID = undefined;
					this.pgrepErrors += 1;
					if (this.pgrepErrors > 2) console.log('pgrep abandoned');
					return {cpu: 0};
				});
		} else if (this.mainPID){
			return pusage.statAsync(this.mainPID)
				.catch( e => {
					console.log(e);
					this.mainPID = undefined;
					return {cpu: 0};
				});
		}

	}

}

class stopProcess extends MakeProcess{

	constructor(){
		super('stop');
	}

}

module.exports = {
	syntax	: new SyntaxCheckProcess(),
	build	: new buildProcess(),
	bela	: new belaProcess(),
	stop	: new stopProcess()
}

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}
