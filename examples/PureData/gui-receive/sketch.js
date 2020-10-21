function setup() {
    createCanvas(windowWidth, windowHeight);
}

function draw() {
    background(220);
	line(mouseX, 0, mouseX, height);
		line(0, mouseY, width, mouseY);
}

function mouseMoved() {
	mouseX = mouseX/windowWidth;
	mouseY = mouseY/windowHeight;
	Bela.data.sendBuffer(0, 'float', [mouseX, mouseY]);
	Bela.control.send({mouseX: mouseX, mouseY: mouseY});
}

function mousePressed(event) {
	Bela.control.send({clickX: event.screenX/width, clickY: event.screenY/height});
}
