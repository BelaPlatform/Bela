import * as express from 'express';
import * as http from 'http';
import * as multer from 'multer'
import * as child_process from 'child_process';
import * as socket_manager from './SocketManager';
import * as file_manager from './FileManager';
import * as paths from './paths';
import * as util from './utils';
import * as routes from './RouteManager';
import * as path from 'path';
import * as fs from 'fs';
var TerminalManager = require('./TerminalManager');

export async function init(){
	console.log('starting IDE');

	await check_lockfile()
		.catch( (e: Error) => console.log('error checking lockfile', e) );

	// setup webserver
	const app: express.Application = express();
	const server: http.Server = new http.Server(app);
	setup_routes(app);

	// start serving the IDE on port 80
	server.listen(80, () => console.log('listening on port', 80) );

	// initialise websocket
	socket_manager.init(server);

	TerminalManager.init();
}

let backup_file_stats: util.Backup_File_Stats = {};
export async function check_lockfile(){
	let lockfile_exists =  await file_manager.file_exists(paths.lockfile);
	if (!lockfile_exists){
		backup_file_stats.exists = false;
		return;
	}
	let file_path: string = await file_manager.read_file(paths.lockfile);
	let filename: string = path.basename(file_path);
	let project_path: string = path.dirname(file_path)+'/';
	let tmp_backup_file: string = project_path+'.'+filename+'~';
	let backup_file_exists: boolean = await file_manager.file_exists(tmp_backup_file);
	if (!backup_file_exists){
		backup_file_stats.exists = false;
		return;
	}
	let backup_filename: string = filename+'.bak';
	await file_manager.copy_file(tmp_backup_file, project_path+backup_filename);
	console.log('backup file copied to', project_path+backup_filename);
	backup_file_stats.exists = true;
	backup_file_stats.filename = filename;
	backup_file_stats.backup_filename = backup_filename;
	backup_file_stats.project = path.basename(project_path);
	await file_manager.delete_file(paths.lockfile);
}
export function get_backup_file_stats(): util.Backup_File_Stats {
	return backup_file_stats;
}

function setup_routes(app: express.Application){
	// static paths
	app.use(express.static(paths.webserver_root)); // all files in this directory are served to bela.local/
	app.use('/documentation', express.static(paths.Bela+'Documentation/html'));
	app.use('/projects', express.static(paths.Bela+'projects'));

	// ajax routes

  var storage = multer.diskStorage({
    destination: paths.uploads,
    filename: function (req, file, callback) {
      callback(null, file.originalname);
      console.log('file is', file);
    }
  });

  app.post('/uploads', function(req, res) {
      var upload = multer({ storage : storage}).single('data');
      upload(req, res, function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
      });
  });

	// file and project downloads
	app.get('/download', routes.download);
	// doxygen xml
	app.get('/documentation_xml', routes.doxygen);
	// examples
	app.use('/examples', express.static(paths.examples));
  // libs
	app.use('/libraries', express.static(paths.libraries));
	// gui
	app.use('/gui', express.static(paths.gui));
}

export function get_xenomai_version(): Promise<string>{
	return new Promise(function(resolve, reject){
		child_process.exec('/usr/xenomai/bin/xeno-config --version', (err, stdout, stderr) => {
			if (err){
				console.log('error reading xenomai version');
				reject(err);
			}
			if (stdout.includes('2.6')){
				paths.set_xenomai_stat('/proc/xenomai/stat');
			} else if (stdout.includes('3.0')){
				paths.set_xenomai_stat('/proc/xenomai/sched/stat');
			}
			resolve(stdout);
		});
	});
}

export function set_time(time: string){
	child_process.exec('date -s "'+time+'"', (err, stdout, stderr) => {
		if (err || stderr){
			console.log('error setting time', err, stderr);
		} else {
			console.log('time set to:', stdout);
		}
	});
}

export function shutdown(){
	child_process.exec('shutdown -h now', (err, stdout, stderr) => console.log('shutting down', err, stdout, stderr) );
}

export async function board_detect(): Promise<any>{
	return new Promise( (resolve, reject) => {
		child_process.exec('board_detect', (err, stdout, stderr) => {
			if (err) reject(err);
			console.log('running on', stdout);
			resolve(stdout);
		});
	});
}

process.on('warning', e => console.warn(e.stack));
/*process.on('uncaughtException', err => {
	console.log('uncaught exception');
	throw err;
});
process.on('SIGTERM', () => {
	console.log('SIGTERM');
	throw new Error('SIGTERM');
});*/
