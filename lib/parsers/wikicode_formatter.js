// Serialize an array of matches into some Wikicode
//
// Take as optional parameter (default 4), the number of breaks to do
// The output look like this:
// ||{{NATION1-d}} [[FENCER1]]|SCORE1||{{NATION2-d}} [[FENCER2]]|SCORE2|
// And again...
// TODO: Make winners with < 15 points bold
module.exports = function(tableau, teams=false, limit=64) {
	var formatting = [];

	for(let table in tableau) {
		var result = "";

		if(parseInt(table.slice(1)) > limit) { continue; }

		const matches = tableau[table];

		// We need to iterate over all our matches
		for(var i = 0; i < matches.length; i++) {
			// Player 1 nation
			result += "||";
			// Make it bold if win
			if(matches[i][0][2] == 15) { result += "'''"; }

			result += "{{";
			// Special case: GBR => GBR2
			result += (matches[i][0][1] == "GBR") ? "GBR2" : matches[i][0][1];

			// This shouldn't be done if we only care about the nation
			if(!teams) { result += "-d"; }
			result += "}} ";

			// Player 1 name
			if(!teams) {
				result += "[[";
				result += matches[i][0][0];
				result += "]]";
			}

			result += "|";

			// Make it bold if win
			if(matches[i][0][2] == 15) { result += "'''"; }

			// Player 1 score
			result += matches[i][0][2];

			// Player 2 nation
			result += "||";
			// Make it bold if win
			if(matches[i][1][2] == 15) { result += "'''"; }

			result += "{{";
			result += (matches[i][1][1] == "GBR") ? "GBR2" : matches[i][1][1];

			// This shouldn't be done if we only care about the nation
			if(!teams) { result += "-d"; }
			result += "}} ";

			// Player 2 name
			if(!teams) {
				result += "[[";
				result += matches[i][1][0];
				result += "]]";
			}

			result += "|";

			// Make it bold if win
			if(matches[i][1][2] == 15) { result += "'''"; }

			// Player 2 score
			result += matches[i][1][2];

			// End of the line, carriage return
			result += "|";

			if(i < matches.length - 1) {
				result += "\n";
			}

			// Convenience for formatting: cut the results into four parts
			/*if(
				// If we've counted n quarters of total matches...
				(i + 1) % (matches.length / 4) == 0 &&
				// ...and we're not at the last match...
				(i + 1) < matches.length
			) {
				// ...jump two lines for easy paste on Wikipedia
				result += "\n\n";
			}*/
		}

		formatting.push(result);
	}

	return formatting;
};
