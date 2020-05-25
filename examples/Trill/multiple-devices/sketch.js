let belaLogo;
let trills = [];

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	Bela.control.loadResource("/libraries/Trill/Trill.js");
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	frameRate(60);
	Bela.control.registerCallback('myCallback', function(data) {
		if( 'connectedDevices' === data.event) {
			trills = [];
			console.log("connectedDevices ", data);
			for(let dev of data.devices)
				trills.push(new Trill(dev, 1)); // dimensions and location are overridden in windowResized()
		}
		windowResized(); // place the trills on the canvas
	});
	// just a dummy call to the backend, so that it knows we are ready
	// and it sends us the list of devices
	Bela.control.send({givemethedevices: ""});
}

function draw() {
	background(240);
	for(let n = 0; n < Bela.data.buffers.length && n < trills.length; ++n)
	{
		let size = Bela.data.buffers[n][0];
		let loc = Bela.data.buffers[n][1];
		let locH = Bela.data.buffers[n][2];
		trills[n].updateTouch(0, [loc, locH], size);
		trills[n].draw();
	}
	image(belaLogo, width-170, height-70, 120, 50);
}

function windowResized() {
	let trillWidth = width / 5;
	for(let t of trills)
		t.resize(trillWidth);
	let hSpace = width * 3 / 4;
	let vSpace = height * 3 / 4;
	for(let n = 0; n < trills.length; ++n) {
		// two columns, two rows
		trills[n].position = [50 + hSpace * Math.floor(n / 2), 50 + vSpace * (n & 1)];
	}
	resizeCanvas(windowWidth, windowHeight);
}
