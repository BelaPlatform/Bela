let belaLogo;
let trill;

function preload() {
	belaLogo = loadImage('../images/logo_bar14.png');
	loadScript("/libraries/Trill/Trill.js")
}

let touchText;
function setup() {
	createCanvas(windowWidth, windowHeight);
	trill = new Trill('bar', 1, [1, 1], 0.9, 128); // actual length and position set in windowResized()
	touchText = createElement("div", "");
	windowResized();
}

function draw() {
	background(240);
	let activeTouches = Bela.data.buffers[0];
	let text = "";
	for(let t = 0; t < activeTouches; t++) {
		let location = Bela.data.buffers[1][t];
		let size = Bela.data.buffers[2][t];
		trill.updateTouch(t, location, size);
		text += "[" + t + "] " + location.toFixed(4) + ", " + size.toFixed(2) + "<br \>";
	}
	touchText.html(text);
	trill.draw();

	image(belaLogo, width-170, height-70, 120, 50);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	let trillCentreHor = windowWidth / 2;
	let trillCentreVer = windowHeight / 2;
	let trillWidth = windowWidth * 0.7;
	trill.resize(trillWidth);
	trill.position = [trillCentreHor, trillCentreVer];
	touchText.position(trillCentreHor - trillWidth / 2 - 120, trillCentreVer - 50);
}
