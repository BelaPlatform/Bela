 /**
 * \example Gui/simple
 *
 * GUI simple
 * =========
 * p5js file that receives a buffer of data from render.cpp (sinewave value). Then, it creates a circle whose size depends
 * on the input read.
 *
 **/

function setup() {
	createCanvas(windowWidth, windowHeight);
}

function draw() {
	// Draw a white background with opacity
	background(255, 10);

	// Retrieve the data being sent from render.cpp
	let sine = Bela.data.buffers[0];

	// Draw a circle whose size changes with the value received from render.cpp
	noFill();
	strokeWeight(10);
	ellipse(windowWidth / 2, windowHeight / 2, (windowHeight-100)*sine, (windowHeight-100)*sine);

	// Draw a circle on the left hand side whose position changes with the values received from render.cpp
	ellipse(100, windowHeight/2 + (((windowHeight/2)-100)*sine), 50, 50);
	// Draw the zero crossing line
	line(50,windowHeight/2,150,windowHeight/2);
}
