const ft = require("./fencing_time");

// A function somewhat safer than eval(parser + '(' + body + ')')...
module.exports = function(parser, ...args) {
	switch(parser.trim()) {
		case "ft":
			return ft(...args);
		break;

		default:
			return { };
	}
};
