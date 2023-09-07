import BelaWebSocket from './BelaWebSocket.js'
import GuiHandler from './GuiHandler.js'
import * as utils from './utils.js'

export default class BelaControl extends BelaWebSocket {
	constructor(port=5555, address='gui_control', ip=location.hostname) {
		super(port, address, ip)

		this.projectName = null;
		this.sliders = [];
		this.selectors = [];
		this.gui = null;
		this.gui_prototype = {}
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
		this.callbacks = {};
		this.handler = new GuiHandler(this);
	}

	registerCallback(name, callback, object=null) {
		if(typeof callback === 'function') {
			this.callbacks[name] =  {
				object: object,
				function: callback
			};
			return true;
		}
		return false;
	}

	removeCallback(name) {
		if(name in callbacks) {
			delete callbacks[name];
			return true;
		}
		return false;
	}

	addGui(name) {
		if(this.gui == null || typeof this.gui == 'undefined') {
			this.gui = new this.handler.creator('gui-container', this.handler.iframeEl.contentDocument, this.handler.iframeEl.contentWindow);
			this.gui.sliderCallback = this.sliderCallback;
		}
		let panel
		if(this.gui.panels.length < 1) {
			panel = this.gui.newPanel(name);
		}
	}

	addSlider(sliderObject) {
		if(this.gui != null) {
			let param_exist = typeof(this.gui.parameters[0]) != 'undefined'
			param_exist = param_exist && sliderObject.controller in this.gui.parameters[0]

			if(!param_exist || !(sliderObject.name in this.gui.parameters[0][sliderObject.controller])) {
				delete Object.assign(sliderObject, {['guiId']: sliderObject['controller'] })['controller'];
				let slider = this.gui.newSlider(sliderObject)
				this.sliders.push(slider);
			}
		}
	}

	setSliderValue(sliderObject) {
		if(this.gui != null) {
			let slider = this.sliders[sliderObject.index];
			if(!slider || slider.property != sliderObject.name) {
				console.log("Unknown sliderObject ", sliderObject);
				return;
			}
			slider.setValue(sliderObject.value);
		}
	}

	onData(data, parsedData) {
		let that = this;
		(async function() {
			await new Promise(resolve => that.target.addEventListener('gui-ready', function(){
				resolve();
			}));
			that.target.removeEventListener('gui-ready', function(){
				resolve();
			});
			if(!(Object.keys(that.gui_prototype).length === 0 && that.gui_prototype.constructor === Object)) {
				for (let p in that.gui_prototype) {
					that.addGui.bind(that)
					that.addGui(p)
					that.gui_prototype[p]['sliders'].forEach(s => {
						that.addSlider(s)
					});
					delete that.gui_prototype[p]
				}
			}
		})();

		if (parsedData.event == 'connection') {
			console.log('_____NEW_CONNECTION_____')
			if(parsedData.projectName) {
				console.log("Project name: "+parsedData.projectName);
				this.projectName = parsedData.projectName;
				this.events[2].detail.projectName = this.projectName;
			}
			if(this.gui != null) {
				this.gui.destroy();
				this.gui = null;
			}
			this.handler.ready = false;
			Object.keys(this.handler.type).forEach(k => this.handler.type[k] = false)

			this.target.dispatchEvent(this.events[2]);
			this.send({event: "connection-reply"});

		} else if (parsedData.event == 'set-controller') {
			console.log('____SET CONTROLLER____')
			this.handler.type['controller'] = true
			if(parsedData.name) {
				if(this.handler.ready) {
					this.addGui.bind(that)
					this.addGui(parsedData.name)
				} else {
					this.gui_prototype[parsedData.name] = {sliders: []}
				}
			}
		} else if (parsedData.event == 'set-slider') {
			let precision = 7; // float32
			parsedData.value = Number(parsedData.value.toFixed(7));
			parsedData.max = Number(parsedData.max.toFixed(7));
			parsedData.min = Number(parsedData.min.toFixed(7));
			parsedData.step = Number(parsedData.step.toFixed(7));
			let slider = {
				controller: parsedData.controller,
				name: parsedData.name,
				value: parsedData.value,
				max: parsedData.max,
				min: parsedData.min,
				step: parsedData.step
			}
			if(this.handler.ready) {
				this.addSlider.bind(that)
				this.addSlider(slider)
			} else {
				this.gui_prototype[parsedData.controller]['sliders'].push(slider);
			}
		} else if (parsedData.event == 'set-slider-value') {
			let precision = 7; // float32
			parsedData.value = Number(parsedData.value.toFixed(7));
			let slider = {
				controller: parsedData.controller,
				index: parsedData.index,
				name: parsedData.name,
				value: parsedData.value,
			}
			this.setSliderValue.bind(that);
			this.setSliderValue(slider);
		} else if (parsedData.event == 'set-select'){
		} else if (parsedData.event == 'custom') {
		}

		Object.values(this.callbacks).forEach( c  => c.function.call(c.object, parsedData) );
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

	loadResource(path, module=false) {
		return utils.loadScript(path, "head", this.handler.iframeEl.contentWindow.document, module);
	}
}
