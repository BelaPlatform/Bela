/***** index.js *****/
var express = require('express');
var app = express();
var http = require('http').Server(app);
var osc = require('osc-min');
var dgram = require('dgram');

// setup OSC
var OSC_SEND_PORT = 4368;
var udp = dgram.createSocket('udp4');

// start web server
http.listen(3000, function(){
	console.log('webpage active at URL 192.168.7.2:'+3000);
});
app.use(express.static('./'));

// open websocket
var io = require('socket.io')(http);
sockets = io.of('/BELA_NEXUSUI');

// listen for websocket events
sockets.on('connection', function(socket){
	
	console.log('websocket connected!');
	
	socket.on('slider', data => {
		
		// console.log('slider', data.id, 'changed to value', data.value);
		
		sendOSC({
			address	: '/nexus-ui/slider',
			args	: [
				{
					type	: 'integer',
					value	: data.id
				},
				{
					type	: 'float',
					value	: data.value
				}
			]
		});
		
	});
	
});

function sendOSC(message){
	var buffer = osc.toBuffer(message);
	udp.send(buffer, 0, buffer.length, OSC_SEND_PORT, '127.0.0.1', function(err) {
		if (err) console.log(err);
	});
}