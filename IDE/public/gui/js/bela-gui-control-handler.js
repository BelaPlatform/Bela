Bela_control = new BelaWebSocket(5555, "gui_control");
Bela_control.projectName = null;
Bela_control.sliders = [];
Bela_control.selectors = [];

Bela_control.target = new EventTarget();
Bela_control.events = [
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

Bela_control.onData = function(data, parsedData) {

	if (parsedData.event == 'connection') {
        if(parsedData.projectName) {
            console.log("Project name: "+parsedData.projectName);
            Bela_control.projectName = parsedData.projectName;
            this.events[2].detail.projectName = Bela_control.projectName;
        }
        this.target.dispatchEvent(this.events[2]);
        Bela_control.sendEvent("connection-reply");
	} else if (parsedData.event == 'set-slider') {
		console.log("Set slider");
        let slider;
		if ((slider = Bela_control.sliders.find(e => e.id == parsedData.slider)) != undefined) {
            slider.setVal(parsedData.value);
        } else {
			Bela_control.sliders.push(new Bela_control.Slider(parsedData.slider, parsedData.name, parsedData.min, parsedData.max, parsedData.value, parsedData.step));
		}
        this.events[0].detail.id = parsedData.slider;
        this.target.dispatchEvent(this.events[0]);
	} else if (parsedData.event == 'set-select'){
        console.log("Set select");
        let select;
        if ((select = Bela_control.selectors.find(e => e.id == parsedData.select)) != undefined) {
            select.setVal(parsedData.value);
        } else {
            Bela_control.selectors.push(new Bela_control.Select(parsedData.select, parsedData.name, parsedData.options, parsedData.value));
        }
        this.events[1].detail.id = parsedData.select;
        this.target.dispatchEvent(this.events[1]);

    }
}.bind(Bela_control)

Bela_control.sendEvent = function(data) {
    let obj = {
        event: data
    };
    obj = JSON.stringify(obj);
    if (this.ws.readyState === 1)
        this.ws.send(obj);
}.bind(Bela_control)

Bela_control.Slider = GuiSlider;

Bela_control.Slider.prototype.bind = function() {
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
                    console.log('Could not stringify slider json:', e);
                    return;
            }
            if (Bela_control.ws.readyState === 1) Bela_control.ws.send(out);
    });
}

Bela_control.Select = GuiSelect;

Bela_control.Select.prototype.bind =    function() {
    this.onChange(() => {
        console.log("Select(" + this.id + ")" + " aka. '" + this.name + "' -> " + this.getSelection());
        this.value = this.getVal();
        var obj = {
                event: "select",
                select: this.id,
                value: this.value
        };
        var out;
        try {
                    out = JSON.stringify(obj);
        } catch (e) {
                console.log('Could not stringify select json:', e);
                return;
        }
        if (Bela_control.ws.readyState === 1) Bela_control.ws.send(out);
    });
}
