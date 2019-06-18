Bela_data = new BelaWebSocket(5555, "gui_data");
Bela_data.buffers = new Array();
Bela_data.states = ['id', 'type', 'data'];
Bela_data.currentState = Bela_data.states[0];
Bela_data.bufferReady = false;
Bela_data.newBuffer = {};
Bela_data.target = new EventTarget();
Bela_data.events = [
    new CustomEvent('buffer-ready')
];

Bela_data.onData = function(data) {
    if(this.currentState == this.states[0]) { // buffer id
            this.bufferReady = false;
            this.newBuffer = {};
            if(data.byteLength == 1) {
                    let msgId = new Uint8Array(data);
                    this.newBuffer['id'] = parseInt(String.fromCharCode(msgId));
                    this.currentState = this.states[1];
            }
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
            switch(this.newBuffer['type']) {
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
                            console.log("Unknown buffer type");

            }
            this.buffers[this.newBuffer['id']] = this.newBuffer['data'];
            this.bufferReady = true;

            this.target.dispatchEvent( new CustomEvent('buffer-ready', { detail: this.newBuffer['id'] }) );
    }



}.bind(Bela_data);

Bela_data.formatPkt = function(id, type, dataArray) {
    let pktLen = 2;
    let arrayLen = dataArray.length;
    if(type === 'd' || type === 'f') {
        pktLen += 4*arrayLen;
    } else if (type === 'c') {
        pktLen += arrayLen;
    } else {
        return null;
    }
    let buffer = new ArrayBuffer(pktLen+2);
    let header = new Uint8Array(buffer, 0, 2);
        header[0] = id;
        header[1] = type.charCodeAt(0);
    let dataLen = new Uint16Array(buffer, 2, 1);
        dataLen[0] = arrayLen;
    let arrayView;
    if(type === 'd')  {
        arrayView = new Int32Array(buffer, 4, arrayLen);
    } else if (type === 'f') {
        arrayView = new Float32Array(buffer, 4, arrayLen);
    } else if (type === 'c') {
        arrayView = new Uint8Array(buffer, 4, arrayLen);
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
};

Bela_data.sendBuffer = function(id, type, data) {
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
    }

    let pkt = this.formatPkt(id, type, data);
    this.ws.send(pkt);
}.bind(Bela_data);
