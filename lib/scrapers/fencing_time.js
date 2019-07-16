// This scraper is awful because it was written rapidly; another one should be made.
// At least one improvement should be made: pre-parsing of names and nations
// and pre-generation of the tableau to directly enter the scores.
// For now, we just don't care... 'cause it works!

const	htmlParser	= require("cheerio");

// TODO: shouldn't be here
const DEFAULT_NATION = "INC";

// TODO: oh god, a RegEx!
const SCORE_REGEX = /([0-9]{1,2}) - ([0-9]{1,2})/;

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};

module.exports = function(body, nameFmt, from=6) {
	const	$			= htmlParser.load(body),
			tableau		= {},
			dictionnary	= {},
			results		= {};

	// First parsing: global parsing of the table
	// Get fencers' names and nation
	$("tbody > tr").each((ir, tr) => {
		// The two first tr are simply indicating the table number
		if(ir <= 1) { return; }

		// We need each td because the count is important for table finding
		$(tr).find("td").each((id, td) => {
			// Only get names and nation (select by classes)
			if($(td).hasClass("tbb") || $(td).hasClass("tbbr")) {
				const	table		= "t" + Math.pow(2, from - id),
						tempName	= $(td).find(".tcln").text() + " " + $(td).find(".tcfn").text();

				if(!Array.isArray(dictionnary[tempName])) {
					dictionnary[tempName] = ["", DEFAULT_NATION];
				}

				// Fencers are not in the good order
				// so we try to get the nation from T64
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

				tableau[table][match][player] = [tempName, "", [0, false]];
			}

			// Get score... in bad order...
			if($(td).hasClass("tscoref")) {
				// Scores are one td away from their table
				const	table		= "t" + Math.pow(2, (from + 1) - id);

				if(!Array.isArray(results[table])) {
					results[table] = new Array();
				}

				// Some score boxes are empty
				if($(td).text().trim() !== "") {
					const scores = SCORE_REGEX.exec($(td).text());

					if(scores) {
						results[table].push([parseInt(scores[1]), parseInt(scores[2])]);
					} else {
						results[table].push([0, 0]);
					}
				} else {
					// Special case: no adversary
					results[table].push([0, 0]);
				}
			}
		});
	});

	// Well, this one is not created everytime, it seems...
	if(!Array.isArray(tableau["t1"])) {
		tableau["t1"] = [["", "", [0, false]]];
		results["t2"] = [[0, 0]];
	}

	// Second parsing: re-parse our table to add missing nations, correct names
	// and define scores.
	for(let table in tableau) {
		for(let m = 0; m < tableau[table].length; m++) {
			for(let p = 0; p < tableau[table][m].length; p++) {
				const data = dictionnary[tableau[table][m][p][0]];

				const	nextTable	= "t" + parseInt(table.slice(1)) / 2,
						nextM		= Math.floor(m / 2),
						nextP		= 1 - ((m + 1) % 2);

				// Search for winners
				if(
					nextTable !== "t0.5" &&
					tableau[table][m][p][0] == tableau[nextTable][nextM][nextP][0]
				) {
					tableau[table][m][p][2][1] = true;
				}

				if(table !== "t1") {
					tableau[table][m][p][0] = data[0];
					tableau[table][m][p][1] = data[1];
					tableau[table][m][p][2][0] = tableau[table][m][p][2][1] ? results[table][m].max() : results[table][m].min();
				}
			}
		}
	}

	// This is a problem of Fencing Time: creating a T1...
	delete tableau["t1"];
	delete results;
	delete dictionnary;

	return tableau;
};
