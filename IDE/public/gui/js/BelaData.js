import BelaWebSocket from './BelaWebSocket.js'

export default class BelaData extends BelaWebSocket {
	constructor(port, address, ip) {
		super(port, address, ip)

        this.buffers = new Array();
        this.states = ['id/type', 'data'];
        this.currentState = this.states[0];
        this.bufferReady = false;
        this.newBuffer = {};
        this.target = new EventTarget();
        this.events = [
            new CustomEvent('buffer-ready')
        ];
    }

    dataError(data) {
        // most likely we are off by 1 in the state machine, so we attempt to resync.
        console.log("Invalid data length %d. Resetting state machine", data.byteLength);
        this.currentState = 'id/type';
        this.onData(data);
        return true;
	}

    onData(data) {
        if('id/type' === this.currentState) {
            this.bufferReady = false;
            this.newBuffer = {};
            let msgIdType = new Uint8Array(data);
            msgIdType = String.fromCharCode.apply(null, msgIdType).split('/');
            let err = false;
            if(2 != msgIdType.length) {
                err = true;
            } else if (1 != msgIdType[1].length) {
                err = true;
            } else {
                let success = false;
                this.newBuffer['type'] = msgIdType[1];
                for(let ch of ['c', 'j', 'i', 'f', 'd']) {
                    if(this.newBuffer['type'] === ch) {
                        success = true;
                        break;
                    }
                }
                if(!success)
                    err = true;
            }
            this.newBuffer['id'] = parseInt(msgIdType[0]);
            if(isNaN(this.newBuffer['id']))
                err = true;
            if(err) {
                console.log('Unknown buffer type ', this.newBuffer['type'],
                    'for bufferId ', this.newBuffer['id'],
                    ', or wrong length. Restarting state machine');
                this.currentState = this.states[0];
                return;
            }
            this.currentState = this.states[1];
        } else if ('data' === this.currentState) {
                this.currentState = this.states[0];
                let type = this.newBuffer['type'];
                let err = false;
                switch(type) {
                        case 'c':
                                let charInt = new Uint8Array(data);
                                charInt = Array.from(charInt);
                                let charArr = charInt.map((e) => {
                                        return String.fromCharCode(e);
                                });
                                this.newBuffer['data'] = charArr;
                                break;
                        case 'j': // unsigned int
                                if(data.byteLength & 3)
                                        err = this.dataError(data);
                                else {
                                        let uintArr = new Uint32Array(data);
                                        this.newBuffer['data'] = Array.from(uintArr);
                                }
                                break;
                        case 'i': // int
                                if(data.byteLength & 3)
                                        err = this.dataError(data);
                                else {
                                        let intArr = new Int32Array(data);
                                        this.newBuffer['data'] = Array.from(intArr);
                                }
                                break;
                        case 'f': // float
                                if(data.byteLength & 3)
                                        err = this.dataError(data);
                                else {
                                        let floatArr = new Float32Array(data);
                                        this.newBuffer['data'] = Array.from(floatArr);
                                }
                                break;
                        case 'd':
                                if(data.byteLength & 7)
                                        err = this.dataError(data);
                                else {
                                        let doubleArr = new Float64Array(data);
                                        this.newBuffer['data'] = Array.from(doubleArr);
                                }
                                break;
                        default:
                                console.log("Unknown buffer type ", type);

                }
                if(err)
                        return;
                let idx = this.newBuffer['id'];
                let count = this.buffers[idx] && "undefined" !== typeof(this.buffers[idx].count) ? this.buffers[idx].count + 1 : 0;
                this.buffers[idx] = this.newBuffer['data'];
                this.buffers[idx].type = type;
                this.buffers[idx].count = count;
                this.buffers[idx].ts = performance.now();
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
        if(this.ws.OPEN !== this.ws.readyState)
            return false;
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
