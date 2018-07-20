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

	getCommand();
});

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
	fs.writeFile("./config/dictionnary.json", JSON.stringify(globalDict), { flag:'w' }, function(e) {
		if(e) {
			console.error(e);
			return;
		}

		// Then quit... bye bye!
		process.exit(0);
	});
}

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
					// But awful way to clone (and not copy) an object
					d.results = JSON.parse(JSON.stringify(d.schedule));
					schedule.push(d);

					console.log("Added to schedule.");
				} else console.log("Refreshed.")
			});
		});
	});
}

// TODO: (regression) This should not update only one at once
// Loops in loops in loops... to get all the results at once
function refreshResults(wikiUpdate=true, mainPage=false) {
	schedule.forEach((competition, index) => {
		const MAX_TABLE = Math.log2(competition.from);
		const MAX_SUB = Math.log2(competition.detailsFrom);

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
//1535010000000
							// Edit the main page
							if(wikiUpdate) {
								if(mainPage) {
									const wiki = wikiFmt(schedule[index].results[type][weapon][gender], false, competition.from);
									const page = new PageEditor(competition.name);

									for(let w = 0; w < wiki.length; w++) {
										const table = Math.pow(2, MAX_TABLE - w);

										page.addModificator([
											"== " + lang.weapons[weapon.trim()].trim() + " ==",
											"=== " + lang.genders[gender.trim()].trim() + " ===",
											"==== " + lang.types[type.trim()].trim() + " ====",
											lang.tables["t" + table]
										], wiki[w]);

										page.addCommitMessage("T" + table + ", ");
									}

									page.submitPage();
									console.log("Wiki main update.");
								}

								const wiki = wikiFmt(schedule[index].results[type][weapon][gender], false, competition.detailsFrom, competition.from * 2);
								const page = new PageEditor(competition.schedule[type][weapon][gender].page);

								console.log("Editing " + competition.schedule[type][weapon][gender].page + "...");

								for(let w = 0; w < wiki.length; w++) {
									const fragments = wiki[w].split("\n\n");
									const table = Math.pow(2, MAX_SUB - w);

									for(let f = 0; f < fragments.length; f++) {
										page.addModificator([
											"==" + lang.types[type.trim() + "Details"].trim() + "==",
											"===" + lang.words["findDetails"].trim() + "===",
											"====" + lang.words.ordinal[f + 1].trim() + " partie====",
											lang.tables["t" + (table / fragments.length)]
										], fragments[f]);
									}

									page.addCommitMessage("T" + table + ", ");
								}

								page.submitPage();
								console.log("Wiki sub-page update.");
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

				//
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
