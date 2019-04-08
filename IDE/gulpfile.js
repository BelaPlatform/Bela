let gulp = require('gulp');
let ts = require('gulp-typescript');
let sourcemaps = require('gulp-sourcemaps');
let replace = require('gulp-replace');
let livereload = require('gulp-livereload');
let exec = require('child_process').exec;
let spawn = require('child_process').spawn;

let host = '192.168.7.2';
let user = 'root';
let remote_path = '/root/Bela/IDE/';

gulp.task('styles', function() {
  return gulp.src('../ide-redesign/styles/*.scss')
    .pipe(sass({
      'sourcemap=none': true
    }))
    .pipe(concat('style.css'))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
    .pipe(gulp.dest('styles/'));
});

gulp.task('watch', () => {

	livereload.listen();

	gulp.watch(['src/*.ts'], gulp.series('compile'));
	gulp.watch(['dist/*.js'], gulp.series('idestop', 'upload_dist', 'idestart'));

	let ssh = spawn('ssh', [user+'@'+host, 'journalctl -fu bela_ide']);
	ssh.stdout.setEncoding('utf8');
	ssh.stderr.setEncoding('utf8');
	ssh.stdout.on('data', function(data){
		process.stdout.write(data);
		if (data.includes('listening on port')) livereload.reload();
	});
	ssh.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});

});

gulp.task('watch_test', () => {
	gulp.watch(['src/*.ts'], gulp.series('compile'));
	gulp.watch(['test/*.spec.ts'], gulp.series('compile_test'));
	gulp.watch(['dist/*.js'], gulp.series('test_stop', 'upload_dist', 'test_start'));
});

gulp.task('compile', () => {
	return gulp.src('src/*.ts')
		//.pipe(sourcemaps.init())
		.pipe(ts({
			"noImplicitAny": true,
			"target": "es5"
		}))
		//.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist'));
});
gulp.task('compile_test', () => {
	return gulp.src('test/*.spec.ts')
		.pipe(sourcemaps.init())
		.pipe(ts({
			"noImplicitAny": true,
			"target": "es5"
		}))
		.pipe(replace('require("../src', 'require("../dist'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist'));
});

gulp.task('idestart', callback => {
	exec('ssh '+user+'@'+host+' "systemctl start bela_ide"', (err) => {
		if (err) console.log('unable to stop node');
		callback(); // finished task
	});
});
gulp.task('idestop', callback => {
	exec('ssh '+user+'@'+host+' "systemctl stop bela_ide"', (err) => {
		if (err) console.log('unable to stop node');
		callback(); // finished task
	});
});

gulp.task('test_start', callback => {
	let test = spawn('ssh', [user+'@'+host, 'npm test --prefix', remote_path]);
	test.stdout.setEncoding('utf8');
	test.stdout.on('data', function(data){
		process.stdout.write(data);
	});

	test.stderr.setEncoding('utf8');
	test.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});

	callback();
});
gulp.task('test_stop', callback => {
	exec('ssh '+user+'@'+host+' "pkill -9 node"', (err) => {
		if (err) console.log('unable to stop test');
		callback(); // finished task
	});
});

gulp.task('upload_dist', callback => rsync(callback, 'dist/') );
gulp.task('upload_modules', callback => rsync(callback, 'node_modules/') );

function rsync(callback, dir){
	let rsync = spawn('rsync', ['-av', dir, user+'@'+host+':'+remote_path+dir]);

	rsync.stdout.setEncoding('utf8');
	rsync.stdout.on('data', function(data){
		process.stdout.write('rsync: ' + data);
	});

	rsync.stderr.setEncoding('utf8');
	rsync.stderr.on('data', function(data){
		process.stdout.write('error: '+data);
	});

	rsync.on('exit', function(){
		callback();
	});
}

gulp.task('test', gulp.series('compile', 'compile_test', 'upload_dist', 'test_start', 'watch_test'));
gulp.task('default', gulp.series('compile', 'idestop', 'upload_dist', 'idestart', 'watch'));
