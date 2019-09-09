function GuiSelect(id, name, options, value) {
        this.id = id;
        this.name = name || 'Select ' + id;
        this.options = options === undefined ? [] : options;
        this.value = value === undefined ? 0 : value;
        this.element = null;

        this.create();
}

GuiSelect.prototype.create = function() {
    console.log("You just created a select object (id = %d), it would be nice to hook it up to your GUI.", this.id);
    console.log("Re-define the create() function so that you can do that.");
    console.log("\n");
}

GuiSelect.prototype.regenerate = function() {
        Object.assign(this, new Select(this.id, this.name, this.min, this.max, this.value, this.step));
        console.log("Select %d has been regenerated.", this.id);
        console.log("\n");
        return this;
}

GuiSelect.prototype.bind = function() {
    console.log("Use this function to define the actions to take when an event is triggered on select %d", this.id);
    console.log("Here you should set the callback methods for input and/or change events.");
    console.log("\n");
}

GuiSelect.prototype.setElement = function(element) {
    console.log("Setting select %id element", this.id);
    this.element = element;
}

GuiSelect.prototype.onChange = function(callback) {
        if(this.element != null) {
            console.log("No event listener for the onChange() function for select %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this select (id = %d)", this.id);
            console.log("\n");
        }
}

GuiSelect.prototype.getVal = function(val) {
        if(this.element != null) {
            console.log("No getVal() method for select %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this select (id = %d)", this.id);
            console.log("\n");
        }
}

GuiSelect.prototype.getSelection = function(val) {
        if(this.element != null) {
            console.log("No getSelection() function for select %d has been defined.", this.id);
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this select (id = %d)", this.id);
            console.log("\n");
        }
}

GuiSelect.prototype.setVal = function(val) {
        if(this.element != null) {
            console.log("This method should be used to set the value of the select.");
            console.log("You should define one according to your GUI framework.");
            console.log("\n");
        } else {
            console.log("There is no element assigned to this select (id = %d)", this.id);
            console.log("\n");
        }
}
