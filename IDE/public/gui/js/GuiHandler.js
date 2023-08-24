import * as utils from './utils.js'
import GuiCreator from './GuiCreator.js'
function setup() {
	console.log("P5 setup");
}

function draw() {
	console.log("DRAW")
	background(0); // Set the background to black
	y = y - 1;
	if (y < 0) {
		y = height;
	}
	line(0, y, width, y);
}

export default class GuiHandler {
	constructor(control, parentId='gui') {
		this.control = control;
		this.parentId = parentId;
		this.parentEl = document.getElementById(this.parentId);
		this.project = null;
		this.sketchName = 'sketch';
		this.iframeId = 'gui-iframe';
		this.iframeEl = null;
		this.resources = ["../js/p5.min.js", "../js/dat.gui.min.js", "../js/jquery.js"];
		this.ready = false;
		this.creator = GuiCreator;
		this.type = {
			html: false,
			p5: false,
			controller: false
		}

		this.placeholder = {
			css: `
			font-size:30px;
			font-family:courier;
			text-align: center;
			vertical-align: middle;
			background-color:
			rgba(28, 232, 181, 0.5);
			`,
			html: `
			<h2>BELA P5 GUI</h2>
			<p>In order to use the GUI functionality in Bela</p>
			<p>you need to use the GUI library</p>
			<p>and include a sketch.js file (p5 sketch) in your project.</p>
			<p>(Your project will need to be running for the GUI to be accessible).</p>
			`
		}

		this.setPlaceholder(this.placeholder.css, this.placeholder.html);
		window.onload = this.selectProject();
	}

	setPlaceholder(css, html) {
		this.parentEl.innerHTML = html;
		this.parentEl.style.cssText = css;
	}

	clearPlaceholder() {
		this.parentEl.innerHTML = "";
		this.parentEl.style.cssText = "";
	}

	onNewConnection(event) {
		let projName = event.detail.projectName;
		if(projName != null)
		{
			if(event.target.resolve) {
				event.target.resolve(projName);
			} else {
				this.selectGui(projName);
			}
		}
	}

	getProjectName() {
		let that = this;
		let promise = new Promise(function(resolve, reject) {
			let projName = null;
			history.replaceState(null, null, ' ');

			let queryString = new URLSearchParams(window.location.search);
			if(queryString.has('project'))
				projName = queryString.get('project');

			projName = projName || that.control.projectName;

			that.control.target.addEventListener('new-connection', that.onNewConnection);
			that.control.target.resolve = resolve;

			if(projName != null)
				resolve(projName);
		});
		return promise;
	}

	selectProject () {
		this.getProjectName().then((projectName) => {
			if(projectName != "null") {
				this.project = projectName;
				this.selectGui(this.project)
			}
		});
	}

	createIframe(source) {
		let iframe = $('<iframe/>', {
			id:           this.iframeId,
			src:          source,
			style:        "position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;",
			scrolling:    "no",
			frameborder:  "0"
		}).appendTo("#"+this.parentId);
		return iframe.get( 0 );
	}

	loadIframeResources(iframe) {
		var p = Promise.resolve();

		this.resources.forEach((r) => {
			p = p.then(() => utils.loadScript(r, "head", iframe.contentWindow.document));
		});
		iframe.contentWindow.Bela = Bela;
		iframe.contentWindow.utils = utils;
		return p;
	}

	selectGui(projectName) {
		// Remove iframe
		if(this.iframeEl != null) {
			this.iframeEl.parentNode.removeChild(this.iframeEl);
			this.iframeEl = null;
		}
		let that = this;
		this.project = projectName;

		if(this.project != "exampleTempProject" && this.project != null){
			window.location.hash = '#'+this.project;
		} else {
			history.replaceState(null, null, ' ');
		}

		that.control.target.removeEventListener('new-connection', that.onNewConnection);

		window.addEventListener("message", function(event) {
			if(event.data['ready'] == true) {
				that.ready = true;
				that.control.target.dispatchEvent(new Event('gui-ready'));
			}
		});

		let htmlLocation = "/projects/"+projectName+"/main.html";
		utils.getHtml(htmlLocation).then((val) => {
			console.log("Load HTML file on iFrame...")
			that.clearPlaceholder();
			that.iframeEl = that.createIframe("/gui/gui-template.html");
			let htmlContent = val;
			that.iframeEl.onload = () => {
				that.loadIframeResources(that.iframeEl).then(() => {
					that.iframeEl.contentWindow.postMessage(htmlContent);
				});
			};
			this.type['html'] = true

		}).catch((err) => {
			console.log("HTML not loaded...");
			console.log("... try loading script");
			that.clearPlaceholder();

			that.iframeEl = that.createIframe("/gui/gui-template.html");

			that.iframeEl.onload = () => {
				that.loadIframeResources(that.iframeEl).then(() => {
					if(!this.type['controller']) {
						that.loadSketch(that.project, 'head', that.iframeEl.contentWindow.document);
						this.type['p5'] = true
					} else {

					}
					that.control.target.dispatchEvent(new Event('gui-ready'));
				});
			};
		});
		console.log('____LOADED____')

		that.control.target.dispatchEvent(new Event('gui-ready'));
		that.control.target.addEventListener('new-connection', that.onNewConnection.bind(that));
		that.control.target.resolve = null;
	}

	loadSketch(projectName, parentSection, dom, sketchName='sketch', resources=null, defaultSource = "/gui/p5-sketches/sketch.js") {
		resources = (resources == null || Array.isArray(resources)) ? resources : [resources];
		let resourcePromises = [];
		if(resources != null)
			resources.forEach(r => resourcePromises.push(this.control.loadResource("/projects/"+projectName+"/"+r)) );

		console.log("Loading "+projectName+" ...");

		let sketchSource = "/projects/"+projectName+"/"+sketchName+".js";

		let sketch = utils.loadScript(sketchSource, parentSection, dom);

		let that = this;

		let scriptElement;

		sketch.then((resolved) => {
			scriptElement = resolved;
			console.log("... "+sketchSource+ " loaded");
			let updatePromise = new Promise( (resolve, reject) => {
				let p5 = that.updateP5(that.iframeEl.contentWindow.p5);
				resolve(p5);
			})
			updatePromise.then(() => {
				utils.serialResolve(resourcePromises);
			})
		}).catch((rejected) => {
			console.log("... "+sketchSource + " couldn't be loaded.")
			if(defaultSource != null) {
				console.log("Loading %s instead", defaultSource);
				scriptElement = utils.loadScript(defaultSource, parentSection, dom);
				scriptElement
					.then((resolved) => {
						console.log("... "+defaultSource+ " loaded");
					}).catch((rejected) => {
						console.log("... "+defaultSource + " couldn't be loaded.")
					})
			}
		})
		return scriptElement;
	}

	updateP5(p5) {
		p5.prototype.loadScript = function (path) {

			const ret = {};
			var that = this;
			let resource = Bela.control.loadResource(path)
			.then(()=>{
				if (typeof that._decrementPreload === 'function') {
					that._decrementPreload();
				}
			})
			.catch(()=>{
			});

			return resource;
		};

		p5.prototype.registerPreloadMethod('loadScript', p5.prototype);
		p5 = new p5();
		return p5;
	}

}
