let sliderSpacing = {
        baseX: 20,
        baseY: 20,
        xSpacing: 400,
        ySpacing: 60
}
var sliders = [];

var ws_control;
var ws_data;

var ws_controlAddress = "ws://" + location.host + ":5555/gui_control";
var ws_dataAddress = "ws://" + location.host + ":5555/gui_data";

var ws_control_onerror = function(e) {
        setTimeout(() => {
                ws_control = new WebSocket(ws_controlAddress);
                ws_control.onerror = ws_control_onerror;
        }, 500)
}

var ws_data_onerror = function(e) {
        setTimeout(() => {
                ws_data= new WebSocket(ws_dataAddress);
                ws_data.onerror = ws_data_onerror;
        }, 500)
}

var ws_control_onopen = function() {
        console.log("Socket opened\n");
        ws_control.binaryType = 'arraybuffer';
        ws_control.onclose = ws_control_onerror;
        ws_control.onerror = undefined;
}

var ws_data_onopen = function() {
        console.log("Socket opened\n");
        ws_data.binaryType = 'arraybuffer';
        ws_data.onclose = ws_data_onerror;
        ws_data.onerror = undefined;
}

var ws_control_onmessage = function(msg) {
        let data;

        try {
                data = JSON.parse(msg.data);
        } catch (e) {
                console.log('Couldn\'t parse data', e)
        }
	if (data.event == 'connection') {
		let obj = {
			event: "connection-reply"
		};
		obj = JSON.stringify(obj);
		if (ws_control.readyState === 1)
			ws_control.send(obj);
	} else if (data.event == 'set-slider') {
		console.log("Set slider");
		if (sliders.find(e => e.id == data.slider) != undefined) {} else {
			sliders.push(new Slider(data.slider, data.name, data.min, data.max, data.value, data.step));
		}
		sortSliders();
		distributeSliders();
		assignSliderLabels();
	} else if (data.event == 'data-buffer'){
                console.log(data);
        }
}
var buffers = new Array();

const states = ['id', 'type', 'data'];
let currentState = states[0];
let bufferReady = false;
let newBuffer = {};
var ws_data_onmessage = function(msg) {
	let data;
        if(currentState == states[0]) { // buffer id
                bufferReady = false;
                newBuffer = {};
                if(msg.data.byteLength == 1) {
                        let msgId = new Uint8Array(msg.data);
                        newBuffer['id'] = parseInt(String.fromCharCode(msgId));
                        currentState = states[1];
                }
        } else if (currentState == states[1]) { // type
                if(msg.data.byteLength == 1) {
                        let msgType = new Uint8Array(msg.data);
                        newBuffer['type'] = String.fromCharCode(msgType);
                        currentState = states[2];
                } else {
                        currentState = states[0];
                }
        } else if (currentState == states[2]) { // data
                currentState = states[0];
                switch(newBuffer['type']) {
                        case 'c':
                                let charInt = new Uint8Array(msg.data);
                                charInt = Array.from(charInt);
                                let charArr = charInt.map((e) => {
                                        return String.fromCharCode(e);
                                });
                                newBuffer['data'] = charArr;
                                break;
                        case 'i':
                                let intArr = new Int32Array(msg.data);
                                newBuffer['data'] = Array.from(intArr);
                                break;
                        case 'f':
                                let floatArr = new Float32Array(msg.data);
                                newBuffer['data'] = Array.from(floatArr);
                                break;
                        case 'd':
                                let doubleArr = new Float64Array(msg.data);
                                newBuffer['data'] = Array.from(doubleArr);
                                break;
                        default:
                                console.log("Unknown buffer type");

                }
                buffers[newBuffer['id']] = newBuffer['data'];
                bufferReady = true;
                redraw();
        }

	data = msg.data;
}

function setup() {

        //noCanvas();
        createCanvas(250, 250);

        ws_control = new WebSocket(ws_controlAddress);
        ws_control.onerror = ws_control_onerror;
        ws_control.onopen = ws_control_onopen;
        ws_control.onmessage = ws_control_onmessage;

        ws_data = new WebSocket(ws_dataAddress);
        ws_data.onerror = ws_data_onerror;
        ws_data.onopen = ws_data_onopen;
        ws_data.onmessage = ws_data_onmessage;
}

function draw() {
  // put drawing code here
  background(255);
  textSize(32);
  text(buffers[0][0].toString(), 10, 30);

}

function sortSliders() {
        sliders = sliders.sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
}

function assignSliderLabels() {
        let labelOffset = 10;
        for (s in sliders) {
                let label = createSpan(sliders[s].name);
                let sPos = sliders[s].getPosition();
                label.position(sPos[0], sPos[1] - labelOffset);
                label.style('white-space', 'nowrap');
        }
}

function distributeSliders() {
        for (s in sliders) {
                if (s > 0) {
                        prevPos = sliders[s - 1].getPosition();
                        x = prevPos[0];
                        y = prevPos[1] + sliderSpacing.ySpacing;
                        if (y > windowHeight - 20) {
                                y = sliderSpacing.baseY;
                                x = x + sliderSpacing.xSpacing;
                        }
                } else {
                        x = sliderSpacing.baseX;
                        y = sliderSpacing.baseY;
                }
                sliders[s].setPosition(x, y);
        }
}

function Slider(id, name, min, max, value, step) {
        this.id = id;
        this.name = name || 'Slider ' + id;
        this.min = min || 0;
        this.max = max || 1;
        this.value = value || 0.5;
        this.step = step || 0;
        this.element;

        this.create();

        let style = {
                width: '300px',
                height: '30px'
        };

        this.setStyle(style);

        this.onChange(() => {
                console.log("*Slider(" + this.id + ")" + " aka. '" + this.name + "' -> " + this.getVal());
        });
        this.onInput(() => {
                console.log("Slider(" + this.id + ")" + " aka. '" + this.name + "' -> " + this.getVal());
                this.value = this.getVal();
                var obj = {
                        event: "slider",
                        slider: this.id,
                        value: this.value
                };
                var out;
                try {
                        out = JSON.stringify(obj);
                } catch (e) {
                        console.log('could not stringify slider json:', e);
                        return;
                }
                if (ws_control.readyState === 1) ws_control.send(out)
        });
}

Slider.prototype.create = function() {
        this.element = createSlider(this.min, this.max, this.value, this.step);
        return this.element;
}

Slider.prototype.setStyle = function(styleObj) {
        for (let key in styleObj)
        if (styleObj.hasOwnProperty(key))
                this.element.style(key, styleObj[key]);
}

Slider.prototype.onChange = function(callback) {
        this.element.changed(callback);
}

Slider.prototype.onInput = function(callback) {
        this.element.input(callback);
}

Slider.prototype.getVal = function() {
        return this.element.value();
}

Slider.prototype.setPosition = function(x, y) {
        this.element.position(x, y);
}

Slider.prototype.getPosition = function() {
        return [this.element.x, this.element.y];
}

Slider.prototype.getDimensions = function() {
        return [this.element.width, this.element.height];
}

var downloadObjectAsJson = function(exportObj, exportName, space, format){
  var format = format || ".json";
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, space||null));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + format);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

var getGuiStatus = function(download = true) {
        let statusObj = {};
        let date = new Date();
        for(s in sliders)
        {
                statusObj[sliders[s].id] =
                {
                        name: sliders[s].name,
                        value: sliders[s].element.value()
                }
        }
        if(download) {
                downloadObjectAsJson(statusObj, 'P5Gui_'+date.getTime());
        }
        return JSON.stringify(statusObj);
}

var setGuiStatus = function(jsonObj) {
        let statusObj = JSON.parse(jsonObj);
        for(s in statusObj)
        {
                let matchS = sliders.find(e => e.id == s);
                matchS.element.value(statusObj[s].value);
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
