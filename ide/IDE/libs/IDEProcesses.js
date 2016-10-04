'use strict';
var Promise = require('bluebird');
var MakeProcess = require('./MakeProcess');
var ProjectManager = require('./ProjectManager');
var pusage = Promise.promisifyAll(require('pidusage'));
var pgrep = require('pgrep');
var fs = Promise.promisifyAll(require('fs-extra'));

var belaPath = '/root/Bela/';
var makePath = belaPath;
var projectPath = belaPath+'projects/';

class SyntaxCheckProcess extends MakeProcess{
	
	constructor(){
		super('syntax');
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
							args += CLArgs[key];
						} else if (key !== 'make' && key !== 'audioExpander' && CLArgs[key] !== ''){
							args += key+CLArgs[key]+' ';
						}
					}
				}
				super.start(project, args, CLArgs.make);
			});
		
		return this;
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		return fs.readFileAsync('/proc/xenomai/stat', 'utf8');
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