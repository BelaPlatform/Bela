var express = require('express'); 
var archiver = require('archiver');
var mime = require('mime');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var emitter = new (require('events').EventEmitter)();

var app = express();
var http = require('http').Server(app);

var belaPath = '/root/Bela/';

function listen(port){
	http.listen(port, function(){
		console.log('listening on port '+port);
	});
}

app.use(express.static('public'));	//path to IDE index.html

// link for downloading projects
app.get('/download', function(req, res){

	if (req.query.project){
		if (req.query.file){
		
			var file = belaPath+'projects/'+req.query.project+'/'+req.query.file;
			res.setHeader('Content-disposition', 'attachment; filename='+req.query.file);
			res.setHeader('Content-type', mime.lookup(file));
			
			fs.createReadStream(file).pipe(res);
			
		} else {
		
			res.setHeader('Content-disposition', 'attachment; filename='+req.query.project+'.zip');
			res.setHeader('Content-type', 'application/zip');
	
			var archive = archiver('zip');
			
			archive.on('error', (e) => {
				emitter.emit('project-error', e);
				res.end();
			});

			archive.pipe(res);
			archive.directory(belaPath+'projects/'+req.query.project, req.query.project, {name: req.query.project+'.zip'});
			archive.finalize();
			
		}
	} else if (req.query.all){
		
		res.setHeader('Content-disposition', 'attachment; filename=projects.zip');
		res.setHeader('Content-type', 'application/zip');

		var archive = archiver('zip');
		
		archive.on('error', (e) => {
			emitter.emit('project-error', e);
			res.end();
		});
		
		archive.pipe(res);
		archive.directory(belaPath+'projects', 'projects', {name: 'projects.zip'});
		archive.finalize();
			
	}
	
});

// link for doxygen docs
app.use('/documentation', express.static('../Documentation/html'));

// link for doxygen xml
app.get('/documentation_xml', function(req, res){

	res.set('Content-Type', 'text/xml');

	fs.readFileAsync(belaPath+'Documentation/xml/'+req.query.file+'.xml', 'utf-8')
		.then( xml => res.send(xml) )
		.catch( () => res.status(500).send('file '+req.query.file+'.xml not found') );
	
});

// link for workshop rebuild-project request
app.get('/rebuild-project', function(req, res){

	console.log('request received, project ', req.query.project);
	emitter.emit('rebuild-project', req.query.project);
	res.status(200).send();
	
});

module.exports = {
	http: http,
	start: listen,
	emitter
}