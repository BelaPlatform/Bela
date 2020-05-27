var sketch = function(p) {
    // Global variables
    var voltPlot;
    var autoScroll = true;
    var keyPressed = false;
	var voltDataPoints = [];


	// Listen to event triggered by Bela.data when a new buffer is ready
    Bela.data.target.addEventListener('buffer-ready', function(event) {
    	// Wait for the buffer containing the voltages before updating both timestamps and voltages
        if(event.detail == 1 && typeof Bela.data.buffers[1] != 'undefined')
        {
        	// Assuming that timestamps and voltages buffers have the same length...
            for (i = 0; i < Bela.data.buffers[1].length; i++) {
				// Convert timestamp to seconds
                var timeIndex = Bela.data.buffers[0][i]/1000;
                var voltPointVal = Bela.data.buffers[1][i];
				// Create new voltage point
                var newVoltPoint = new GPoint(timeIndex, voltPointVal, "("+timeIndex+" , "+voltPointVal+")");
				voltDataPoints.push(newVoltPoint);
            }
        }
    });

    // Initial setup
    p.setup = function() {

        // Create canvas
        p.createCanvas(p.windowWidth, p.windowHeight);

        // Creat plot
        voltPlot = new GPlot(p);
        voltPlot.setPos(0, 0);
        voltPlot.setMar(60, 70, 40, 70);
        voltPlot.setOuterDim(p.width, p.height);
        voltPlot.setAxesOffset(0);
        voltPlot.setTicksLength(2);
        voltPlot.activatePointLabels();
        voltPlot.setPointColor(p.color(128, 0, 255, 100));


        // Prepare the points
        voltPoints = [];

        // Set the points, the title and the axis labels
        voltPlot.setPoints(voltPoints);
        voltPlot.getYAxis().setAxisLabelText("Voltage (V)");
        voltPlot.getXAxis().setAxisLabelText("Time (seconds)");

    };

    // Execute the sketch
    p.draw = function() {
        // Clean the canvas
        p.background(255);

		// Set auto scroll on the X-axis
        if(autoScroll) {
            voltPlot.setXLim(voltPlot.calculatePlotXLim())
        }
      
    	// If space bar is pressed
        if (p.keyIsPressed === true && p.key === ' ') {
            if(!keyPressed) {
                keyPressed = true;
                // Change auto scroll
                autoScroll = !autoScroll;
                
                if(!autoScroll) { //If auto scroll not active
                	// Activate panning
                    voltPlot.activatePanning();
                    // Activate zooming
                    voltPlot.activateZooming(1.1, p.CENTER, p.CENTER);
                    voltPlot.setPointColor(p.color(0, 0, 255));
                    
                } else { //If auto scroll active
                	// Deactivate panning
                    voltPlot.deactivatePanning();
                    // Deactivate zooming
                    voltPlot.deactivateZooming();
			        voltPlot.setPointColor(p.color(128, 0, 255, 100));
                }
                if (voltPlot.fixedYLim) {
                     voltPlot.fixedYLim = false;
                }
            }
        } else {
            keyPressed = false;
        }

    // Draw the plot
	if(voltDataPoints.length > 0)
	{
		voltPlot.setPoints(voltDataPoints);
        voltPlot.beginDraw();
        voltPlot.drawBackground();
        voltPlot.drawBox();
        voltPlot.drawXAxis();
        voltPlot.drawYAxis();
        voltPlot.drawTitle();
        voltPlot.drawPoints();
        voltPlot.drawLines();
        voltPlot.drawLabels();
        voltPlot.endDraw();
	}


    };
};

var guiSketch;
// Load grafica library
$.getScript('../gui/js/grafica.min.js', function()
{
    guiSketch = new p5(sketch);
});
