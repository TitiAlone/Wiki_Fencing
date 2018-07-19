const ft = require("./fencing_time");

// A function somewhat safer than eval(parser + '(' + body + ')')...
module.exports = function(parser, body, nameFmt) {
	switch(parser.trim()) {
		case "ft":
			return ft(body, nameFmt);
		break;

		default:
			return { };
	}
};
