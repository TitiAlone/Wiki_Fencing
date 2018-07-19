const	htmlParser	= require("cheerio");

// TODO: shouldn't be here
const DEFAULT_NATION = "INC";

module.exports = function(body, nameFmt) {
	const	$			= htmlParser.load(body),
			tableau		= {},
			dictionnary	= {};

	// Global parsing of the table
	$("tbody > tr").each((ir, tr) => {
		if(ir <= 1) { return; }

		$(tr).find("td").each((id, td) => {
			if($(td).hasClass("tbb") || $(td).hasClass("tbbr")) {
				const	table		= "t" + Math.pow(2, 6 - id),
						tempName	= $(td).find(".tcln").text() + " " + $(td).find(".tcfn").text();

				if(!Array.isArray(dictionnary[tempName])) {
					dictionnary[tempName] = ["", DEFAULT_NATION];
				}

				// Fencers are not in the good order, so we try to get the nation from T64
				if(dictionnary[tempName][1] === DEFAULT_NATION) {
					const	nationText	= $(td).find(".tcaff").text();
					const	nation		= nationText === "" ? DEFAULT_NATION : nationText;

					const	name		= nameFmt(
						tempName,
						nation
					);

					dictionnary[tempName] = [name, nation];
				}

				if(!Array.isArray(tableau[table])) {
					tableau[table] = new Array();
				}

				if(tableau[table].length == 0 || tableau[table][tableau[table].length - 1].length == 2) {
					tableau[table].push([]);
				}

				const match = tableau[table].length - 1;
				const player = tableau[table][match].length;

				tableau[table][match][player] = [tempName, "", 0];
			}
		});
	});

	for(let table in tableau) {
		for(let m = 0; m < tableau[table].length; m++) {
			for(let p = 0; p < tableau[table][m].length; p++) {
				const data = dictionnary[tableau[table][m][p][0]];

				tableau[table][m][p][0] = data[0];
				tableau[table][m][p][1] = data[1];
			}
		}
	}

	delete dictionnary;
	// This is a problem of Fencing Time: creating a T1...
	delete tableau["t1"];

	return tableau;
};
