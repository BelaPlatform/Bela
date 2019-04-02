var stdGuiSketch_template = function( sketch ) {

    let canvas_dimensions = [200,200];
    let sliderSpacing = {
            baseX: 20,
            baseY: 20,
            xSpacing: 400,
            ySpacing: 60
    }
    let sliderStyle = {
            width: '300px',
            height: '30px'
    };

    sketch.setup = function() {

        // Create Canvas
        sketch.createCanvas(canvas_dimensions[0], canvas_dimensions[1]);

        // Expand Bela_control Slider Class
        Bela_control.Slider.prototype.create = function() {
            this.element = createSlider(this.min, this.max, this.value, this.step);
            return this.element;
        }
        Bela_control.Slider.prototype.onChange = function(callback) {
            this.element.changed(callback);
        }
        Bela_control.Slider.prototype.onInput = function(callback) {
            this.element.input(callback);
        }
        Bela_control.Slider.prototype.getVal = function() {
            return this.element.value();
        }
        Bela_control.Slider.prototype.setStyle = function(styleObj) {
                for (let key in styleObj)
                if (styleObj.hasOwnProperty(key))
                        this.element.style(key, styleObj[key]);
        }
        Bela_control.Slider.prototype.assignLabel = function() {
            let labelOffset = 10;
            console.log(this.id);
            this.label = sketch.createSpan(this.name);
            let sPos = this.getPosition();
            this.label.position(sPos[0], sPos[1] - labelOffset);
            this.label.style('white-space', 'nowrap');
        }
        Bela_control.Slider.prototype.setPosition = function(x, y) {
                this.element.position(x, y);
        }
        Bela_control.Slider.prototype.getPosition = function() {
                return [this.element.x, this.element.y];
        }
        /**
         For each slider:
            - Assign element (p5 slider)
            - Set style
            - Bind change/input elements
         **/
        for(s in Bela_control.sliders)
        {
            let slider = Bela_control.sliders[s];
            slider.setElement(sketch.createSlider(slider.min, slider.max, slider.value, slider.step));
            slider.setStyle(sliderStyle);
            slider.bind();
        }

        // Re-order sliders
        sortSliders();
        // Re-distribute sliders
        distributeSliders();

        // Assign labels
        for(s in Bela_control.sliders)
        {
            let slider = Bela_control.sliders[s];
            slider.assignLabel();
        }
    };

    sketch.draw = function() {
        sketch.background(255);
    }

    function sortSliders() {
            Bela_control.sliders = Bela_control.sliders.sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
    }

    function assignSliderLabels() {
            let labelOffset = 10;
            for (s in Bela_control.sliders) {

            }
    }

    function distributeSliders() {
            for (s in Bela_control.sliders) {
                    if (s > 0) {
                            prevPos = Bela_control.sliders[s - 1].getPosition();
                            x = prevPos[0];
                            y = prevPos[1] + sliderSpacing.ySpacing;
                            if (y > sketch.windowHeight - 20) {
                                    y = sliderSpacing.baseY;
                                    x = x + sliderSpacing.xSpacing;
                            }
                    } else {
                            x = sliderSpacing.baseX;
                            y = sliderSpacing.baseY;
                    }
                    Bela_control.sliders[s].setPosition(x, y);
            }
    }

};

var stdGuiSketch = new p5(stdGuiSketch_template);


var downloadObjectAsJson = function(exportObj, exportName, space, format){
  var format = format || ".json";
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, space||null));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + format);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

var getGuiStatus = function(download = true) {
        let statusObj = {};
        let date = new Date();
        for(s in Bela_control.sliders)
        {
                statusObj[Bela_control.sliders[s].id] =
                {
                        name: Bela_control.sliders[s].name,
                        value: Bela_control.sliders[s].element.value()
                }
        }
        if(download) {
                downloadObjectAsJson(statusObj, 'p5_standard_gui_'+date.getTime());
        }
        return JSON.stringify(statusObj);
}

var setGuiStatus = function(jsonObj) {
        let statusObj = JSON.parse(jsonObj);
        for(s in statusObj)
        {
                let matchS = Bela_control.sliders.find(e => e.id == s);
                matchS.element.value(statusObj[s].value);
        }
}
