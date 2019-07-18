#!/usr/bin/env node

// Module loading
const	mw			= require("nodemw"),
		fs			= require("fs"),
		request		= require("then-request"),
		readline	= require("readline"),
		express		= require("express");

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
const	schedule		= {};

// Add array comparaison possibility
// see https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript
Array.prototype.equals = function(array) {
	if(!Array.isArray(array)) { return false; }

	for(var i = 0; i < this.length; i++) {
		// Check if we have nested arrays
		if(this[i] instanceof Array && array[i] instanceof Array) {
			// Recurse into the nested arrays
			if(!this[i].equals(array[i]))
				return false;
		} else if(this[i] != array[i]) {
			// Warning - two different object instances will never be equal: {x:20} != {x:20}
			return false;
		}
	}

	return true;
};

// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

// Try to merge two object, with priority on the new one
const merge = function(obj, newObj) {
	const output = {};

	for(let prop in obj) {
		if(typeof newObj[prop] === "undefined") {
			output[prop] = obj[prop];
		} else {
			output[prop] = newObj[prop];
		}
	}

	for(let prop in newObj) {
		if(typeof obj[prop] === "undefined") {
			output[prop] = newObj[prop];
		}
	}

	return output;
};

// Loop forever waiting for user commands
function getCommand() {
	user.question("?", (ans) => {
		switch(ans) {
			case 'e': // Exit
			case 'q': // Quit
				// First save everything
				saveAll();
			break;

			case 'r': // Refresh schedule
				refreshSchedule();
			break;

			case 'f': // Force refresh results
				refreshResults();
			break;

			case 'd': // Add a list of names to Dictionnary
				user.question("List?", (l) => {
					addToDict(l);
				});
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

	// Get the initial schedule, start the UI and request a command
	refreshSchedule();
	startServer();
	getCommand();
});

// Every 5 minutes, refresh the results
setInterval(refreshResults, 300000);

// Pre-parse a list of names
function addToDict(file) {
	fs.readFile(file, "utf8", (e, data) => {
		if(e) {
			console.error(e);
			return;
		}

		const namesNations = data.split("\n");

		for(let nn = 0; nn < namesNations.length; nn += 2) {
			if(namesNations[nn] !== "") {
				fmtName(namesNations[nn], namesNations[nn + 1]);
			}
		}

		getCommand();
	});
}

function saveAll() {
	fs.writeFile("./config/dictionnary.json", JSON.stringify(globalDict), { flag: 'w' }, function(e) {
		if(e) {
			console.error(e);
			return;
		}

		// Then quit after saving the results
		refreshSchedule(() => {
			console.log("Bye bye!")
			process.exit(0);
		});
	});
}

// Parse the schedule directory to search for new events
// TODO: automatically delete old competitions
function refreshSchedule(save=false) {
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

				// If the competition isn't already in schedule
				if(typeof schedule[f] !== "object") {
					// Easier for further manipulation
					// But awful way to clone (and not copy) an object
					if(typeof d.results !== "object") {
						d.results = JSON.parse(JSON.stringify(d.schedule));
					}

					schedule[f] = d;

					console.log("Added to schedule.");
				} else {
					// If the competition is already in schedule, only change datetimes
					schedule[f].schedule = d.schedule;
					console.log("Refreshed.");
				}

				// If we want to save the results
				if(typeof save === "function") {
					console.log("Saving results.");
					fs.writeFile(config.schedule_dir + '/' + f, JSON.stringify(schedule[f]), { flag: 'w' }, save);
				}
			});
		});
	});
}

// Loops in loops in loops... to get all the results at once
function refreshResults(wikiUpdate=true, mainPage=true) {
	// Iterate over each competition
	for(let index in schedule) {
		const competition = schedule[index];
		// Fetch the global competition page
		const globalPage = new PageEditor(competition.name);

		console.log("Competition " + competition.name + ": ");

		// Iterate over type, weapon and gender (yep, that's a lot)
		for(let type in competition.schedule) {
			for(let weapon in competition.schedule[type]) {
				for(let gender in competition.schedule[type][weapon]) {
					// Check if the competition is actually running
					if(
						competition.schedule[type][weapon][gender].to	> Date.now()	&&
						competition.schedule[type][weapon][gender].from	< Date.now()
					) {
						// Fetch the local competition page
						const localPage = new PageEditor(competition.schedule[type][weapon][gender].page);

						console.log("Sub-page: " + competition.schedule[type][weapon][gender].page);

						// Prepare the requests via Promises
						const requests = new Array();

						// For each link, prepare a request to the corresponding page
						for(let l = 0; l < competition.schedule[type][weapon][gender].links.length; l++) {
							requests.push(request("GET", competition.schedule[type][weapon][gender].links[l][0]));
						}

						// Execute the requests and wait for results
						Promise.all(requests).then(values => {
							console.log("All requests done successfully!")

							let results = {};

							// Run the scraper on each result
							for(let v = 0; v < values.length; v++) {
								let tempResults = scraper(competition.website)(values[v].getBody(), fmtName, competition.schedule[type][weapon][gender].links[v][1]);

								results = merge(results, tempResults);
							}

							let change = false;

							// Iterate over each table (t64, t32, ...)
							for(let table in results) {
								// Test if our results have changed
								if(!results[table].equals(schedule[index].results[type][weapon][gender][table])) {
									change = true;
									console.log("Table of " + table);

									// Convert the table into Wikicode
									const	wikicode	= wikiFmt(results[table], type == "team");
									const	reqTable	= parseInt(table.slice(1)) / wikicode.length;

									// Sometimes, we want to edit the global page
									if(table == "t8" || table == "t4" || table == "t2") {
										console.log("Editing global page");

										localPage.addModificator([
											"==" + lang.types[type.trim() + "Details"].trim() + "==",
											"===" + lang.words["findGlobal"].trim() + "===",
											lang.tables[table]
										], wikicode.join('\n'));

										globalPage.addModificator([
											"== " + lang.weapons[weapon.trim()].trim() + " ==",
											"=== " + lang.genders[gender.trim()].trim() + " ===",
											"==== " + lang.types[type.trim()].trim() + " ====",
											lang.tables[table]
										], wikicode.join('\n'));

										// State what we changed
										globalPage.addCommitMessage(lang.weapons[weapon.trim()].trim() + " " + lang.genders[gender.trim()].trim() + " - " + table + " ; ");
									}

									// Anyway, the big tableau is modified if we're before semifinals
									if(table != "t4" && table != "t2") {
										// For each subdivision of the code (cf. tableau in four parts)
										for(let c = 0; c < wikicode.length; c++) {
											localPage.addModificator([
												"==" + lang.types[type.trim() + "Details"].trim() + "==",
												"===" + lang.words["findDetails"].trim() + "===",
												"====" + lang.words.ordinal[c + 1].trim() + " partie====",
												lang.tables["t" + reqTable]
											], wikicode[c]);
										}
									}

									// State what we changed
									localPage.addCommitMessage(table + ", ");

									// Finally update the competition results into local memory
									schedule[index].results[type][weapon][gender][table] = results[table];
								} else {
									console.log("Table of " + table + " did not changed.");
								}
							}

							console.log("All tables done!");
							// Remove the last comma from the message and add a dot
							localPage.commit = localPage.commit.slice(0, -2);
							localPage.addCommitMessage('.');
							// Finally, edit the page
							if(wikiUpdate && change) localPage.submitPage();

							// Remove the last comma from the message and add a dot
							globalPage.commit = globalPage.commit.slice(0, -2);
							globalPage.addCommitMessage('.');
							// Finally, edit the page
							if(wikiUpdate && mainPage && change) globalPage.submitPage();
						}, reason => {
							console.error(reason);
						});
					}
				}
			}
		}

		console.log("Competition done!");
	}
}

// This function is very special: it request everything *async*, so it'll sometimes throw a bad name
function fmtName(name, nation) {
	name = nameFmt(name, nation);

	// Initiate a request to the API
	if(!(name in globalDict) && name.trim() != "") {
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

			// If we get something, write it
			if(data[1].length >= 1) {
				globalDict[name] = data[1][0];
			// If note, tell the program we already requested that name
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

function startServer() {
	express()
		.use(express.static("./public/assets"))
		.set("views", "./public/views")
		.set("view engine", "ejs")
		.get("/", (req, res) => {
			res.send("Bot is running!");
		})
		.listen(5000, () => {
			console.log("Server launched!")
		});
}

// Centralization of page modification because Wikipedia can't stand more than
// two updates in a row.
class PageEditor {
	constructor(name) {
		this.name = name;
		this.modificators = [];
		this.commit = "[bot] ";
	}

	addModificator(parts, content) {
		this.modificators.push({ parts: parts, content: content.split('\n') });
	}

	addCommitMessage(message) {
		this.commit += message;
	}

	submitPage() {
		// First, get the article and save it's data
		bot.getArticle(this.name, (e, data) => {
			if(e) {
				console.error(e);
				return;
			}

			let pageContent = data;

			console.log("Content updating...");

			const lines = pageContent.split('\n');

			// Apply each modificator
			for(let m = 0; m < this.modificators.length; m++) {
				let i = 0;
				// Search for keywords, in order
				for(let p = 0; p < this.modificators[m].parts.length; p++) {
					while(lines[i].trim() != this.modificators[m].parts[p].trim() && i < lines.length - 1) {
						i++;
					}
				}

				// End of the file, we did not found anything...
				// Go to the next modificator
				if(i >= lines.length - 1) {
					console.error("Searched terms were not found.");
					continue;
				}

				// Apply each modificator
				for(let l = 0; l < this.modificators[m].content.length; l++) {
					if(this.modificators[m].content[l].trim() != "") {
						lines[++i] = this.modificators[m].content[l];
					}
				}
			}

			// Then, after the keyword, *replace* the next lines with what we provided
			pageContent = lines.join('\n');

			// Edit the wiki, with a little message
			bot.edit(this.name, pageContent, this.commit, true, () => {
				console.log("Page modified.");
			});
		});
	}
}
