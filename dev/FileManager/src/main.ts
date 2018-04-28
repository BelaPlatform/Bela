import { FileManager, File_Descriptor } from "./FileManager";
import { ProjectManager } from "./ProjectManager";
import { Lock } from "./Lock";

let fm: FileManager = new FileManager();
let pm: ProjectManager = new ProjectManager();
let lock: Lock = new Lock();

//	let data = await pm.openFile({currentProject: 'basic', newFile: 'cape02.jpg'});
//	console.dir(data, {depth: null});
//	let result = await fm.is_binary('/root/Bela/projects/basic/basic');
//	console.log('ohi');
//	console.log(result, typeof result);

async function func1(){
	console.log('starting func1')
	await lock.acquire();
	console.log('func1 locked');
	setTimeout(() => {
		lock.release();
		console.log('func1 released');
	}, 1000);
}

async function func2(){
	console.log('starting func2')
	await lock.acquire();
	console.log('func2 locked');
	setTimeout(() => {
		lock.release();
		console.log('func2 released');
	}, 1000);
}
async function func3(){
	console.log('starting func3')
	await lock.acquire();
	console.log('func3 locked');
	setTimeout(() => {
		lock.release();
		console.log('func3 released');
	}, 1000);
}

func1();
setTimeout(func2, 100);
setTimeout(func3, 200);

//read_write()
//	.catch( e => console.log('error', e) );

/*
fm.write_file("/root/hello", "HAI")
	.then( () => fm.read_file('/root/hello') )
	.then( data => console.log(data) )
	.catch( e => console.log('error!', e) );
*/	
