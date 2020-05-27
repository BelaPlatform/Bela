function setup() {
	//Create a canvas of dimensions given by current browser window
	createCanvas(windowWidth, windowHeight);

	//text formatting
	textSize(50);
	textFont('Courier New');
}

function draw() {
	background(254);

	//Read buffer with index 0 coming from render.cpp.
	let date = Bela.data.buffers[0];

	//Transform to a string
	if(date && date.length >= 7){
		//Store dd-mm-yyyy
		let dateString = date[2]+'-'+date[1]+'-'+date[0];
		//Store hour:minutes:seconds.miliseconds
		dateString += ' '+date[3]+':'+date[4]+':'+date[5]+'.'+date[6];

		//Format and display text
		fill(255, 0, 255);
		text(dateString , 40,height/2);
	}
}
