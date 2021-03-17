let belaLogo;
let trill;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	loadScript("/libraries/Trill/Trill.js")
}

function setup() {
	createCanvas(windowWidth, windowHeight);
	trill = new Trill('bar');
	trill.sensorColor = 'rgba(255, 204, 0, 0.85)';
	windowResized();
}

function draw() {
	background(240);
	let activeTouches = Bela.data.buffers[0];
	for(let t = 0; t < activeTouches; t++) {
		trill.updateTouch(t, Bela.data.buffers[1][t], Bela.data.buffers[2][t]);
	}
	trill.draw();

	image(belaLogo, width-170, height-70, 120, 50);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	trill.resize(height * 0.7);
	trill.position = [width / 2, height / 2];
}
