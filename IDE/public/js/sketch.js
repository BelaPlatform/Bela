let sliderSpacing = {
        baseX: 20,
        baseY: 20,
        xSpacing: 400,
        ySpacing: 60
}
var sliders = [];

var ws;

var wsAddress = "ws://" + location.host + ":5432/gui";

var ws_onerror = function(e) {
        setTimeout(() => {
                ws = new WebSocket(wsAddress);
                ws.onerror = ws_onerror;
        }, 500)
}

var ws_onopen = function() {
        console.log("Socket opened\n");
        ws.binaryType = 'arraybuffer';
        ws.onclose = ws_onerror;
        ws.onerror = undefined;
}

var ws_onmessage = function(msg) {
        var data;
        try {
                data = JSON.parse(msg.data);
        } catch (e) {
                console.log('Couldn\'t parse data', e)
        }
        console.log(data);
        if (data.event == 'connection') {
                let obj = {
                        event: "connection-reply"
                };
                obj = JSON.stringify(obj);
                if (ws.readyState === 1)
                        ws.send(obj);
        } else if (data.event == 'set-slider') {
                console.log("Set slider");
                if (sliders.find(e => e.id == data.slider) != undefined) {} else {
                        sliders.push(new Slider(data.slider, data.name, data.min, data.max, data.value, data.step));
                }
                sortSliders();
                distributeSliders();
                assignSliderLabels();
        }
}

function setup() {

        noCanvas();

        ws = new WebSocket(wsAddress);
        ws.onerror = ws_onerror;
        ws.onopen = ws_onopen;
        ws.onmessage = ws_onmessage;
}

function draw() {
  // put drawing code here
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
                if (ws.readyState === 1) ws.send(out)
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
