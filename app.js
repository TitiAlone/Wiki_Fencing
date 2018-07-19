// Module loading
const	mw			= require("nodemw"),
		fs			= require("fs"),
		parser		= require("cheerio"),
		request		= require("request"),
		readline	= require('readline');

// Internal parsers
const	scraper		= require("./lib/scrapers/default");

// Load parameters
// Don't forget to load your own configuration here, before starting the bot
const	config		= require("./config/talone.json"),
		lang		= require("./config/lang/fra.json");

const	bot			= new mw(config.bot),
		user		= readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

// Main variables
const schedule		= [];

// Loop forever waiting for user commands
function getCommand() {
	user.question("?", (ans) => {
		switch(ans) {
			case 'e': // Exit
			case 'q': // Quit
				process.exit(0);
			break;

			case 'r': // Refresh schedule
				refreshSchedule();
			break;

			case 'f': // Force refresh result
				refreshResults();
			break;
		}

		getCommand();
	});
}

getCommand();

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
function refreshResults() {
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
							schedule[index].results[type][weapon][gender] = scraper(competition.website, body);

							console.log("Results refreshed!")
						});
					}
				}
			}
		}
	});
}

setInterval(refreshResults, 300000);
