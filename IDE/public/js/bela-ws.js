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

    onClose = function() {
        setTimeout(() => {
                try {
                    this.ws = new WebSocket(this.ws.url);
                    this.ws.addEventListener('error', (err) => console.log("Error"));

                } catch (e) {
                    console.log("Retrying connection in %d ms\n", this.connectInterval);
                }
                this.ws.onclose = this.onClose;
                this.ws.onerror = this.onError;
        }, this.connectInterval)
    }.bind(this)

    onError = function(err){
        console.log("Error");
    }

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
	if(str[0] === "{")
	{
		try {
			data = JSON.parse(str);
			return data;
		} catch (e) {
			return false;
		}
	}
	return false;
}
