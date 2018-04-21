var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var testProject = ts.createProject("testconfig.json");
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var host = '192.168.7.2';
var user = 'root';
var remotePath = '/root/FileManager';

gulp.task("default", () => {
	gulp.watch(['src/*.ts'], ['typescript']);
	gulp.watch(['dist/*.js'], ['killnode', 'upload', 'restartnode']);
});

gulp.task('test', () => {
	gulp.watch(['src/*.ts'], ['typescript']);
	gulp.watch(['test/*.ts'], ['test-typescript']);
	gulp.watch(['dist/*.js'], ['killnode', 'upload', 'do-test']);
});

gulp.task("typescript", function () {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("dist"));
});
gulp.task("test-typescript", function () {
    return testProject.src()
        .pipe(testProject())
        .js.pipe(gulp.dest('dist'));
});

gulp.task('killnode', (callback) => {
	exec('ssh '+user+'@'+host+' "pkill -9 node"', (err) => {
		if (err) console.log('unable to stop node');
		callback(); // finished task
	});
});

gulp.task('upload', ['killnode'], (cb) => rSync(cb, true, 'dist/', 'src/') );
gulp.task('upload-test', [], (cb) => rSync(cb, false, 'dist/', 'src/') );
gulp.task('restartnode', ['upload'], startNode);
gulp.task('do-test', ['upload'], doTest);

function rSync(callback, del, src, dest){

	var ssh;
	if (del)
		ssh = spawn('rsync', ['-av', '--delete', src, user+'@'+host+':'+remotePath+'/'+dest]);
	else
		ssh = spawn('rsync', ['-av', src, user+'@'+host+':'+remotePath+'/'+dest]);

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
	var ssh = spawn('ssh', [user+'@'+host, 'cd', remotePath+';', 'node', remotePath+'/src/main.js']);
	
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
function doTest(callback){
	var ssh = spawn('ssh', [user+'@'+host, 'cd', remotePath+'/src;', 'npm', 'test']);
	
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
