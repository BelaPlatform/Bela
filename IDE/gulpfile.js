let gulp = require('gulp');
let ts = require('gulp-typescript');
let sourcemaps = require('gulp-sourcemaps');
let livereload = require('gulp-livereload');
let exec = require('child_process').exec;
let spawn = require('child_process').spawn;

let host = '192.168.7.2';
let user = 'root';
let remote_path = '/root/Bela/IDE/';

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

gulp.task('compile', () => {
	return gulp.src('src/*.ts')
		.pipe(sourcemaps.init())
		.pipe(ts({
			"noImplicitAny": true,
			"target": "es5"
		}))
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

gulp.task('upload_dist', callback => {
	let rsync = spawn('rsync', ['-av', 'dist/', user+'@'+host+':'+remote_path+'dist/']);

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
//		if (reload) livereload.reload();
	});
});

gulp.task('default', gulp.series('compile', 'idestop', 'upload_dist', 'idestart', 'watch'));
