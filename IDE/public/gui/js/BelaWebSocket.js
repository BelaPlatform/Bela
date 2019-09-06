export default class BelaWebSocket {
    constructor(port, address, ip = location.host) {
        this.port = port;
        this.address = address;
        this.ip = ip;

        this.ws = null;
        this.connectInterval = 1500;
        this.url = "ws://" + this.ip + ":"+this.port+"/"+this.address;

        this.connect(this.url);
    }

    connect(url) {
        this.ws = new WebSocket(url);
        var that = this;
        this.ws.parent = that;
        this.ws.onopen = this.onOpen;
        this.ws.onclose = this.onClose;
        this.ws.onerror = this.onError;
        this.ws.onmessage = this.onMessage;

    }

    reconnect(connectInterval) {
        setTimeout(() => {
                console.log("Retrying connection in %d ms\n", connectInterval);
                try {
                    this.ws = new WebSocket(this.ws.url);
                } catch (e) {
                }
                this.ws.parent = this;
                this.ws.onopen = this.ws.parent.onOpen;
                this.ws.onclose = this.ws.parent.onClose;
                this.ws.onerror = this.ws.parent.onError;
                this.ws.onmessage = this.ws.parent.onMessage;
        }, connectInterval)
    }

    onClose(event) {
        console.log("Socket closed")
        // If socket was not closed normally
        if(event.code != 1000)
        {
            console.log("Reconnecting(1)...");
            console.log(this.parent);
            this.parent.reconnect(this.parent.connectInterval);
        }
    }

    onError(err){
        console.log("Error: "+err.code);
        console.log(err);

        switch (err.code){
    		case 'ECONNREFUSED':
                console.log("Reconnecting(2)...");
    			this.reconnect(this.connectInterval);
    			break;
    		default:
    			break;
        }
    }

    onOpen() {

            console.log("Socket opened on %s\n", this.url);
            this.binaryType = 'arraybuffer';
            this.onclose = this.parent.onClose;
            this.onerror = this.parent.onError;
    }

    onData(data, parsedData) {
        return false;
    }

    onMessage(msg) {
        let data = msg.data;
        let parsedData = isJson(data);

        if(parsedData) {
            if(parsedData.event.data == 'connection') {
                let obj = {
                    event: "connection-reply"
                };
                print("Connection reply: \n" + obj);
                obj = JSON.stringify(obj);
                if (this.readyState === 1)
                    this.send(obj);
            }
        }
        this.parent.onData(data, parsedData);
    }
}

function isJson(str) {
	let data;
    	try {
		data = JSON.parse(str);
		return data;
	} catch (e) {
		return false;
	}
}
