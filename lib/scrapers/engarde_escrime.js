const htmlParser = require("cheerio");

// TODO: shouldn't be here
const DEFAULT_NATION = "INC";

module.exports = function(body, nameFmt, from=6) {
	const	$			= htmlParser.load(body),
			tableau		= {},
			dictionnary	= {},
			results		= {};
			
	$(".tableau tbody > tr").each((ir, tr) => {
		let	name = "",
			nation = DEFAULT_NATION,
			score = [0, 0],
			table = "",
			scoreTable = "";

		// Discard the first line
		if(ir < 1) return;

		// Scrapping name
		$(tr).find("td.HBD.fencer").each((_, e) => {
			name = $(e).html().replace(/&#xA0;/gi, "").trim();
		});

		// Scrapping nation
		$(tr).find("td.HBD.nation").each((_, e) => {
			nation = $(e).html().replace(/&#xA0;/gi, "").trim();
		});

		// Scrapping results
		$(tr).find("td.score").each((_, e) => {
			score = $(e).html().replace(/&#xA0;/gi, "").trim().split('/');
		});

		// TODO: make it possible to extract T8, ... and add constants (and for?)
		// Try to get results if there are any
		if(ir % 8 === 5) {
			scoreTable = "t32";
		} else if(ir % 4 === 3) {
			scoreTable = "t64";
		}

		// Get the actual round from logical order
		if(ir % 8 === 4) {
			// T16
			table = "t16";
		} else if(ir % 4 === 2) {
			// T32
			table = "t32";
		} else if(ir % 2 === 1) {
			// T64
			table = "t64";
		} else {
			// Nothing here
			return;
		}

		// If the table does not exist, create it
		if(!Array.isArray(tableau[table])) {
			tableau[table] = new Array();
		}

		// Same for score tableau
		if(!Array.isArray(results[scoreTable])) {
			results[scoreTable] = new Array();
		}

		// Find out the last match
		let match = tableau[table].length;

		// In case the previous match is not full, we need to pop in
		if(Array.isArray(tableau[table][match - 1]) && tableau[table][match - 1].length < 2) {
			match--;
		}

		// If we have a new match, add it
		if(!Array.isArray(tableau[table][match])) {
			tableau[table].push([]);
		}

		// For 64-tableau, add the name to our dictionnary
		if(table === "t64") {
			dictionnary[name] = [nameFmt(name, nation), nation];
		}

		// If we got a score, add it to the corresponding temporary table
		if(scoreTable !== "") {
			results[scoreTable].push(score);
		}

		// Add our result to the global tableau
		tableau[table][match].push([name, nation, [0, false]]);
	});

	for(let table in tableau) {
		for(let m = 0; m < tableau[table].length; m++) {
			for(let p = 0; p < tableau[table][m].length; p++) {
				// Append results
				if(Array.isArray(results[table])) {
					tableau[table][m][p][2][0] = parseInt(results[table][m][p]);
					tableau[table][m][p][2][1] = results[table][m][p] > results[table][m][1 - p];
				}

				// Add nations for intermediary tableaux and good name formatting
				if(Array.isArray(dictionnary[tableau[table][m][p][0]])) {
					tableau[table][m][p][1] = dictionnary[tableau[table][m][p][0]][1];
					tableau[table][m][p][0] = dictionnary[tableau[table][m][p][0]][0];
				}
			}
		}
	}

	return tableau;
};