Bela_control = new BelaWebSocket(5555, "gui_control");
Bela_control.sliders = [];
Bela_control.target = new EventTarget();
Bela_control.events = [
    new CustomEvent('new-slider', {
        detail: {
            id: null
        }
    }),
    new CustomEvent('new-select'),
];

Bela_control.onData = function(data, parsedData) {

	if (parsedData.event == 'connection') {
		let obj = {
			event: "connection-reply"
		};
        console.log("Connection reply")
		obj = JSON.stringify(obj);
		if (Bela_control.ws.readyState === 1)
			Bela_control.ws.send(obj);
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
        // console.log(parsedData.select);
        // console.log(parsedData.name);
        // console.log(parsedData.value);
        // console.log(data);
        this.target.dispatchEvent(this.events[1]);
    }
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
