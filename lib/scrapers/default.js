const ft = require("./fencing_time");

// A function somewhat safer than eval(parser + '(' + body + ')')...
module.exports = function(parser, body) {
	switch(parser.trim()) {
		case "ft":
			return ft(body);
		break;

		default:
			return { "terror": "The required parser is unknown" };
	}
};
