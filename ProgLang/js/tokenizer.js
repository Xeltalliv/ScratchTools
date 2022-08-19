const PARSED = {
	"identifier": 0,
	"round": 1,
	"square": 2,
	"figure": 3,
	"singleQuotes": 4,
	"doubleQuotes": 5,
	"separator": 6,
	"operator": 7,
	"reservedWord": 8,
	"functionCall": 9,
	"readVariable": 10,
	"number": 11,
	"null": 12,
	"varDef": 13
}
for(let q in PARSED) PARSED[q] = "#"+q;
const RESERVEDCHARS = " \t\n+-*/^|&%#!~()[]{};:,.<>='\"";
const DIGITS = "0123456789";
var i = 0;
var source = "";

function tokenizeMain(start=0, limiter) {
	let output = [];
	for(i=start; i<source.length; i++) {
		let char = source[i];
		let nextChar = source[i+1];
		if(char == " " || char == "\t") continue;
		if(RESERVEDCHARS.includes(char)) {
			if(char == limiter) {
				limiter = "";
				break;
			}
			if(char == "'") {
				output.push([i, PARSED.singleQuotes, tokenizeStringlike(i+1, "'")]);
			} else if(char == '"') {
				output.push([i, PARSED.doubleQuotes, tokenizeStringlike(i+1, '"')]);
			} else if(char == "(") {
				let t = tokenizeMain(i+1, ")");
				output.push([i, PARSED.round, t]);
			} else if(char == ")") {
				error("Unexpected token ')'", i);
			} else if(char == "[") {
				let t = tokenizeMain(i+1, "]");
				output.push([i, PARSED.square, t]);
			} else if(char == "]") {
				error("Unexpected token ']'", i);
			} else if(char == "{") {
				let t = tokenizeMain(i+1, "}");
				output.push([i, PARSED.figure, t]);
			} else if(char == "}") {
				error("Unexpected token '}'", i);
			} else if(char == "#") {
				output.push([i, PARSED.operator, "#"]);
			} else if(char == "&" && nextChar == "&") {
				output.push([i, PARSED.operator, "&&"]);
			} else if(char == "|" && nextChar == "|") {
				output.push([i, PARSED.operator, "||"]);
			} else if(char == "!") {
				if(nextChar == "=") {
					output.push([i, PARSED.operator, "!="]);
					i++;
				} else {
					output.push([i, PARSED.operator, "!"]);
				}
			} else if(char == ",") {
				output.push([i, PARSED.separator, ","]);
			} else if(char == ".") {
				output.push([i, PARSED.separator, "."]);
			} else if(char == "\n") {
				output.push([i, PARSED.separator, "\n"]);
			} else if(char == ";") {
				output.push([i, PARSED.separator, ";"]);
			} else if(char == ":") {
				output.push([i, PARSED.separator, ":"]);
			} else if(char == "<") {
				if(nextChar == "=") {
					output.push([i, PARSED.operator, "<="]);
					i++;
				} else if(nextChar == "<") {
					output.push([i, PARSED.operator, "<<"]);
					i++;
				} else {
					output.push([i, PARSED.operator, "<"]);
				}
			} else if(char == ">") {
				if(nextChar == "=") {
					output.push([i, PARSED.operator, ">="]);
					i++;
				} else if(nextChar == ">") {
					output.push([i, PARSED.operator, ">>"]);
					i++;
				} else {
					output.push([i, PARSED.operator, ">"]);
				}
			} else if(char == "=") {
				if(nextChar == "=") {
					output.push([i, PARSED.operator, "=="]);
					i++;
				} else {
					output.push([i, PARSED.operator, "="]);
				}
			} else if(char == "+") {
				if(nextChar == "=") {
					output.push([i, PARSED.operator, "+="]);
					i++;
				} else if(nextChar == "+") {
					output.push([i, PARSED.operator, "++"]);
					i++;
				} else {
					output.push([i, PARSED.operator, "+"]);
				}
			} else if(char == "-") {
				if(nextChar == "=") {
					output.push([i, PARSED.operator, "-="]);
					i++;
				} else if(nextChar == "-") {
					output.push([i, PARSED.operator, "--"]);
					i++;
				} else {
					output.push([i, PARSED.operator, "-"]);
				}
			} else if(char == "*") {
				if(nextChar == "*") {
					output.push([i, PARSED.operator, "**"]);
					i++;
				} else if(nextChar == "=") {
					output.push([i, PARSED.operator, "*="]);
					i++;
				} else {
					output.push([i, PARSED.operator, "*"]);
				}
			} else if(char == "/") {
				if(nextChar == "/") {
					for(i++; i<source.length; i++) {
						if(source[i] == "\n") break;
					}
				} else if(nextChar == "*") {
					for(i++; i<source.length; i++) {
						if(source[i] == "*" && source[i+1] == "/") break;
					}
					if(i == source.length) error("Unclosed comment /* ... */", i);
					i++;
				} else if(nextChar == "=") {
					output.push([i, PARSED.operator, "/="]);
					i++;
				} else {
					output.push([i, PARSED.operator, "/"]);
				}
			}
		} else {
			let name = tokenizeIdentifier(i);
			if(name.length > 0) {
				if(!isNaN(+name)) {
					output.push([i, PARSED.number, name]);
				} else {
					output.push([i, PARSED.identifier, name]);
				}
			}
		}
	}
	if(limiter) error("Not closed. Missing "+limiter, i);
	return output;
}

function tokenizeStringlike(start=0, limiter) {
	let string = "";
	for(i=start; i<source.length; i++) {
		let char = source[i];
		if(char == limiter) break;
		string += char;
	}
	return string;
}
function tokenizeIdentifier(start=0) {
	let string = "";
	let numeric = true;
	let canHaveDot = true;
	for(i=start; i<source.length; i++) {
		let char = source[i];
		if(RESERVEDCHARS.includes(char)) {
			if(char=="." && numeric && canHaveDot) {
				canHaveDot = false;
			} else {
				break;
			}
		}
		string += char;
		if(numeric && !DIGITS.includes(char)) numeric = false;
	}
	i--;
	return string;
}

function error(msg, i) {
	var cut = source.substr(0, i+1);
	var lines = cut.split(/\r\n|\r|\n/);
	Visual.error(msg+" in "+fileName+" at line "+lines.length+":\n"+lines[lines.length-1]+" <-- Here");
	return null;
}
function error2(msg) {
	Visual.error(msg);
}

var Visual = {
	log: function(msg) {
		let log = document.createElement("div");
		let text = document.createElement("pre");
		text.classList.add("fixPre");
		text.innerText = msg;
		log.appendChild(text);
		log.classList.add("logText");
		Elements.log.appendChild(log);
	},
	error: function(msg) {
		gotError = true;
		document.body.style["background-color"] = "#f2cccc";
		let log = document.createElement("div");
		let text = document.createElement("pre");
		text.classList.add("fixPre");
		text.innerText = msg;
		log.appendChild(text);
		log.classList.add("logError");
		Elements.log.appendChild(log);
	}
}