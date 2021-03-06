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
			score = $(e).text().replace(/&#xA0;/gi, "").trim().replace(" >>", '').split('/').map(c => parseInt(c));
		});

		// Try to get results if there are any
		if(ir % 32 === 17) {
			scoreTable = 't' + Math.pow(2, from - 3);
		} else if(ir % 16 === 9) {
			scoreTable = 't' + Math.pow(2, from - 2);
		} else if(ir % 8 === 5) {
			scoreTable = 't' + Math.pow(2, from - 1);
		} else if(ir % 4 === 3) {
			scoreTable = 't' + Math.pow(2, from);
		}

		// Get the actual round from logical order
		if(ir % 32 === 16) {
			table = 't' + Math.pow(2, from - 4);
		} else if(ir % 16 === 8) {
			table = 't' + Math.pow(2, from - 3);
		} else if(ir % 8 === 4) {
			table = 't' + Math.pow(2, from - 2);
		} else if(ir % 4 === 2) {
			table = 't' + Math.pow(2, from - 1);
		} else if(ir % 2 === 1) {
			table = 't' + Math.pow(2, from);
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
		if(table === 't' + Math.pow(2, from)) {
			dictionnary[name] = [nameFmt(name, nation), nation];
		}

		// If we got a score, add it to the corresponding temporary table
		if(scoreTable !== "") {
			results[scoreTable].push(score);
		}

		// Add our result to the global tableau
		tableau[table][match].push([name, nation, [0, false]]);
	});

	// Sometimes, for teams, a bad table is generated from third place
	if(tableau["t16"][8]) tableau["t16"].pop();

	for(let table in tableau) {
		for(let m = 0; m < tableau[table].length; m++) {
			for(let p = 0; p < tableau[table][m].length; p++) {
				// Get the winner of the match
				const nextTable = 't' + parseInt(table.substring(1)) / 2;
				const nextMatch = (m - (m % 2)) / 2;
				const nextPlayer = m % 2;

				if(Array.isArray(results[table])) {
					const winner = tableau[nextTable][nextMatch][nextPlayer][0];

					// Append results
					if(winner !== '') {
						tableau[table][m][p][2][0] = (tableau[table][m][p][0] === winner) ? results[table][m][0] : results[table][m][1];
					} else {
						tableau[table][m][p][2][0] = 0;
					}
					tableau[table][m][p][2][1] = tableau[table][m][p][0] === winner;
				}

				// Add nations for intermediary tableaux and good name formatting
				if(Array.isArray(dictionnary[tableau[table][m][p][0]])) {
					tableau[table][m][p][1] = dictionnary[tableau[table][m][p][0]][1];
					tableau[table][m][p][0] = dictionnary[tableau[table][m][p][0]][0];
				}
			}
		}
	}

	// This one makes no sense, so delete it
	delete tableau["t1"];

	return tableau;
};