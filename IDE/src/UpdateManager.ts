import * as file_manager from './FileManager';
import * as socket_manager from './SocketManager';
import * as child_process from 'child_process';
import * as paths from './paths';

export async function upload(data: any){
	try{
		socket_manager.broadcast('std-log', 'Upload completed, saving update file...');
		await file_manager.empty_directory(paths.update);
		await file_manager.write_file(paths.update+data.name, data.file);
		socket_manager.broadcast('std-log', 'unzipping and validating update...');
		await check_update();
		socket_manager.broadcast('std-log', 'Applying update...');
		await apply_update();
		socket_manager.broadcast('std-log', 'Update complete!');
		socket_manager.broadcast('force-reload', '');
	}
	catch(e){
		console.log('update failed', e.toString());
		socket_manager.broadcast('update-error', e.toString());
	}
}

function check_update(){
	return new Promise( (resolve, reject) => {
		let proc = spawn_process('checkupdate');
		proc.on('close', (code: number) => {
			if (code === 0){
				resolve();
			} else {
				reject(new Error('checkupate failed with code '+code))
			};
		});
		proc.on('error', (e: Error) => reject(e) );
	});
}

function apply_update(){
	return new Promise( (resolve, reject) => {
		let proc = spawn_process('update');
		proc.on('close', () => resolve() );
		proc.on('error', (e: Error) => reject(e) );
	});
}

function spawn_process(target: string): child_process.ChildProcess{
	let proc = child_process.spawn('make', ['--no-print-directory', '-C', paths.Bela, target]);
	proc.stdout.setEncoding('utf8');
	proc.stderr.setEncoding('utf8');
	proc.stdout.on('data', (data: string) => {
		console.log('stdout', data);
		socket_manager.broadcast('std-log', data);
	});
	proc.stderr.on('data', (data: string) => {
		console.log('stderr', data);
		socket_manager.broadcast('std-warn', data);
	});
	return proc;
}
