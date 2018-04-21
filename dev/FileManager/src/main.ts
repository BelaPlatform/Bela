import { FileManager } from "./FileManager";

let fm: FileManager = new FileManager();

async function read_write(){
	await fm.write_file('/root/hello', 'tehehe');
	await fm.rename_file('/root/hello', '/root/umlol');
	let data: string = await fm.read_file('/root/umlol');
	await fm.delete_file('/root/umlol');
	console.log(data);
}

read_write()
	.catch( e => console.log('error', e) );

/*
fm.write_file("/root/hello", "HAI")
	.then( () => fm.read_file('/root/hello') )
	.then( data => console.log(data) )
	.catch( e => console.log('error!', e) );
*/	
