const ft = require("./fencing_time");
const eg = require("./engarde_escrime");

// A function somewhat safer than eval(parser + '(' + body + ')')...
module.exports = function(parser, ...args) {
	switch(parser.trim()) {
		case "ft":
			return ft;
		break;

		case "eg":
			return eg;
		break;

		default:
			return { };
	}
};
