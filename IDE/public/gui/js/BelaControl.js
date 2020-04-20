import BelaWebSocket from './BelaWebSocket.js'

export default class BelaControl extends BelaWebSocket {
    constructor(port=5555, address='gui_control', ip=location.host) {
        super(port, address, ip)

        this.projectName = null;
        this.sliders = [];
        this.selectors = [];
        this.gui = null;

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
            }),
            new CustomEvent('new-controller', {
                detail: {
                    name: null
                }
            }),
            new CustomEvent('custom', {
                detail: {
                    data: null
                }
            }),
            new CustomEvent('slider-changed', {
                detail: { }
            }),
        ];

    }

    onData(data, parsedData) {
        console.log("Data!")
        console.log(parsedData)


    	if (parsedData.event == 'connection') {
            if(parsedData.projectName) {
                console.log("Project name: "+parsedData.projectName);
                this.projectName = parsedData.projectName;
                this.events[2].detail.projectName = this.projectName;
            }
            this.target.dispatchEvent(this.events[2]);
            if(this.gui != null) {
                this.gui.destroy();
                this.gui = null;
            }
        }
        let that = this;
        (async function() {
            await new Promise(resolve => that.target.addEventListener('gui-ready', function(){
                resolve();
            }));
            that.target.removeEventListener('gui-ready', function(){
                resolve();
            });

            if (parsedData.event == 'connection') {
                if(parsedData.projectName) {
                    console.log("Project name: "+parsedData.projectName);
                    that.projectName = parsedData.projectName;
                    that.events[2].detail.projectName = that.projectName;
                }
                if(that.gui != null) {
                    that.gui.destroy();
                    that.gui = null;
                }
                that.target.dispatchEvent(that.events[2]);
                that.send({event: "connection-reply"});

            } else if (parsedData.event == 'set-controller') {
                if(parsedData.name) {
                    console.log("Controller name: "+parsedData.name);
                    console.log(that.gui);
                    if(that.gui == null || typeof that.gui == 'undefined') {
                        that.gui = new that.handler.creator('gui-container', that.handler.iframeEl.contentDocument, that.handler.iframeEl.contentWindow);
                        that.gui.sliderCallback = that.sliderCallback;
                        console.log("that.gui->"+that.gui);
                    }
                    let panel
                    if(that.gui.panels.length < 1)
                        panel = that.gui.newPanel(parsedData.name);

                    // that.send({event: "controller-reply", id: panel.id})
                }
            } else if (parsedData.event == 'set-slider') {
                console.log("Set slider");
                let precision = 7; // float32
                parsedData.value = Number(parsedData.value.toFixed(7));
                parsedData.max = Number(parsedData.max.toFixed(7));
                parsedData.min = Number(parsedData.min.toFixed(7));
                parsedData.step = Number(parsedData.step.toFixed(7));

                if(typeof(that.gui.parameters[0]) == 'undefined' || !(parsedData.name in that.gui.parameters[0][parsedData.controller]))
                    that.gui.newSlider( {guiId: parsedData.controller, name: parsedData.name, val: parsedData.value, min: parsedData.min, max: parsedData.max, step: parsedData.step })

                // that.events[0].detail.id = parsedData.slider;
                // this.target.dispatchEvent(this.events[0]);
            } else if (parsedData.event == 'set-select'){
                console.log("Set select");

            } else if (parsedData.event == 'custom') {
                console.log(parsedData)
            } else {
                console.log(parsedData);
            }
        })();
    }

    sliderCallback(value) {
        let val = Number(value.toFixed(7));
        let obj = {};
        obj['event'] = 'slider';
        obj['controller'] = this.__gui.name;
        obj['name'] = this.property;
        obj['value'] = val;
        let p = window.Bela.control.gui.getPanel({guiId: obj['controller']});
        let params = window.Bela.control.gui.parameters[p.id][obj['controller']];
        let index =  Object.keys(params).indexOf(obj['name']);
        obj['slider'] = index;
        console.log(obj);
        window.Bela.control.send(obj);
    }

    send(data) {
        var obj;
        try {
                obj = JSON.stringify(data);
        } catch (e) {
                console.log('Could not stringify slider json:', e);
        }
        if (this.ws.readyState === 1)
            this.ws.send(obj);
    }

    send(data) {
        let obj = JSON.stringify(data);
        if (this.ws.readyState === 1)
            this.ws.send(obj);
    }

    send(data) {
        if (this.ws.readyState === 1)
            this.ws.send(JSON.stringify(data));
    }
}
