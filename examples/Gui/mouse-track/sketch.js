/**
 * \example Gui/mouse-track
 *
 * GUI mouse tracker
 * =========
 *
 * p5js file that reads mouse (x,y) coordinates and send them to render.cpp through a buffer
 *
 **/


let canvas_dimensions;

function setup() {
	//Create a canvas of dimensions given by current browser window
	createCanvas(windowWidth, windowHeight);
}

function draw() {
	background(220);
	//draw horizontal and vertical line that intersect in mouse position
	line(mouseX, 0, mouseX, height);
  	line(0, mouseY, width, mouseY);
}

function mouseMoved() {
	//Sends to render.cpp a buffer. First argument is buffer index, second one is data type and third one is data sent.
	//In this case we send an array with two elements.
	Bela.data.sendBuffer(0, 'float', [mouseX/width, mouseY/height]);
}


