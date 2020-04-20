
// replace most non alpha-numeric chars with '_'
function sanitise(name, options){
	var isPath = false;
	if(options && options.isPath)
		isPath = options.isPath;
	var newName = name.replace(/[^a-zA-Z0-9\.\-\+\%\_\/~]/g, '_');
	// if this is a folder or file name (and not a path), then we do not allow '/'
	if(!isPath)
		newName = newName.replace(/[\/]/g, '_');
	console.log("FROM: ", name, "SANITISED: ", newName);
	return newName;
}

module.exports.sanitise = sanitise;
