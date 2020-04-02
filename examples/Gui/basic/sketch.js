/**
 * \example Gui/basic
 *
 * GUI basic
 * =========
 *
 * p5js file that display a basic text in the browser
 *
 * This is a very simple example, it doesn't implement any communication (sending buffers) between render.cpp and sketch.js
 *
 **/


let canvas_dimensions;
let string;

function setup() {
	string = "";

	//Create a canvas of dimensions given by current browser window
	canvas_dimensions = [windowWidth, windowHeight];
	createCanvas(canvas_dimensions[0], canvas_dimensions[1]);
}

function draw() {
	background('rgba(28, 232, 181, 0.5)');

	//Format and display a basic text in the browser's window.
	textSize(round(windowWidth/50));
	textFont('Courier');
	textAlign(CENTER, CENTER);
	string = string + "Hello!";
	string = string + "\n\n This is a basic p5 example \nto help you get started with the Bela GUI";
	text(string,  width/2,  height/2);

	//Stop looping the draw() function
	noLoop();
}
