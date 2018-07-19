// Module loading
const	mw			= require("nodemw"),
		fs			= require("fs"),
		parser		= require("cheerio"),
		request		= require("request"),
		readline	= require('readline');

// Internal parsers
const	scraper		= require("./lib/scrapers/default"),
		nameFmt		= require("./lib/parsers/default_name"),
		wikiFmt		= require("./lib/parsers/wikicode_formatter");

// Load parameters
// Don't forget to load your own configuration here, before starting the bot
const	config		= require("./config/talone.json"),
		lang		= require("./config/lang/fra.json"),
		globalDict	= require("./config/dictionnary.json");

const	bot			= new mw(config.bot),
		user		= readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

// Main variables
const	schedule		= [];

// Loop forever waiting for user commands
function getCommand() {
	user.question("?", (ans) => {
		switch(ans) {
			case 'e': // Exit
			case 'q': // Quit
				fs.writeFile("./config/dictionnary.json", JSON.stringify(globalDict), { flag:'w' }, function(e) {
					if(e) {
						console.error(e);
						return;
					}

					process.exit(0);
				});
			break;

			case 'r': // Refresh schedule
				refreshSchedule();
			break;

			case 'f': // Force refresh results
				refreshResults();
			break;
		}

		getCommand();
	});
}

// Optional lines, if your bot needs an account (recommended)
bot.logIn((e, data) => {
	if(e) {
		console.error(e);
		return;
	}

	console.log("Bot logged in!");

	getCommand();
});

// Parse the schedule directory to search for new events
function refreshSchedule() {
	// Select every file in the schedule directory
	fs.readdir(config.schedule_dir, (e, files) => {
		if(e) {
			console.error(e);
			return;
		}

		files.forEach((f, index) => {
			console.log("Found a config file: " + f + ".");

			// Read content of the file, parse it and add it to the schedule
			fs.readFile(config.schedule_dir + '/' + f, "utf8", (e, data) => {
				if(e) {
					console.error(e);
					return;
				}

				const d = JSON.parse(data);

				console.log("Competition name: " + d.name + ".");

				var found = false;

				// If the competition is already in schedule, only change datetimes
				for(let i = 0; i < schedule.length; i++) {
					if(schedule[i].name.trim() == d.name.trim()) {
						schedule[i].schedule = data.schedule;

						found = true;
						break;
					}
				}

				// TODO: delete old competitions

				if(!found) {
					// Easier for further manipulation
					d.results = d.schedule;
					schedule.push(d);

					console.log("Added to schedule.");
				} else console.log("Refreshed.")
			});
		});
	});
}

// Loops in loops in loops... to get all the results at once
function refreshResults(wikiUpdate=true) {
	schedule.forEach((competition, index) => {
		for(let type in competition.schedule) {
			for(let weapon in competition.schedule[type]) {
				for(let gender in competition.schedule[type][weapon]) {
					// Check if the competition is actually running
					if(
						competition.schedule[type][weapon][gender].to	> Date.now()	&&
						competition.schedule[type][weapon][gender].from	< Date.now()
					) {
						// Get the tableau online
						request(competition.schedule[type][weapon][gender].link, (e, res, body) => {
							if(e) {
								console.error(e);
								return;
							}

							console.log("Competition " + competition.name + ": ")
							console.log("Asked for tableau: " + res.statusCode + ".");

							// Refresh our results
							schedule[index].results[type][weapon][gender] = scraper(competition.website, body, fmtName);

							console.log("Results refreshed!");

							// Edit the main page
							if(wikiUpdate) {
								const wiki = wikiFmt(schedule[index].results[type][weapon][gender], false, 8);

								editPage(
									competition.name,
									[
										"== " + lang.weapons[weapon.trim()].trim() + " ==",
										"=== " + lang.genders[gender.trim()].trim() + " ===",
										"==== " + lang.types[type.trim()].trim() + " ====",
										"<!--rencontres 1/4 finale -->"
									],
									wiki[0]
								);
							}
						});
					}
				}
			}
		}
	});
}

// This function is very special: it request everything *async*, so it'll sometimes throw a bad name
function fmtName(name, nation) {
	name = nameFmt(name, nation);

	// Initiate a request to the API
	if(!(name in globalDict)) {
		bot.api.call({
			// We want to search something, without logging in
			"action": "opensearch",
			// What we're searching is the name given
			"search": name,
			// We only want one result
			"limit": 1,
			"namespace": 0,
			// Prevent CORS problems
			"origin": "*",
			"format": "json"
		}, (e, info, next, data) => {
			if(e) {
				console.error(e);
				return;
			}

			if(data[1].length >= 1) {
				globalDict[name] = data[1][0];
			} else {
				globalDict[name] = "NONE";
			}

			console.log("Searched for " + name + ", found " + globalDict[name] + ".");
		});
	}

	// Return the name anyway
	if(name in globalDict && globalDict[name] !== "NONE") {
		return globalDict[name];
	} else {
		return name;
	}
}

function editPage(name, parts, content) {
	var pageContent = "";

	bot.getArticle(name, (e, data) => {
		if(e) {
			console.error(e);
			return;
		}

		pageContent = data;

		console.log("Content updating...");

		const lines = pageContent.split('\n');

		var i = 0;

		for(let p = 0; p < parts.length; p++) {
			while(lines[i].trim() != parts[p].trim() && i < lines.length - 1) {
				i++;
			}
		}

		// End of the file, we did not found anything...
		if(i >= lines.length - 1) {
			console.error("Searched terms were not found.");
			return;
		}

		const contentLines = content.split('\n');

		for(let l = 0; l < contentLines.length; l++) {
			lines[++i] = contentLines[l];
		}

		pageContent = lines.join('\n');

		bot.edit(name, pageContent, "[bot] Added some results", true, () => {
			console.log("Page modified.");
		});
	});
}
