import { FileManager } from "./FileManager";

let fm: FileManager = new FileManager();

async function read_write(){
	await fm.write_file('/root/hello', 'OHAILOL');
	let data: string = await fm.read_file('/root/hello');
	console.log(data);
}

read_write();

/*
fm.write_file("/root/hello", "HAI")
	.then( () => fm.read_file('/root/hello') )
	.then( data => console.log(data) )
	.catch( e => console.log('error!', e) );
*/	
