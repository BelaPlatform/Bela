import * as file_manager from './FileManager';
import * as socket_manager from './SocketManager';
import * as child_process from 'child_process';
import * as paths from './paths';

export async function upload(data: any){
	try{
		socket_manager.broadcast('std-log', 'Upload completed, saving update file...');
		await file_manager.empty_directory(paths.update);
		await file_manager.rename_file(data.fullPath, paths.update+'/'+data.newFile);
	}
	catch(e){
		console.log('update file move failed', e.toString());
		socket_manager.broadcast('update-error', e.toString());
	}
}

export async function update(){
	try{
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
	return spawn_process('checkupdate');
}

function apply_update(){
	return spawn_process('update');
}

function spawn_process(target: string): Promise<void>{
	return new Promise( (resolve, reject) => {
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
		proc.on('close', (code: number) => {
			if (0 === code)
				resolve();
			else
				reject(new Error('make ' + target + ' failed with code ' +  code));
		});
		proc.on('error', (e: Error) => reject(e) );
	});
}
