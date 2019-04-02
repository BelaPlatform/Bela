function Slider(id, name, min, max, value, step) {
        this.id = id;
        this.name = name || 'Slider ' + id;
        this.max = max === undefined ? 1 : max;
        this.value = value === undefined ? 0 : value;
        this.step = step === undefined ? 0.1 : step;
        this.element;

        this.create();
}

Slider.prototype.create = function() {
    console.log("You just created a slider object (id = %d), it would be nice to hook it up to your GUI.", this.id);
    console.log("Re-define the create() function so that you can do that.");
    console.log("\n");
}

Slider.prototype.regenerate = function() {
        Object.assign(this, new Slider(this.id, this.name, this.min, this.max, this.value, this.step));
        console.log("Slider %d has been regenerated.", this.id);
        console.log("\n");
        return this;
}

Slider.prototype.bind = function() {
    console.log("Use this function to define the actions to take when an event is triggered on Slider %d", this.id);
    console.log("Here you should set the callback methdos for input and/or change events.");
    console.log("\n");
}

Slider.prototype.setElement = function(element) {
    this.element = element;
}

Slider.prototype.onChange = function(callback) {
        if(this.element != null) {
            console.log("No event listener for the onChange() function for slider %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}

Slider.prototype.onInput = function(callback) {
        if(this.element != null) {
            console.log("No event listener for the onInput() function for slider %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}

Slider.prototype.getVal = function() {
        if(this.element != null) {
            console.log("No event listener for the onInput() function for slider %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}

// Slider.prototype.setStyle = function(styleObj) {
//         for (let key in styleObj)
//         if (styleObj.hasOwnProperty(key))
//                 this.element.style(key, styleObj[key]);
// }
// Slider.prototype.setPosition = function(x, y) {
//         this.element.position(x, y);
// }
//
// Slider.prototype.getPosition = function() {
//         return [this.element.x, this.element.y];
// }
//
// Slider.prototype.getDimensions = function() {
//         return [this.element.width, this.element.height];
// }
