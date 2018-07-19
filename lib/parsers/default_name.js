// Capitalize a string (only first letter uppercase)
// From http://www.geekality.net/2010/06/30/javascript-uppercase-first-letter-in-a-string/
String.prototype.ucfirst = function() {
	return this.charAt(0).toUpperCase() + this.substr(1).toLowerCase();
}

// Check if a string is uppercased
String.prototype.is_uppercase = function() {
	return this == this.toUpperCase();
}

// List of countries on which last names are put before first name
// This list is temporary, and relies only on local conventions
// TODO: should be put into a config file?
const INVERTED_COUNTRIES = [
	"TWN", // Taiwan
	"TPE", // Taiwan
	"CHN", // China
	"KOR", // Korea
	"HKG"  // Hong Kong
];

// Shorthand function: give a name and it'll be splitted into parts and
// re-constructed depending on the country it belongs to.
module.exports = function(name, country, force=false) {
		// Split the name in multiple parts, to allow multiple names, like PEREZ MAURICE
	var splittedName	= name.split(" "),
		// First are surnames, then names
		surNames		= [[], []],
		// The result of the function: formatted name
		fmtName			= "",
		// Type of the name part: surname, 0 ; name, 1
		type			= 0;

	// Capitalize each part of the name
	for(var part = 0; part < splittedName.length; part++) {
		// We assume it's a surname
		type = 0;

		// If the name is uppercased, then it's a family name
		if(splittedName[part].is_uppercase())
			type = 1;

		// Handle for "-" in the name part
		var caretName = splittedName[part].split("-");

		// For each part sperated by "-"...
		for(var car = 0; car < caretName.length; car++) {
			// ...capitalize the part.
			caretName[car] = caretName[car].ucfirst();
		}

		// Push everything to the corresponding sub-array, joined
		surNames[type].push(caretName.join("-"));
	}

	// If our country is on inverted countries list
	if(INVERTED_COUNTRIES.indexOf(country) > -1 || force)
		// Reassemble the name in this order: name then surname, and remove spaces
		return (surNames[1].join(" ") + " " + surNames[0].join(" ")).trim();
	else
		// Reassemble the name in this order: surname then name, and remove spaces
		return (surNames[0].join(" ") + " " + surNames[1].join(" ")).trim();
};
