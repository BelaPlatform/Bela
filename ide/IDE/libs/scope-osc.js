'use strict';
var dgram = require('dgram');
var osc = require('osc-min');
var EventEmitter = require('events').EventEmitter;

// port numbers
var OSC_RECIEVE = 8676;
var OSC_SEND = 8675;

class scopeOSC extends EventEmitter {

	constructor(){
		super();
	}

	init(){
		// socket to send and receive OSC messages from bela scope
		this.socket = dgram.createSocket('udp4');
		this.socket.bind(OSC_RECIEVE, '127.0.0.1');
		
		this.socket.on('message', (message, info) => this.recieve(message, info));
	}
	
	recieve(message, info){
		var msg = osc.fromBuffer(message);
		if (msg.oscType === 'message'){
			this.parseMessage(msg);
		} else if(msg.oscType === 'bundle'){
			console.log('received OSC bundle');
		} else {
			console.log('bad OSC message');
		}
	}
		
	parseMessage(msg){
		var address = msg.address.split('/');
		if (!address || !address.length || address.length <2){
			console.log('bad OSC address', address);
			return;
		}
		
		if (address[1] === 'scope-setup'){
			this.emit('scope-setup', msg.args);
		}
	}
	
	sendSetupReply(settings){
		var elements = [];
		elements.push({ address: '/scope-setup-reply' });
		for (let setting in settings){
			elements.push({
				address	: '/scope-settings/'+setting,
				args	: [settings[setting]]
			});
		}
		this.send({elements});	
	}
	
	sendSetting(key, value){
		this.send({
			address : '/scope-settings/'+key,
			args : [value]
		});
	}
	
	send(message){
		var buffer = osc.toBuffer(message);
		this.socket.send(buffer, 0, buffer.length, OSC_SEND, '127.0.0.1', function(err) {
			if (err) console.log(err);
		});
	}
	
};

module.exports = new scopeOSC();