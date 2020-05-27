export default class GuiCreator {
	constructor(containerId='gui-container', dom=document, win=window, wsHandler) {
		this.wsHandler = wsHandler;
		this.dom = dom;
		this.window = win;
		this.container = dom.getElementById(containerId);
		if(this.container == null) {
			this.container = dom.createElement('div');
			this.container.setAttribute("id", containerId);
			this.container.setAttribute("class", "flex-container");
		}
		this.panel = function(id, element, gui) {
			this.id = id;
			this.element = element;
			this.gui = gui;
		};

		this.panels = [];
		this.fillPanels = [];

		this.parameters = [];

		this.panel_props = {
			autoPlace: false,
			resizable : false,
			width: 400
		}
	}

	newPanel(name) {
		let pElement = this.dom.createElement("div");
		let gui = new this.window.dat.GUI({
			autoPlace: this.panel_props.autoPlace,
			resizable : this.panel_props.resizable,
			width: this.panel_props.width
		})
		this.panels.push( new this.panel(this.panels.length, pElement, gui) );

		let f = gui.addFolder(name);
		f.open();
		this.removeCloseButton(gui);

		pElement.appendChild(gui.domElement);
		pElement.setAttribute("id", "gui-panel-"+this.panels.length);
		pElement.setAttribute("class", "gui-panel");
		this.container.appendChild(pElement);
		this.addFillPanels();
		return this.panels.slice(-1).pop();
	}

	removeCloseButton(guiObj) {
		let closeButton = guiObj.domElement.getElementsByClassName("close-button")[0];
		guiObj.domElement.removeChild(closeButton);
	}
	removeFillPanels() {
		for(let fp in this.fillPanels) {
			this.fillPanels[fp].parentNode.removeChild(this.fillPanels[fp]);
		}
		this.fillPanels = [];
	}

	addFillPanels() {
		this.removeFillPanels()
		let numColumns = Math.floor(window.innerWidth/this.panel_props.width);
		let numFill = (numColumns - numColumns * ((this.panels.length/numColumns) % 1)) % numColumns;

		for(let i = 0; i < numFill; i++) {
			let fillP = document.createElement("div");
			fillP.setAttribute("class", "fill-panel");
			fillP.className += " gui-panel";
			fillP.setAttribute("display", "none");
			fillP.style.width = this.panel_props.width+"px";
			this.fillPanels.push(fillP);
			this.container.appendChild(fillP);
		}
	}

	newSlider({guiId, name, value=0.5, min=0, max=1, step=0.01, panelId, parent}) {
		if(typeof(guiId) == 'undefined') return null;

		value = value>max ? max : value;
		value = value<min ? min : value;
		step = step === undefined || step === 0 ? 0.0001 : step;

		let p = this.getPanel({guiId: parent});
		if(p == null)
			p = this.getPanel({guiId: guiId, panelId: panelId});
		if(p == null)
			p = this.newPanel(guiId);

		let guiF = p.gui.__folders[guiId];
		if(guiF == null) {
			guiF = p.gui.addFolder(guiId);
			guiF.open();
		}

		this.parameters[p.id] = this.parameters[p.id] || {};
		this.parameters[p.id][guiId] = this.parameters[p.id][guiId] || {};
		this.parameters[p.id][guiId][name] = value;

		let slider = guiF.add(this.parameters[p.id][guiId], name, min, max, step);
		// disable input
		slider.domElement.getElementsByTagName("input")[0].disabled = true
		slider.onChange(this.sliderCallback);
		return slider;
	}

	getPanel({guiId, panelId}) {
		let p = this.panels[panelId];
		if(p == null) {
			if(typeof(guiId) == 'undefined') return null;
			let matchP = this.panels.filter(p => { return p.gui.__folders.hasOwnProperty(guiId)});
			if(matchP.length) {
				p = matchP[0];
			}
		}
		return p;
	}

	sliderCallback(value) {
		let val = Number(value.toFixed(7));

		let obj = {};
		obj['controller'] = this.__gui.name;
		obj['name'] = this.property;
		obj['value'] = val;
		return obj;
	}

	destroy() {
		for (let [key, value] of Object.entries(this.panels)) {
			value.gui.destroy();
		}
	}
}
