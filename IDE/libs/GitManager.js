'use strict';
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var exec = require('child_process').exec;

var belaPath = '/root/Bela/';

module.exports = {
	
	repoExists(project){
		return fs.statAsync(belaPath+'projects/'+project+'/.git')
			.then( stat => true )
			.catch( err => false );
	},
	
	*init(gitData){
		if (yield this.repoExists(gitData.currentProject)) throw new Error('repo already exists');
		
		// init the repo
		gitData.command = 'init';
		gitData = yield this.execute(gitData);
		
		// create the .gitignore file, ignoring .DS_Store, settings.json, the build/ folder and the binary
		yield fs.outputFileAsync(belaPath+'projects/'+gitData.currentProject+'/.gitignore', '.DS_Store\nsettings.json\nbuild/*\n'+gitData.currentProject, 'utf-8');
		
		// add all files to the repo
		gitData.command = 'add -A';
		gitData = yield this.execute(gitData);
		
		// first commit
		gitData.command = 'commit -am "first commit"';
		gitData = yield this.execute(gitData);
		
		return gitData;
		
	},
	
	*info(data){
			
		data.repoExists = yield this.repoExists(data.currentProject);
		
		if (data.repoExists){
		
			var commits = yield this.execute({currentProject: data.currentProject, command: "log --all --pretty=oneline --format='%s, %ar %H' --graph"});
			data.commits = commits.stdout;
			
			var currentCommit = yield this.execute({currentProject: data.currentProject, command: "log -1 --format='%H'"});
			data.currentCommit = currentCommit.stdout
			
			var branches = yield this.execute({currentProject: data.currentProject, command: "branch"});
			data.branches = branches.stdout;
			
		}
		
		return data;
	},
	
	*command(data){
		data = yield this.execute(data);
		return data;
	},
	
	execute(data){
		return new Promise( (resolve, reject) => {			
			exec('git '+data.command, {cwd: belaPath+'projects/'+data.currentProject+'/'}, (err, stdout, stderr) => {
			//console.log(data.command, stdout, stderr);
				if (err) reject(err);
				
				if (data.stdout) 
					data.stdout += stdout ? ('\n' + stdout) : '';
				else 
					data.stdout = stdout;
					
				if (data.stderr) 
					data.stderr += stderr ? ('\n' + stderr) : '';
				else 
					data.stderr = stderr;
					
				resolve(data);
			});
		});
	}
	
};

// coroutine factory and binder
function _co(obj, func, args){
	return Promise.coroutine(obj[func]).bind(obj)(args);
}