'use strict';
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var treeKill = require('tree-kill');
var Promise = require('bluebird');
var pusage = Promise.promisifyAll(require('pidusage'));

var belaPath = '/root/Bela/';
var makePath = belaPath;
var projectPath = belaPath+'projects/';

class MakeProcess extends EventEmitter{

	constructor(target){
		super();
		this.active = false;
		this.target = target;
		this.args = ['--no-print-directory', '-C', makePath];
		this.stdout = [];
		this.stderr = [];
		this.project = '';
	}
	
	/*execute(){
		if (this.active) return;
		this.start();
	}*/
	
	start(project, _args, makeParams){
	
		if (this.active){
			console.log('process '+this.target+' already active');
			return;
		}

		// make a local copy of this.args
		var args = this.args.slice();
		
		args.push(this.target);
		
		if (project !== undefined){
			args.push('PROJECT='+project);
			this.project = project;
		}
		
		if (_args){
			args.push('CL='+_args);
		}
		
		if (makeParams && makeParams.split){
			let makeArgs = makeParams.split(';');
			for (let arg of makeArgs){
				arg = arg.trim();
				if(arg.length > 0){
					args.push(arg);
				}
			}
		}

		this.active = true;
		
		this.stdout = [];
		this.stderr = [];
		
		this.emit('started');

		var makeString = "make ";
		for(let arg of args){
			makeString += '"'+arg+'" ';
		}
		console.log("spawning "+makeString);

		var childProcess = spawn('make', args);
		this.pid = childProcess.pid;
		
		childProcess.stdout.setEncoding('utf8');
		childProcess.stderr.setEncoding('utf8');
 
		childProcess.stdout.on('data', (data) => {
			//console.log('stdout', data);
			this.stdout.push(data);
			this.emit('stdout', data);
		});
		childProcess.stderr.on('data', (data) => {
			//console.log('stderr', data);
			this.stderr.push(data);
			this.emit('stderr', data);
		});
		
		//childProcess.on('exit', (code, signal) => console.log('exit', childProcess.pid, code, signal) );
		childProcess.on('close', (code, signal) => {
			//console.log('close', this.target, childProcess.pid, code, signal);
			var stdout = this.stdout.join ? this.stdout.join('') : this.stdout;
			var stderr = this.stderr.join ? this.stderr.join('') : this.stderr;
			if (this.dying){
				this.closed();
				// console.log('cancelled');
				this.emit('cancelled', {project: this.project, stdout, stderr, signal});
				this.project = undefined;
			} else {
				this.closed();
				this.emit('finished', {project: this.project, stdout, stderr, signal});
				this.project = undefined;
			}
			
			if (this.next) this.dequeue(stderr);
		});
		childProcess.on('error', (err) => {
			console.log('error', childProcess.pid, err);
			this.emit('error', err);
			this.closed();
			this.project = undefined;
			if (this.next) this.dequeue(err);
		});
		
		this.childProcess = childProcess;
		
		return this;
	}
	
	kill(){
		if (this.pid) {
			//console.log('killing', this.pid);
			this.dying = true;
			treeKill(this.pid, 'SIGTERM');
			this.pid = undefined;
		}
		return this;
	}
	
	queue(next){
		//console.log('queueing');
		this.next = next;
	}
	
	dequeue(err){
		var next = this.next;
		this.next = undefined;
		next(err);
	}
	
	emptyQueue(){
		this.next = undefined;
	}
	
	closed(){
		this.stdout = [];
		this.stderr = [];
		this.active = false;
		this.dying = false;
	}
	
	CPU(){
		if (!this.active || !this.pid) return Promise.resolve(0);
		//console.log(this.active, this.pid);
		return pusage.statAsync(this.pid)
			.then( stat => stat.cpu )
			.catch((e) => {
				console.log('error calculating cpu', this.command);
				return Promise.resolve(0);
			});
	}
		
}
	
module.exports = MakeProcess;
	
	
	
	
	
	
	
