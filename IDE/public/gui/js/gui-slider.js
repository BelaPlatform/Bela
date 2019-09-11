function GuiSlider(id, name, min, max, value, step) {
        this.id = id;
        this.name = name || 'Slider ' + id;
        this.min = min === undefined ? 0 : min;
        this.max = max === undefined ? 1 : max;
        this.value = value === undefined ? 0 : value;
        this.step = step === undefined ? 0.1 : step;
        this.element = null;

        this.create();
}

GuiSlider.prototype.create = function() {
    console.log("You just created a slider object (id = %d), it would be nice to hook it up to your GUI.", this.id);
    console.log("Re-define the create() function so that you can do that.");
    console.log("\n");
}

GuiSlider.prototype.regenerate = function() {
        Object.assign(this, new Slider(this.id, this.name, this.min, this.max, this.value, this.step));
        console.log("Slider %d has been regenerated.", this.id);
        console.log("\n");
        return this;
}

GuiSlider.prototype.bind = function() {
    console.log("Use this function to define the actions to take when an event is triggered on Slider %d", this.id);
    console.log("Here you should set the callback methods for input and/or change events.");
    console.log("\n");
}

GuiSlider.prototype.setElement = function(element) {
    console.log("Setting slider %id element", this.id);
    this.element = element;
}

GuiSlider.prototype.onChange = function(callback) {
        if(this.element != null) {
            console.log("No event listener for the onChange() function for slider %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}

GuiSlider.prototype.onInput = function(callback) {
        if(this.element != null) {
            console.log("No event listener for the onInput() function for slider %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}

GuiSlider.prototype.getVal = function(val) {
        if(this.element != null) {
            console.log("No getVal() method for slider %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}

GuiSlider.prototype.setVal = function(val) {
        if(this.element != null) {
            console.log("This method should be used to set the value of the slider.");
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this slider (id = %d)", this.id);
            console.log("\n");
        }
}
