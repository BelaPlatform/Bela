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
            this.ewBuffer = {};
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
            // this.target.dispatchEvent(this.events[0]);
            this.target.dispatchEvent( new CustomEvent('buffer-ready', { detail: this.newBuffer['id'] }) );

    }

}.bind(Bela_data);
