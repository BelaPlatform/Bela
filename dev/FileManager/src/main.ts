import { FileManager, File_Descriptor } from "./FileManager";
import { ProjectManager } from "./ProjectManager";

let fm: FileManager = new FileManager();
let pm: ProjectManager = new ProjectManager();

async function read_write(){
	let data = await pm.openFile({currentProject: 'basic', newFile: 'cape02.jpg'});
	console.dir(data, {depth: null});
//	let result = await fm.is_binary('/root/Bela/projects/basic/basic');
//	console.log('ohi');
//	console.log(result, typeof result);
}

read_write()
	.catch( e => console.log('error', e) );

/*
fm.write_file("/root/hello", "HAI")
	.then( () => fm.read_file('/root/hello') )
	.then( data => console.log(data) )
	.catch( e => console.log('error!', e) );
*/	
