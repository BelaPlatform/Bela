import * as express from 'express';
import * as fs from 'fs-extra-promise';
import * as paths from './paths';
import * as socket_manager from './SocketManager';
import * as archiver from 'archiver';
import * as mime from 'mime';

export function download(req: express.Request, res: express.Response){
	if(req.query.all){
		download_all(res);
	} else if (req.query.project && req.query.file){
		download_file(req, res);
	} else if (req.query.project){
		download_project(req, res);
	}
}

// zip the entire projects directory and send back
function download_all(res: express.Response){
	send_zip(paths.projects, 'projects', res);
}
// zip a single project directory and send back
function download_project(req: express.Request, res: express.Response){
	send_zip(paths.projects+req.query.project, req.query.project, res);
}

function send_zip(path: string, name: string, res: express.Response){
	res.setHeader('Content-disposition', 'attachment; filename='+name+'.zip');
	res.setHeader('Content-type', 'application/zip');
	let archive = archiver('zip');
	archive.on('error', (e: Error) => {
		socket_manager.broadcast('report-error', e);
		res.end();
	});
	archive.pipe(res);
	archive.directory(path, name, {name: name+'.zip'});
	archive.finalize();
}

function upload_file(req: express.Request, res: express.Response){
  let file = req.query.file;
  fs.createWriteStream(paths.uploads+file);
}

export function upload(req: express.Request, res: express.Response){
	if(req.query.all){
    console.log(res);
		upload_file(req, res);
  }
}

function download_file(req: express.Request, res: express.Response){
	let file = paths.projects+req.query.project+'/'+req.query.file;
  let fileName = req.query.file.split('/').pop();
	res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
	res.setHeader('Content-type', mime.getType(file));
	// this should really go through the file_manager lock - TODO
	fs.createReadStream(file).pipe(res);
}

export function doxygen(req: express.Request, res: express.Response){
	res.set('Content-Type', 'text/xml');
	// this should really go through the file_manager lock - TODO
	fs.readFileAsync(paths.Bela+'Documentation/xml/'+req.query.file+'.xml', 'utf-8')
		.then( xml => res.send(xml) )
		.catch( () => res.status(500).send('file '+req.query.file+'.xml not found') );
}
