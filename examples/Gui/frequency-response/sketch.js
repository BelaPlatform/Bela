function sendToBela()
{
	// this is the object for which the input has changed
	let value = this.value();
	if(typeof(value) === "string")
		value = parseFloat(value);
	if(isNaN(value)) {
		// this is required for the C++ parser to recognize it as a
		// number (NaN is not recognized as a number)
		value = 0;
	}
	clearTimeout(this.timeout);
	let obj = {};
	obj[this.guiKey] = value;

	// do not send right now: throttle to avoid ultra-fast changes
	this.timeout = setTimeout(function(obj) {
		console.log("Sending ", obj);
		Bela.control.send(obj);
	}.bind(null, obj), 30);
}

class GuiSlider {
	// obj needs to contain:
	//   label, position, slider
	// Additionally:
	//   shortLabel is optional, and if present will be sent to Bela when the slider value changes
	//   p5 is optional, and if present it will be used instead of the global one
	// slider value changes
	constructor(obj) {
		this.label = obj.label;
		this.position = obj.position;
		this.slider = obj.slider;
		if(obj.p5)
			this.p5 = obj.p5;
		else
			this.p5 = p5; // assuming there is such a global object
		if(obj.shortLabel) {
			// set up action for when the parameter changes
			this.slider.guiKey = obj.shortLabel;
			this.slider.input(sendToBela);
			this.slider.timeout = undefined;
			// call the callback now to sync the running program to the GUI
			sendToBela.call(this.slider);
		}
	}
	draw() {
		this.p5.push();
		this.p5.noStroke();
		this.p5.fill(0);
		var textY = this.position[1] + 15;
		var sliderX = this.position[0] + 80;
		// labels
		this.p5.text(this.label, this.position[0], textY);
		// slider
		this.slider.position(sliderX, this.position[1]);
		// value
		// no idea why I need + 60
		this.p5.text(this.slider.value().toFixed(3), sliderX + 60 + this.slider.width, textY);
		this.p5.pop();
	}
	// can this be done more elegantly?
	value(arg) {
		if(arg)
			return this.slider.value(arg);
		return this.slider.value();
	}
}

var guiSketch = new p5(function( p ) {
	var visSliders = Array();
	var visLabels = Array("Freq Zoom", "Freq Offset", "Amplitude Zoom", "Amplitude Offset");
	var defaultVisValues = Array(0, 0, 0.5, 0.5);
	var audioSliders = Array();
	var audioLabels = Array("Cutoff (Hz)", "Q");
	var audioShortLabels = Array("cutoff", "q");
	var defaultAudioValues = Array(1000, 0.707);
	var audioSlidersRanges = Array([0, 10000], [0.1, 5]);
	var logY;
	var controlsXOff = 330;
	var controlsYOff = 200;
	var slidersSpacing = 30;
	var sampleRate = 44100;

	p.setup = function() {
		p.createCanvas(window.innerWidth, window.innerHeight);
		p.colorMode(p.RGB, 1);
		p.textSize(15);
		p.noStroke();
		for(let n = 0; n < visLabels.length; ++n)
		{
			var slider = p.createSlider(0, 1, defaultVisValues[n], 0.001);
			visSliders[n] = new GuiSlider({
					label: visLabels[n],
					position: [p.windowWidth - controlsXOff, p.windowHeight - controlsYOff + n * slidersSpacing],
					slider: slider,
					p5: p,
			});
		}
		logY = p.createCheckbox("Amplitude dB", false);
		logY.checked(true);
		for(let n = 0; n < audioLabels.length; ++n)
		{
			var slider = p.createSlider(audioSlidersRanges[n][0], audioSlidersRanges[n][1], defaultAudioValues[n], 0.001);
			audioSliders[n] = new GuiSlider({
					label: audioLabels[n],
					shortLabel: audioShortLabels[n],
					position: [p.windowWidth - controlsXOff, 55 + n * slidersSpacing],
					slider: slider,
					p5: p,
			});
		}
	}

	p.draw = function() {
		var buffers = Bela.data.buffers;
		if(!buffers.length)
			return;

		p.background(255)

		var fftSize = buffers[0].length;
		var fftSizeLog = Math.log(fftSize);
		p.strokeWeight(1);
		var zeroDbPos = visSliders[3].value();
		var dbRange = Math.max((1 - visSliders[2].value()) * 100, 0.02);
		var linVerScale = visSliders[2].value() * 2;
		var linVerOff = visSliders[3].value() - 0.5;
		var freqRange = Math.max(0.001, 1 - visSliders[0].value());
		var freqMin = -visSliders[1].value() * sampleRate / 2 / freqRange;
		for(let k in buffers)
		{
			p.noFill();
			var rem = k % 3;
			var color = p.color(0 == rem, 1 == rem, 2 == rem);
			p.stroke(color);
			p.beginShape();
			let buf = buffers[k];
			for (let i = 0; i < fftSize && i < buf.length; i++) {
				var y;
				if(logY.checked())
					y = (1/dbRange * (20*(Math.log10(buf[i])) - zeroDbPos * dbRange) + 1);
				else
					y = buf[i] * linVerScale + linVerOff;
				x = i / freqRange / fftSize + freqMin / (sampleRate/2);
				p.vertex(p.windowWidth * x, p.windowHeight * (1 - y));
			}
			p.endShape();
		}
		// draw controls
		p.noStroke();
		p.fill(0);
		p.text("Audio controls", p.windowWidth - controlsXOff, 40);
		for(let k in audioSliders)
			audioSliders[k].draw();
		p.text("Display controls", p.windowWidth - controlsXOff, p.windowHeight - controlsYOff - 70);
		for(let k in visSliders)
			visSliders[k].draw();
		logY.position(p.windowWidth - controlsXOff, p.windowHeight - controlsYOff - 50);

		// y grid
		for(let y = -1; y <= 2; y += 0.1)
		{
			p.stroke(0, 0, 0, 0.3);
			p.strokeWeight(0.2);
			var yPos;
			var txt;
			if(logY.checked()) {
				yPos = y + zeroDbPos;
				txt = (-dbRange * yPos + dbRange * zeroDbPos).toFixed(1)+'dB';
			} else {
				yPos = y - linVerOff;
				txt = ((1 - yPos - linVerOff) / linVerScale).toFixed(1);
			}
			p.line(0, yPos * p.windowHeight, p.windowWidth, yPos * p.windowHeight);
			p.noStroke();
			p.fill(0);
			p.text(txt, 60, yPos * p.windowHeight + 10);
		}

		// x grid
		for(let x = 0.1; x <= 1; x += 0.1)
		{
			var val = freqRange * (x * sampleRate/2 - freqMin) / 1000;
			if(val < 0 || val > sampleRate / 2000)
				continue;
			p.stroke(0, 0, 0, 0.3);
			p.strokeWeight(0.2);
			p.line(x * p.windowWidth, 0, x * p.windowWidth, p.windowHeight);
			txt = val.toFixed(1) + "kHz";
			p.noStroke();
			p.fill(0);
			p.text(txt, x * p.windowWidth, 10);
		}
	}

	p.windowResized = function() {
		p.resizeCanvas(window.innerWidth, window.innerHeight);
	}
}, 'gui');
