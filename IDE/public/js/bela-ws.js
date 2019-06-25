class BelaWebSocket {
    constructor(port, address, ip = location.host) {
        this.port = port;
        this.address = address;
        this.ip = ip;

        this.ws;
        this.connectInterval = 1500;
        this.url = "ws://" + this.ip + ":"+this.port+"/"+this.address;

        this.connect(this.url);
    }

    connect(url) {
        this.ws = new WebSocket(url);
        var that = this;
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
                this.ws.onopen = this.onOpen;
                this.ws.onclose = this.onClose;
                this.ws.onerror = this.onError;
                this.ws.onmessage = this.onMessage;
        }, connectInterval)
    }

    onClose = function(event) {
        console.log("Socket closed")
        // If socket was not closed normally
        if(event.code != 1000)
            this.reconnect(this.connectInterval);
    }.bind(this)

    onError = function(err){
        console.log("Error: "+err.code);
        console.log(err);

        switch (err.code){
    		case 'ECONNREFUSED':
    			this.reconnect(this.connectInterval);
    			break;
    		default:
    			break;
        }
    }.bind(this)

    onOpen = function() {
            console.log("Socket opened on %s\n", this.ws.url);
            this.ws.binaryType = 'arraybuffer';
            this.ws.onclose = this.onClose;
            this.ws.onerror = this.onError;
    }.bind(this)

    onMessage = function(msg) {
        // console.log("New message received on %s\n", this.ws.url);
        let data = msg.data;
        let parsedData = isJson(data);

        if(parsedData) {
            if(event.data == 'connection') {
                let obj = {
                    event: "connection-reply"
                };
                print("Connection reply: \n" + obj);
                obj = JSON.stringify(obj);
                if (this.ws.readyState === 1)
                    this.ws.send(obj);
            }
        }
        this.onData(data, parsedData);
    }.bind(this)

    onData = function(data, parsedData) {

    }.bind(this)
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
