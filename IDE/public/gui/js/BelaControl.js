import BelaWebSocket from './BelaWebSocket.js'

export default class BelaControl extends BelaWebSocket {
    constructor(port=5555, address='gui_control', ip=location.host) {
        super(port, address, ip)

        this.projectName = null;
        this.sliders = [];
        this.selectors = [];

        this.target = new EventTarget();
        this.events = [
            new CustomEvent('new-slider', {
                detail: {
                    id: null
                }
            }),
            new CustomEvent('new-select', {
                detail: {
                    id: null
                }
            }),
            new CustomEvent('new-connection', {
                detail: {
                    projectName: null
                }
            })
        ];
    }

    onData(data, parsedData) {

    	if (parsedData.event == 'connection') {
            if(parsedData.projectName) {
                console.log("Project name: "+parsedData.projectName);
                this.projectName = parsedData.projectName;
                this.events[2].detail.projectName = this.projectName;
            }
            this.target.dispatchEvent(this.events[2]);
            this.sendEvent("connection-reply");
    	} else if (parsedData.event == 'set-slider') {
    		console.log("Set slider");
            let slider;
    		if ((slider = this.sliders.find(e => e.id == parsedData.slider)) != undefined) {
                slider.setVal(parsedData.value);
            } else {
    			this.sliders.push(new this.Slider(parsedData.slider, parsedData.name, parsedData.min, parsedData.max, parsedData.value, parsedData.step));
    		}
            this.events[0].detail.id = parsedData.slider;
            this.target.dispatchEvent(this.events[0]);
    	} else if (parsedData.event == 'set-select'){
            console.log("Set select");
            let select;
            if ((select = this.selectors.find(e => e.id == parsedData.select)) != undefined) {
                select.setVal(parsedData.value);
            } else {
                this.selectors.push(new this.Select(parsedData.select, parsedData.name, parsedData.options, parsedData.value));
            }
            this.events[1].detail.id = parsedData.select;
            this.target.dispatchEvent(this.events[1]);

        }
    }

    sendEvent (data) {
        let obj = {
            event: data
        };
        obj = JSON.stringify(obj);
        if (this.ws.readyState === 1)
            this.ws.send(obj);
    }
}
