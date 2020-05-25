let trillWidth = 0.0;
let belaLogo;
let trills = [];

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	Bela.control.loadResource("/libraries/Trill/Trill.js");
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	frameRate(60);
	trillWidth = width/4;
	border = (trillWidth * 0.5) + 50;
	// TODO: generate these dynamically based on the data received from the backend
	trills.push(new Trill('bar', trillWidth, [border, border]));
	trills.push(new Trill('square', trillWidth * 0.75, [border, height-border]));
	trills.push(new Trill('ring', trillWidth * 0.5, [width-border, border]));
	trills.push(new Trill('hex', trillWidth * 0.5, [width-border, height-border]));
}

function draw() {
	background(240);
	resizeElements();
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

function resizeElements() {
	// for(let t of trills)
	// 	t.resize(trillWidth);
}

function windowResized() {
	resizeElements();
	resizeCanvas(windowWidth, windowHeight);
}
