var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var host = '192.168.7.2';
var user = 'root';
var remotePath = '/root/FileManager';

gulp.task("default", () => {
	gulp.watch(['src/*.ts'], ['typescript']);
	gulp.watch(['dist/*.js'], ['killnode', 'upload', 'restartnode']);
});

gulp.task("typescript", function () {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("dist"));
});

gulp.task('killnode', (callback) => {
	exec('ssh '+user+'@'+host+' "pkill -9 node"', (err) => {
		if (err) console.log('unable to stop node');
		callback(); // finished task
	});
});

gulp.task('upload', ['killnode'], (cb) => rSync(cb, false) );
gulp.task('restartnode', ['upload'], startNode);

function rSync(callback, reload){

	var ssh = spawn('rsync', ['-av', '--delete', 'dist/', user+'@'+host+':'+remotePath]);
	
	ssh.stdout.setEncoding('utf8');
	ssh.stdout.on('data', function(data){
		process.stdout.write('rsync: ' + data);
	});
	
	ssh.stderr.setEncoding('utf8');
	ssh.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});
	
	ssh.on('exit', function(){
		callback();
//		if (reload) livereload.reload();
	});
	
};
function startNode(callback){
	var ssh = spawn('ssh', [user+'@'+host, 'cd', remotePath+';', 'node', remotePath+'/main.js']);
	
	ssh.stdout.setEncoding('utf8');
	ssh.stdout.on('data', function(data){
		process.stdout.write(data);
		if (data.indexOf('listening on port') !== -1) livereload.reload();
	});
	
	ssh.stderr.setEncoding('utf8');
	ssh.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});

	callback();
}
