let belaLogo;
let trills = [];

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	loadScript("/libraries/Trill/Trill.js");
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
		let location;
		if('hex' === trills[n].type || 'square' === trills[n].type)
			location = [locH, loc];
		else
			location = loc;
		trills[n].updateTouch(0, location, size);
		trills[n].draw();
	}
	image(belaLogo, width-170, height-70, 120, 50);
}

function windowResized() {
	let trillWidth = width / 2.1;
	for(let t of trills) {
		let width = trillWidth;
		if('square' == t.type)
			width *= 0.45;
		else if('ring' == t.type)
			width *= 0.4;
		else if('hex' == t.type)
			width *= 0.4;
		t.resize(width);
	}
	let hBorder = (trillWidth * 0.5) + 10;
	let vBorder = (trillWidth * 0.3) + 10;
	for(let n = 0; n < trills.length; ++n) {
		// up to two columns, two rows
		let hPos = hBorder;
		let vPos = vBorder;
		if(Math.floor(n / 2))
			hPos = width - hPos;
		if(n & 1)
			vPos = height - vPos;
		trills[n].position = [hPos, vPos];
	}
	resizeCanvas(windowWidth, windowHeight);
}
