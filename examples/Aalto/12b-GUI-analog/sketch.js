var guiSketch = new p5(function( sketch ) {

  // These parameters effect the behaviour of the waves
  let minFrequency = 0.5;
  let maxFrequency = 6;
  let minAmplitude = 0.05;
  let maxAmplitude = 0.5;

  // variables
  let amplitude;
  let frequency;

  // Perlin noise is a random sequence generator producing a more natural ordered, 
  // harmonic succession of numbers compared to the standard random() function.
  const simplex = new sketch.noise();

  // Create a new canvas to the browser size
  sketch.setup = function() {
    sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
    
    sketch.mouseX = sketch.windowWidth / 2;
    sketch.mouseY = sketch.windowHeight / 2;
  };

  // On window resize, update the canvas size
  sketch.windowResized = function() {
    sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
  };

  // Render loop that draws shapes with p5
  sketch.draw = function() {
    sketch.background(0);
    
    // Read from Bela
    let input = Bela.data.buffers[0];
    
    // lerp() calculates a number between two numbers at a specific increment. 
    const frequency = sketch.lerp(minFrequency, maxFrequency, input);
    const amplitude = sketch.lerp(minAmplitude, maxAmplitude, input);
    
    const dim = Math.min(sketch.windowWidth, sketch.windowHeight);
    
    // Draw the background
    sketch.noFill();
    sketch.stroke(255);
    sketch.strokeWeight(dim * 0.0055);
    
    const time = sketch.millis() / 1000;
    const rows = 50;

    // Draw each line
    for (let y = 0; y < rows; y++) {
      // Determine the Y position of the line
      const v = rows <= 1 ? 0.5 : y / (rows - 1);
      const py = v * sketch.windowHeight;
      sketch.drawNoiseLine({
        v,
        start: [ 0, py ],
        end: [ sketch.windowWidth, py ],
        amplitude: amplitude * sketch.windowHeight,
        frequency,
        time: time * 0.5,
        steps: 150
      });
    }
  };

  sketch.drawNoiseLine = function(opt = {}) {
    const {
      v,
      start,
      end,
      steps = 10,
      frequency = 1,
      time = 0,
      amplitude = 1
    } = opt;
    
    const [ xStart, yStart ] = start;
    const [ xEnd, yEnd ] = end;

    // Create a line by walking N steps and interpolating
    // from start to end point at each interval
    sketch.beginShape();
    for (let i = 0; i < steps; i++) {
      // Get interpolation factor between 0..1
      const t = steps <= 1 ? 0.5 : i / (steps - 1);

      // Interpolate X position
      const x = sketch.lerp(xStart, xEnd, t);
      
      // Interpolate Y position
      let y = sketch.lerp(yStart, yEnd, t);
      
      // Offset Y position by noise
      y += (sketch.noise(t * frequency + time, v * frequency, time)) * amplitude;
      
      // Place vertex
      sketch.vertex(x, y);
    }
    sketch.endShape();
  };

}, 'gui');
