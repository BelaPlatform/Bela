var dgram = require('dgram');
var osc = require('osc-min');

// port numbers
var OSC_RECIEVE = 7563;
var OSC_SEND = 7562;

// socket to send and receive OSC messages from bela
var socket = dgram.createSocket('udp4');
socket.bind(OSC_RECIEVE, '127.0.0.1');
		
socket.on('message', (message, info) => {

	var msg = osc.fromBuffer(message);
	
	if (msg.oscType === 'message'){
		parseMessage(msg);
	} else if (msg.elements){
		for (let element of msg.elements){
			parseMessage(element);
		}
	}
	
});

function parseMessage(msg){

	var address = msg.address.split('/');
	if (!address || !address.length || address.length <2){
		console.log('bad OSC address', address);
		return;
	}
	
	// setup handshake
	if (address[1] === 'osc-setup'){
		sendHandshakeReply();
		
		// start sending OSC messages to Bela
		setInterval(sendOscTest, 1000);
		
	} else if (address[1] === 'osc-acknowledge'){
		console.log('received osc-acknowledge', msg.args);
	}
}

function sendOscTest(){
	var buffer = osc.toBuffer({
		address : '/osc-test',
		args 	: [
			{type: 'integer', value: 78},
			{type: 'float', value: 3.14}
		]
	});
	socket.send(buffer, 0, buffer.length, OSC_SEND, '127.0.0.1', function(err) {
		if (err) console.log(err);
	});
}

function sendHandshakeReply(){
	var buffer = osc.toBuffer({ address : '/osc-setup-reply' });
	socket.send(buffer, 0, buffer.length, OSC_SEND, '127.0.0.1', function(err) {
		if (err) console.log(err);
	});
}