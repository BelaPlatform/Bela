// node modules
var EventEmitter = require('events').EventEmitter;
var fs = require('fs-extra-promise');
var spawn = require('child_process').spawn;
var path = require('path');

// bash or sh?
var shell = 'bash';

// directory in which shell will start
var startCWD = '~/Bela';

var restartCount = 0;
var maxRestarts = 10;

// TODO fix tab search with ~
class TerminalManager extends EventEmitter {

	constructor(){
		super();
	}

	init(){
	
		var sh = spawn(shell)
		
		sh.stdin.write('cd '+startCWD+'\n');
		
		sh.stdout.setEncoding('utf-8');
		sh.stderr.setEncoding('utf-8');
		
		sh.stdout.on('data', (data) => {
			if (this.pwding) {
				var dir = data.split('\n').join('');
				//console.log('dir', dir);
				fs.statAsync(dir)
					.then( stat => {
						this.cwd = dir;
						this.emit('shell-event', 'cwd', dir);
						this.pwding = false;
					})
					.catch( () => {
						//this.pwd();
						this.emit('shell-event', 'stdout', data);
					});
				return;
			}
			console.log(data);
			this.emit('shell-event', 'stdout', data);
		});
		
		sh.stderr.on('data', (data) => this.emit('shell-event', 'stderr', data) );
		
		sh.on('exit', () => {
			this.emit('shell-event', 'stderr', shell+' exited, restarting...');
			
			if (restartCount++ < maxRestarts)
				this.init();
			else
				this.emit('shell-event', 'could not restart '+shell);
				
		});
		
		this.sh = sh;
		
		this.pwd();
	}
	
	execute(command){
	
		try{
			this.sh.stdin.write(command+'\n');
		}
		catch(e){
			this.emit('shell-event', 'stderr', 'error executing '+shell+' command '+command);
		}
		
		this.pwd();
	}
	
	pwd(){
		console.log('setting pwd timeout');
		setTimeout( () => {
		
			//console.log('sh-pwd');
			this.pwding = true;
			
			try{
				this.sh.stdin.write('pwd\n');
			}
			catch(e){
				this.emit('shell-event', 'stderr', 'could not determine '+shell+' directory');
			}
			
		}, 100);
	}
	
	tab(cmd){
		if (!cmd) return;
		try{

			// ~ expansion
			if (cmd.indexOf('~') !== -1) cmd = cmd.split('~').join(HOME);

			// isolate the last command
			var str = cmd.split(' ').pop();
						
			// is it a path?
			if (str.indexOf('/') !== -1){
				var test = path.basename(str);
				if (path.isAbsolute(str))
					var searchDir = path.dirname(str);
				else
					var searchDir = this.cwd + '/' + path.dirname(str);
			} else {
				var test = str;
				var searchDir = this.cwd;
			}
			
			console.log('str:', str, 'test:', test, 'searchDir:', searchDir);
			
			fs.readdirAsync(searchDir)
				.then( dir => {
					let matches = [];
					for (let item of dir){
						if (item.startsWith(test)){
						
							let temp = cmd.split(' ');
							temp.pop();
							
							if (str.indexOf('/') !== -1)
								temp.push( (path.dirname(str) === '/') ? (path.dirname(str) + item) : (path.dirname(str) + '/' + item) );
							else
								temp.push(item);
																
							matches.push(temp);
						}					
					}
					
					if (matches.length === 1){
						//let command = matches[0][matches[0].length-1]
						//console.log('matches[0]:', matches[0], 'fullpath:', this.cwd+'/'+matches[0][matches[0].length-1]);
						if (path.isAbsolute(str))
							var statDir = matches[0][matches[0].length-1];
						else
							var statDir = this.cwd+'/'+matches[0][matches[0].length-1];
							
						fs.statAsync(statDir)
							.then( stat => {
							
								if (stat.isDirectory())
									matches[0][matches[0].length-1] += '/';
									
								this.emit('shell-event', 'tabcomplete', matches[0].join(' '));
							})
							.catch( e => console.log('shell tab stat error', e) );
					}
				})
				.catch( e => console.log('error in shell tab', e) );
		
		}
		catch(e){ console.log('shell tab error', e.toString()) };
	}
}

module.exports = new TerminalManager();
