let trill;
let belaLogo;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	Bela.control.loadResource("/libraries/Trill/Trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	trill = new Trill('square');
	windowResized();
}

function draw() {
	background(240);
	let activeVTouches = Bela.data.buffers[0];
	let activeHTouches = Bela.data.buffers[1];
	for(let t = 0; t < activeVTouches; t++) {
		for(let u = 0; u < activeHTouches; u++) {
			trill.updateTouch(t*activeVTouches + u, [Bela.data.buffers[2][u], Bela.data.buffers[3][t]], Bela.data.buffers[4][t]);
		}
	}

	trill.draw();
	image(belaLogo,width-170, height-70,120,50);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	trill.resize(height * 0.7);
	trill.position = [width / 2, height / 2];
}
