class Parser {
	static vars;

	constructor(syntax, synatxRequrements) {
		let tokens = this.tokenize(syntax, synatxRequrements);
		this.syntax = this.parseFindParsers(tokens);
	}

	tokenize(syntax, synatxRequrements) {
		let requirements = Object.fromEntries(synatxRequrements
			.split("\n")
			.filter(e => e.length)
			.map(e => e.replaceAll("\t"," ").split(" ").filter(e => e.length))
			.map(e => {
				if(e[1] == "any") {
					return [e[0], [[0, Infinity], e[2]]];
				} else {
					let dd = e[1].indexOf("..");
					return [e[0], [dd == -1 ? [e[1], e[1]] : [parseInt(e[1].substr(0, dd)), parseInt(e[1].substr(dd+2))], e[2]]];
				}
			}));
		let lines = syntax.split("\n");
		let dists = lines.map(e => e.length - e.trimStart().length);
		let tokens = [];
		let expected = 0;
		let tree = [tokens]
		for(let i in lines) {
			let line = lines[i].trimStart();
			if (line.length == 0 || line[0] == "#") continue;

			let dist = dists[i];
			let children = null;
			let save = null;

			if(dist > expected) {
				throw new Error("Line "+i+": Expected "+expected+" padding, but got "+dist+".");
			}

			expected = dist;
			if(line[line.length-1] == ":") {
				expected++;
				line = line.slice(0, -1);
				let op = line.split(" ")[0];
				if(!requirements[op]) throw new Error("Unknown operation '"+op+"'.");
				if(requirements[op][2] == "0") throw new Error("Operation '"+op+"' can't have child elements.");
				children = [];
			}

			let op = line.split(" ")[0];
			if(!requirements[op]) throw new Error("Unknown operation '"+op+"'.");

			let saveToArray = false;
			let saveIdx = line.indexOf(" -> ");
			if(saveIdx == -1) {
				saveToArray=true;
				saveIdx = line.indexOf(" => ");
			}
			if(saveIdx > -1) {
				save = line.substr(saveIdx + 5, line.length - (saveIdx + 5) - 1);
				line = line.substr(0, saveIdx);
			}
			let params = line.split('"').filter((e,i)=>i%2);
			if(requirements[op][1][0] < params.length && requirements[op][1][1] > params.length) throw new Error("'"+op+"' must have between "+requirements[op][1][0]+" and "+requirements[op][1][1]+" paramenetrs, but "+params.length+" were provided.");
			tree[dist].push({
				"operation": op,
				"params": params,
				"children": children,
				"save": save,
				"saveToArray": saveToArray
			});
			if(children) tree[dist+1] = children;
		}
		return tokens;
	}

	parseFindParsers(tokens) {
		let parsers = {}
		for(let i=0; i<tokens.length; i++) {
			let token = tokens[i];
			if(token.operation != "parser") throw new Error("Expected 'parser', got "+token.operation+" instead.");
			parsers[token.params[0]] = this.parseFindPasses(token.children)
		}
		return parsers;
	}

	parseFindPasses(tokens) {
		if (tokens == null) throw new Error("Parser can't be empty")
		let passes = []
		for(let i=0; i<tokens.length; i++) {
			let token = tokens[i];
			if(token.operation != "r_pass" && token.operation != "l_pass" && token.operation != "separation") throw new Error("Expected 'r_pass', 'l_pass' or 'separation', got "+token.operation+" instead.");
			if(token.operation == "separation") {
				passes.push(["separation"]);
			} else {
				passes.push(this.parseFindActions(token.children, token.operation[0]));
			}
		}
		return passes;
	}

	parseFindActions(tokens, dir) {
		if (tokens == null) throw new Error("Pass can't be empty")
		let actions = [dir];
		let find = null;
		let javascript = null;
		for(let i=0; i<tokens.length; i++) {
			let token = tokens[i];
			if(token.operation == "find") {
				if(find != null) throw new Error("'find' already declared");
				find = token.children;
			} else if (token.operation == "javascript") {
				if(javascript != null) throw new Error("'javascript' already declared");
				javascript = token.params[0];
			} else if (token.operation == "replace") {
				if(find == null) throw new Error("'find' not declared");
				actions.push({"find": this.wrap(this.parseFindFind(find)), "javascript": javascript, "replace": token.children});
				find = null;
				javascript = null;
			} else throw new Error("Expected 'find', 'javascript' or 'replace', got "+token.operation+" instead.");
		}
		if(find) throw new Error("Unused find");
		if(javascript) throw new Error("Unused javascript");
		return actions;
	}

	parseFindFind(tokens) {
		let parsed = [];
		for(let token of tokens) {
			let op = token.operation
			let push = null;
			if(op == "list") {
				push = new ParserClasses.List(this.parseFindFind(token.children));
			}
			if(op == "optional") {
				push = new ParserClasses.Optional(this.parseFindFind(token.children));
			}
			if(op == "or") {
				push = new ParserClasses.Or(this.parseFindFind(token.children));
			}
			if(op == "repeat") {
				push = new ParserClasses.Repeat(this.parseFindFind(token.children));
			}
			if(op == "identifier") {
				if(token.params[0]) {
					push = new ParserClasses.TypeValue(PARSED.identifier, token.params[0]);
				} else {
					push = new ParserClasses.Type(PARSED.identifier);
				}
			}
			if(op == "separator") {
				if(token.params[0]) {
					push = new ParserClasses.TypeValue(PARSED.separator, token.params[0]);
				} else {
					push = new ParserClasses.Type(PARSED.separator);
				}
			}
			if(op == "operator") {
				if(token.params[0]) {
					push = new ParserClasses.TypeValue(PARSED.operator, token.params[0]);
				} else {
					push = new ParserClasses.Type(PARSED.operator);
				}
			}
			if(op == "fnumber") {
				if(token.params[0]) {
					push = new ParserClasses.TypeValue(PARSED.number, token.params[0]);
				} else {
					push = new ParserClasses.Type(PARSED.number);
				}
			}
			if(op == "custom") {
				push = new ParserClasses.Type(token.params[0]);
			}
			if(op == "d_quotes") {
				push = new ParserClasses.Type(PARSED.doubleQuotes);
			}
			if(op == "s_quotes") {
				push = new ParserClasses.Type(PARSED.singleQuotes);
			}
			if(op == "anything") {
				push = new ParserClasses.Anything();
			}
			if(op == "any_value") {
				push = new ParserClasses.AnyValue();
			}
			if(op == "figure") {
				push = new ParserClasses.Type(PARSED.figure);
			}
			if(op == "round") {
				push = new ParserClasses.Type(PARSED.round);
			}
			if(op == "square") {
				push = new ParserClasses.Type(PARSED.square);
			}
			if(push == null) throw new Error("Find operation '"+op+"' isn't supported.");
			if(token.save) {
				if(push.saveAs != null) throw new Error("Operation '"+op+"' doesn't support saving.");
				push.saveAs = token.save;
				push.saveToArray = token.saveToArray;
			}
			parsed.push(push);
		}
		if(parsed.length > 0) {
			return parsed;
		} else {
			throw new Error("Some element has no child elements.");
		}
	}

	wrap(elems) {
		if(elems.length > 1) {
			return new ParserClasses.List(elems);
		} else if(elems.length == 1) {
			return elems[0];
		} else {
			throw new Error("Some element has no child elements.");
		}
	}

	parse(tokens, parser) {
		//console.warn("parsing started on ", tokens.slice(), tokens);
		let varsBackup = Parser.vars;
		let passes = this.syntax[parser];
		let br = false;
		if(!passes) throw new Error("parser '"+parser+"' not found");
		let lastGoodToken = 0;
		for(let actions of passes) {
			let dir = actions[0];
			//console.warn("=== NEW PASS ===", dir)

			if(dir == "separation") {
				let errorPos = -1;
				for(let token of tokens) {
					if(token[1] == PARSED.separator && (token[2] == ";" || token[2] == "\n")) {
						errorPos = -1;
					} else if(token[1] == "#if" || token[1] == "#ifelse" || token[1] == "#repeat" || token[1] == "#while" || token[1] == "#until" || token[1] == "#forever" || token[1] == "#for") {
						errorPos = -1;
					} else {
						if(errorPos > -1) {
							error("Expected ';' or a new line", errorPos)
							Parser.vars = varsBackup;
							return;
						}
						errorPos = token[0];
					}
				}
				continue;
			}

			for(let l=0; l<tokens.length; l++) {
				//console.log("new offset")
				//console.log("new pass with dir", dir);
				for(let k=1; k<actions.length; k++) {
					//console.log("l", l, "len", tokens.length);
					if(l >= tokens.length) break;
					let ii;
					if(dir == "r") ii=l;
					if(dir == "l") ii=tokens.length-l-1;
					let action = actions[k];
					//console.log("action", action);
					let find = action.find;
					if(find) {
						Parser.vars = {};
						for(let j=ii; j<=tokens.length; j++) {
							//console.log("iter", j)
							if(j<tokens.length && tokens[j][1] == PARSED.separator && tokens[j][2] == "\n") {
								if(j == ii) {
									break;
								} else {
									continue;
								}
							}
							let result = find.can(j==tokens.length ? [0, "#null", null] : tokens[j]);
							//console.log("testing", j==tokens.length ? [0, "#null", null] : tokens[j], "result", result)
							if(result == 0) break;
							if(result == 2) {
								j = lastGoodToken + 1;
								//console.log("found!", result);
								//console.log(action, action.javascript, window[action.javascript])
								let newVars = {original: Parser.vars};
								for(let i in Parser.vars) {
									if (typeof(Parser.vars[i][0]) == "number") {
										newVars[i] = Parser.vars[i][2];
									} else {
										newVars[i] = Parser.vars[i].map(e => e[2]);
									}
								}
								if(action.javascript) window[action.javascript](newVars);
								let length = j - ii;
								let res = this.getResult(action.replace, tokens[j-1][0]); //tokens[ii][0]
								//console.log("res", length, res);
								//console.log("going from:");
								//console.log(tokens.map(e=>"['"+e[0]+"', '"+e[1]+"']").join("\n"));
								if(res) {
									let tmp = tokens.length-l-1;
									tokens.splice(ii, length, ...res)
									//console.log("Removed", tokens.splice(ii, length, ...res), "and replaced with", res);
									if(dir == "l") l += res.length - length;
									l--;
									//console.log("new l", l);
									//console.log("Replacing", length, "elems with", res);
								}
								//console.log("to:");
								//console.log(tokens.map(e=>"['"+e[0]+"', '"+e[1]+"']").join("\n"));
								//console.log("break");
								br = true;
								break;
							}
							lastGoodToken = j;
						}
						find.reset();
						if(br) {
							br = false;
							break;
						}
					}
				}
/*
				let valSep = action.validateSeparation;
				if(valSep) {
					let found = 0;
					for(let i=0; i<tokens.length; i++) {
						if(tokens[i][1] == PARSED.separator && tokens[i][2] == valSep) {
							found = 0;
						} else {
							found++;
							if(found == 2) {
								i = tokens[i][0]
								error("Expected "+valSep+", got "+tokens[i][2]);
							}
						}
					}
				}*/
			}
		}
		Parser.vars = varsBackup;
		//console.warn("parsing finished")
	}

	getResult(actions, pos) {
		let output = [];
		for(let action of actions) {
			let op = action.operation;
			let push = null;
			if(op == "text") push = action.params[0];
			if(op == "number") push = parseFloat(action.params[0]);
			if(op == "boolean") push = action.params[0] == "false" ? false : true;
			if(op == "var") push = Parser.vars[action.params[0]];
			if(op == "var_value") push = Parser.vars[action.params[0]]?.[2];
			if(op == "var_value0") push = Parser.vars[action.params[0]]?.[2][0];
			if(op == "token") push = [pos, ...this.getResult(action.children, pos)];
			if(op == "dummy") push = [pos, "#dummy"];
			if(op == "void") continue;
			if(op == "keep") return null;
			if(push === null) throw new Error("Replace operation '"+op+"' isn't supported.");
			if(push === undefined) push = null;
			output.push(push);
		}
		return output;
	}
}

class Saver {
	saveAs = null;
	saveToArray = false;
	save(value) {
		if(this.saveToArray) {
			if(!Parser.vars[this.saveAs]) Parser.vars[this.saveAs] = [];
			Parser.vars[this.saveAs].push(value);
		} else {
			Parser.vars[this.saveAs] = value;
		}
		//console.log("Parsed.vars['"+this.saveAs+"'] = ", Parser.vars[this.saveAs]);
	}
}

var ParserClasses = {
	List: class {
		elements;
		pos = 0;
		constructor(elements) {
			this.elements = elements;
		}
		can(value) {
			let result = this.elements[this.pos].can(value);
			while(result == 2) {
				this.pos++;
				if(this.pos == this.elements.length) {
					this.pos = 0;
					return 2;
				}
				result = this.elements[this.pos].can(value);
			}
			if(result == 0) this.pos = 0;
			return result;
		}
		reset() {
			this.elements[this.pos].reset();
			this.pos = 0;
		}
	},
	
	Repeat: class {
		elements;
		pos = 0;
		constructor(elements) {
			this.elements = elements;
		}
		can(value) {
			let result = this.elements[this.pos].can(value);
			let exit = false;
			while(result == 2) {
				this.pos++;
				if(this.pos == this.elements.length) {
					this.pos = 0;
					if(exit) return 2;
					exit = true;
				}
				result = this.elements[this.pos].can(value);
			}
			if(result == 0) this.pos = 0;
			return result;
		}
		reset() {
			this.elements[this.pos].reset();
			this.pos = 0;
		}
	},
	
	Optional: class {
		elements;
		pos = 0;
		constructor(elements) {
			this.elements = elements;
		}
		can(value) {
			let result = this.elements[this.pos].can(value);
			while(result == 2) {
				this.pos++;
				if(this.pos == this.elements.length) {
					this.pos = 0;
					return 2;
				}
				result = this.elements[this.pos].can(value);
			}
			if(result == 0) {
				this.pos = 0;
				if(this.pos == 0) return 2;
			}
			return result;
		}
		reset() {
			this.elements[this.pos].reset();
			this.pos = 0;
		}
	},
	
	Or: class {
		elements;
		selected = null;
		constructor(elements) {
			this.elements = elements;
		}
		can(value) {
			if(this.selected) {
				let out = this.selected.can(value);
				if(out != 1) this.selected = null;
				return out;
			} else {
				for(let elem of this.elements) {
					let out = elem.can(value);
					if(out > 0) {
						if(out == 1) this.selected = elem;
						return out;
					}
				}
				return 0;
			}
		}
		reset() {
			if(this.selected) this.selected.reset();
		}
	},
	
	TypeValue: class extends Saver {
		type;
		name;
		triggered = false;
		constructor(type, name) {
			super();
			this.type = type;
			this.name = name;
		}
		can(value) {
			if(this.triggered) {
				this.triggered = false;
				return 2;
			}
			if(value[1] == this.type && value[2] == this.name) {
				if(this.saveAs) this.save(value);
				this.triggered = true;
				return 1;
			}
			return 0;
		}
		reset() {
			this.triggered = false;
		}
	},
	
	Type: class extends Saver {
		type;
		triggered = false;
		constructor(type) {
			super();
			this.type = type;
		}
		can(value) {
			if(this.triggered) {
				this.triggered = false;
				return 2;
			}
			if(value[1] == this.type) {
				if(this.saveAs) this.save(value);
				this.triggered = true;
				return 1;
			}
			return 0;
		}
		reset() {
			this.triggered = false;
		}
	},
	
	Anything: class extends Saver {
		triggered = false;
		constructor() {
			super();
		}
		can(value) {
			if(value == undefined) {
				this.triggered = false;
				return 0;
			}
			if(this.triggered) {
				this.triggered = false;
				return 2;
			}
			if(this.saveAs) this.save(value);
			this.triggered = true;
			return 1;
		}
		reset() {
			this.triggered = false;
		}
	},

	AnyValue: class extends Saver {
		triggered = false;
		constructor() {
			super();
		}
		can(value) {
			if(this.triggered) {
				this.triggered = false;
				return 2;
			}
			if(value[1] != PARSED.separator && value[1] != PARSED.operator && (value[1] != PARSED.identifier || !ReservedWords2.includes(value[2]))) {
				if(this.saveAs) this.save(value);
				this.triggered = true;
				return 1;
			}
			return 0;
		}
		reset() {
			this.triggered = false;
		}
	}
}