/**
 * \example Gui/Bela_to_p5
 *
 * Bela_to_p5
 * =========
 * This project is a minimalistic example on how to send data buffers from Bela to p5.js.
 * The p5.js sketch receives a buffer with only one element: a counter number. 
 * 
 * For reading a buffer coming from Bela we use the function:
 * ```
 * Bela.data.buffers[0];
 * ```
 * which returns the values stored in the buffer with index 0 (defined in render.cpp)
 * 
 **/

//array for changing the background color
let colors=['red', 'blue', 'yellow', 'white', 'cyan' ];

function setup() {
	//Create a canvas of dimensions given by current browser window
	createCanvas(windowWidth, windowHeight);

	//text font
	textFont('Courier New');
}

function draw() {
	
	//Read buffer with index 0 coming from render.cpp.
	let counter = Bela.data.buffers[0];
	
	//We change the background color
	//When starting the program, if Bela hasn't sent any value yet, counter could take the value NaN (not a number), 
	//so we check this is not the case (counter >=0):
	if (counter >= 0)
		//we take modulo so we always pick an element within the array (5 elements) 
		background(colors[counter % 5]);
	//if counter is NaN, we just set a black background until counter gets a value
	else 
		background(0);
	

	//Format and display text
	fill(100, 0, 255);
	//Adjust the size of the text to the window width
	textSize(windowWidth / 4);
	//Display text
	text(counter, 0.4 * (windowWidth), windowHeight / 2);
	
	
}


