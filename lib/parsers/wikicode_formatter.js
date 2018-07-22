// Serialize an array of matches into some Wikicode
//
// Take as optional parameter (default 4), the number of breaks to do
// The output look like this:
// ||{{NATION1-d}} [[FENCER1]]|SCORE1||{{NATION2-d}} [[FENCER2]]|SCORE2|
// And again...
module.exports = function(matches, teams=false, cut=4) {
	var formatting = [""];

	// We need to iterate over all our matches
	for(var i = 0; i < matches.length; i++) {
		if(matches[i][0][0].trim() != "" && matches[i][0][1].trim() != "INC") {
			// Player 1 nation
			formatting[formatting.length - 1] += "||";
			// Make it bold if win
			if(matches[i][0][2][1]) { formatting[formatting.length - 1] += "'''"; }

			formatting[formatting.length - 1] += "{{";
			// Special case: SGP => SIN
			formatting[formatting.length - 1] += matches[i][0][1] == "SGP" ? "SIN" : matches[i][0][1];

			// This shouldn't be done if we only care about the nation
			if(!teams) { formatting[formatting.length - 1] += "-d"; }
			formatting[formatting.length - 1] += "}} ";

			// Player 1 name
			if(!teams) {
				formatting[formatting.length - 1] += "[[";
				formatting[formatting.length - 1] += matches[i][0][0];
				formatting[formatting.length - 1] += "]]";
			}

			formatting[formatting.length - 1] += "|";

			// Make it bold if win
			if(matches[i][0][2][1]) { formatting[formatting.length - 1] += "'''"; }

			// Player 1 score
			formatting[formatting.length - 1] += matches[i][0][2][0];

			// Player 2 nation
			formatting[formatting.length - 1] += "||";
			// Make it bold if win
			if(matches[i][1][2][1]) { formatting[formatting.length - 1] += "'''"; }

			formatting[formatting.length - 1] += "{{";
			formatting[formatting.length - 1] += matches[i][1][1] == "SGP" ? "SIN" : matches[i][1][1];

			// This shouldn't be done if we only care about the nation
			if(!teams) { formatting[formatting.length - 1] += "-d"; }
			formatting[formatting.length - 1] += "}} ";

			// Player 2 name
			if(!teams) {
				formatting[formatting.length - 1] += "[[";
				formatting[formatting.length - 1] += matches[i][1][0];
				formatting[formatting.length - 1] += "]]";
			}

			formatting[formatting.length - 1] += "|";

			// Make it bold if win
			if(matches[i][1][2][1]) { formatting[formatting.length - 1] += "'''"; }

			// Player 2 score
			formatting[formatting.length - 1] += matches[i][1][2][0];

			// End of the line, carriage return
			formatting[formatting.length - 1] += "|";

			if(!(
				// If we've counted n quarters of total matches...
				(i + 1) % (matches.length / cut) == 0 &&
				// ...and we're not at the last match...
				(i + 1) < matches.length
			)) {
				formatting[formatting.length - 1] += "\n";
			}
		}

		// Convenience for formatting: cut the formatting[formatting.length - 1]s into four parts
		if(
			// If we've counted n quarters of total matches...
			(i + 1) % (matches.length / cut) == 0 &&
			// ...and we're not at the last match...
			(i + 1) < matches.length
		) {
			// ...go to the next formatting bit.
			formatting.push("");
		}
	}

	return formatting;
};
