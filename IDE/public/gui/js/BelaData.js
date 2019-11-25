import BelaWebSocket from './BelaWebSocket.js'

export default class BelaData extends BelaWebSocket {
	constructor(port=5555, address='gui_data', ip=location.host) {
		super(port, address, ip)

        this.buffers = new Array();
        this.states = ['id', 'type', 'data'];
        this.currentState = this.states[0];
        this.bufferReady = false;
        this.newBuffer = {};
        this.target = new EventTarget();
        this.events = [
            new CustomEvent('buffer-ready')
        ];
    }

    onData(data) {
        if(this.currentState == this.states[0]) { // buffer id
                this.bufferReady = false;
                this.newBuffer = {};
		let msgId = new Uint8Array(data);
		this.newBuffer['id'] = parseInt(String.fromCharCode.apply(null, msgId));
		this.currentState = this.states[1];
        } else if (this.currentState == this.states[1]) { // type
                if(data.byteLength == 1) {
                        let msgType = new Uint8Array(data);
                        this.newBuffer['type'] = String.fromCharCode(msgType);
                        this.currentState = this.states[2];
                } else {
                        this.currentState = this.states[0];
                }
        } else if (this.currentState == this.states[2]) { // data
                this.currentState = this.states[0];
                let type = this.newBuffer['type'];
                switch(type) {
                        case 'c':
                                let charInt = new Uint8Array(data);
                                charInt = Array.from(charInt);
                                let charArr = charInt.map((e) => {
                                        return String.fromCharCode(e);
                                });
                                this.newBuffer['data'] = charArr;
                                break;
                        case 'i':
                                let intArr = new Int32Array(data);
                                this.newBuffer['data'] = Array.from(intArr);
                                break;
                        case 'f':
                                let floatArr = new Float32Array(data);
                                this.newBuffer['data'] = Array.from(floatArr);
                                break;
                        case 'd':
                                let doubleArr = new Float64Array(data);
                                this.newBuffer['data'] = Array.from(doubleArr);
                                break;
                        default:
                                console.log("Unknown buffer type ", type);

                }
                this.buffers[this.newBuffer['id']] = this.newBuffer['data'];
                this.bufferReady = true;

                this.target.dispatchEvent( new CustomEvent('buffer-ready', { detail: this.newBuffer['id'] }) );
        }
    }

    sendBuffer(id, type, data) {
        if(id === null || typeof(id) != 'number') {
    	    return false;
        }
        if(typeof(data) == 'string') {
            data = data + '\0';
        } else if(!Array.isArray(data)) {
            data = [data];
        }

        if(type == 'float' || type == 'f') {
            type = 'f';
        } else if(type == 'int' || type == 'd') {
            type = 'd';
        } else if(type == 'char' || type == 'c') {
            type = 'c';
        } else {
        	return false;
        }

        let pkt = this.formatPkt(id, type, data);
        this.ws.send(pkt);
        return true;
    }

    formatPkt(id, type, dataArray) {
        let header = {
            numFields: 4,
            fieldSize: Float32Array.BYTES_PER_ELEMENT
        }
        header['size'] = header.numFields * header.fieldSize; //Bytes
        let pktLen = header.size;

        let arrayLen = dataArray.length;
        if(type === 'd' || type === 'f') {
            pktLen += Float32Array.BYTES_PER_ELEMENT*arrayLen;
        } else if (type === 'c') {
            pktLen += arrayLen;
        } else {
            return null;
        }

        let buffer = new ArrayBuffer(pktLen);
        header['content'] = new Uint32Array(buffer, 0, header.numFields);
        header['content'] [0] = id;
        header['content'] [1] = type.charCodeAt(0);
        header['content'] [2] = arrayLen;

        let arrayView;
        if(type === 'd')  {
            arrayView = new Int32Array(buffer, header.size, arrayLen);
        } else if (type === 'f') {
            arrayView = new Float32Array(buffer, header.size, arrayLen);
        } else if (type === 'c') {
            arrayView = new Uint8Array(buffer, header.size, arrayLen);
        } else {
            return null;
        }
        for(let i=0; i<arrayLen; i++) {
            if(type === 'c') {
                arrayView[i] = dataArray[i].charCodeAt(0);
            } else {
                arrayView[i] = dataArray[i];
            }

        }
        return buffer;
    }
}
