// Module loading
const	mw			= require("nodemw"),
		fs			= require("fs"),
		parser		= require("cheerio"),
		request		= require("request"),
		readline	= require('readline');

// Configuration constants
const	CONFIG_DIR		= "config/",
		SCHEDULE_DIR	= "scheduled/";

// Load your own config file here, or use default (warning: with IP)
// const bot = new mw(CONFIG_DIR + "default.js");
const	bot = new mw(CONFIG_DIR + "talone.js"),
		user = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

// Main variables
const schedule = [];

// Loop forever waiting for user commands
function getCommand() {
	user.question("?", (ans) => {
		switch(ans) {
			case 'e':
				process.exit(0);
			break;

			case 'r':
				refreshSchedule();
			break;
		}

		getCommand();
	});
}

getCommand();

// Parse the schedule directory to search for new events
function refreshSchedule() {
	// First empty the current schedule
	schedule.splice(0, schedule.length);

	// Select every file in the schedule directory
	fs.readdir(SCHEDULE_DIR, (e, files) => {
		if(e) {
			console.error(e);
			return;
		}

		files.forEach((f, index) => {
			console.log("Found a config file: " + f + ".");

			// Read content of the file, parse it and add it to the schedule
			fs.readFile(SCHEDULE_DIR + f, "utf8", (e, data) => {
				if(e) {
					console.error(e);
					return;
				}

				const d = JSON.parse(data);

				console.log("Competition name: " + d.name + ".");
				schedule.push(d);
				console.log("Added to schedule.")
			});
		});
	});
}
