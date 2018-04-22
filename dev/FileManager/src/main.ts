import { FileManager, File_Descriptor } from "./FileManager";

let fm: FileManager = new FileManager();

async function read_write(){
	let data: File_Descriptor[] = await fm.deep_read_directory('/root/FileManager');
	console.dir(data, {depth: null});
}

read_write()
	.catch( e => console.log('error', e) );

/*
fm.write_file("/root/hello", "HAI")
	.then( () => fm.read_file('/root/hello') )
	.then( data => console.log(data) )
	.catch( e => console.log('error!', e) );
*/	
