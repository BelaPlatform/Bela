
// replace most non alpha-numeric chars with '_'
function sanitise(name){
	return name.replace(/[^a-zA-Z0-9\.\-\+\%\_\/~]/g, '_');
}

module.exports.sanitise = sanitise;
