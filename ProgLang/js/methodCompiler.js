class MethodCompiler {
	compileInliners(ns) {
		let previousNamespace = currentNamespace;
		currentNamespace = ns;
		for(let j in ns) {
			if(gotError) return;
			let elem = ns[j];
			let type = elem.type;
			if(type == "inlineFunction") {
				Visual.log("  compiling inline '"+elem.fullName+"'");
				this.compileIFn(elem);
			}
			if(type == "namespace") {
				this.compileInliners(elem.value);
			}
		}
		currentNamespace = previousNamespace;
	}
	compileAll(ns) {
		let previousNamespace = currentNamespace;
		currentNamespace = ns;
		for(let j in ns) {
			if(gotError) return;
			let elem = ns[j];
			let type = elem.type;
			if(type == "function") {
				Visual.log("  compiling '"+elem.fullName+"'");
				this.compileFn(elem);
			}
			if(type == "namespace") {
				this.compileAll(elem.value);
			}
		}
		currentNamespace = previousNamespace;
	}
	compileFn(elem) {
		currentFunction = elem;
		source = elem.srcText;
		fileName = elem.srcFile;
		let tokens = elem.body;
		currentOuterNamespace = currentNamespace;
		currentNamespace = {"#": new Map()};
		for(let j=0; j<elem.args.length; j++) {
			currentNamespace[elem.args[j].name] = elem.args[j];
		}
		parser.parse(tokens, "code");
		//console.log("before", tokens);
		//console.log("cns", currentNamespace);
		elem.body = this.emit(tokens);
		//console.log("after", elem.body);
		//console.log(currentNamespace);
		currentNamespace = currentOuterNamespace;
	}
	compileIFn(elem) {
		currentFunction = elem;
		source = elem.srcText;
		fileName = elem.srcFile;
		let tokens = elem.body;
		currentOuterNamespace = currentNamespace;
		currentNamespace = {"#": new Map()};
		for(let j=0; j<elem.args.length; j++) {
			currentNamespace[elem.args[j].name] = elem.args[j];
		}
		parser.parse(tokens, "code");
		currentNamespace = currentOuterNamespace;
	}
	emit(code) {
		let compiled = [];
		for(let j=0; j<code.length; j++) {
			if(gotError) return compiled;
			let val = this.exec(this, code[j], true);
			if(val === null) continue;
			if(val[1] === "#inline") {
				compiled.push(...val[2]); //this.emit(val[2]));
			} else {
				compiled.push(val);
			}
		}
		return compiled;
	}
	exec(t, elem, calledFromEmit) {
		if(!MC[elem[1]]) {
			console.warn("(invalid compile)", MC, elem);
			return [0, "#string", "(invalid compile)"];
		}
		let result = MC[elem[1]](t, elem);
		if(result instanceof Array && result[1] === "#inline" && !calledFromEmit) return result[2][0] ?? null;
		return result;
	}
	dropdown(text) {
		return text[0] == "[" ? text.slice(0, text.length-1)+" v]" : text;
	}
	unroll(t, val) {
		if(val === null) return [];
		if(val[1] !== "#operator,") return [val];
		return [...t.unroll(t, val[2]), ...t.unroll(t, val[3])];
	}
}

var Natives = {
	"listPush": function(obj, pos, args) {
		return [pos, "#inline", args.map(arg => [pos, "#listPush", obj.list, arg])];
	},
	"listInsert": function(obj, pos, args) {
		return [pos, "#listInsert", obj.list, args[1], args[0]];
	},
	"listDelete": function(obj, pos, args) {
		return [pos, "#listDelete", obj.list, args[0]];
	},
	"listClear": function(obj, pos, args) {
		return [pos, "#listClear", obj.list];
	},
	"listHas": function(obj, pos, args) {
		return [pos, "#listHas", obj.list, args[0]];
	},
	"listIndexOf": function(obj, pos, args) {
		return [pos, "#listIndexOf", obj.list, args[0]];
	},
	"mathOp": function(obj, pos, args) {
		return [pos, "#operatorMathop", obj.name, args[0]];
	},
	"penUp": function(obj, pos, args) {
		return [pos, "#penUp"];
	},
	"penDown": function(obj, pos, args) {
		return [pos, "#penDown"];
	},
	"penClear": function(obj, pos, args) {
		return [pos, "#penClear"];
	},
	"penSetSize": function(obj, pos, args) {
		return [pos, "#penSetSize", args[0]];
	},
	"penMoveTo": function(obj, pos, args) {
		return [pos, "#penMoveTo", args[0], args[1]];
	},
	"sensingKeyPressed": function(obj, pos, args) {
		return [pos, "#keyPressed", args[0]];
	},
}

var MC = {
	"#operator+=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		if(arg1[1] == "#readListElement") {
			if(arg2[1] == "#operator+-") {
				arg2[2].unshift([1, arg1]);
				return [arg2[0], "#setListElement", arg1[2], arg1[3], arg2];
			}
			return [arg2[0], "#setListElement", arg1[2], arg1[3], [me[0], "#operator+", arg1, arg2]];
		}
		if(arg1[1] == "#variable") {
			return [arg2[0], "#changeVariable", arg1, arg2];
		}
		if(arg1[1] == "#argument") return error("Arguments are constant and can't be changed.", me[0]);
		return error("Left argument of '=' is in some way invalid.", me[0]);
		
	},
	"#operator-=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		if(arg1[1] == "#readListElement") {
			if(arg2[1] == "#operator+-") {
				arg2[2] = arg2[2].map(elem => [-elem[0], elem[1]]);
				arg2[2].unshift([1, arg1]);
				return [arg2[0], "#setListElement", arg1[2], arg1[3], arg2];
			}
			if(arg2[1] == "#number") {
				arg2[2] = -arg2[2];
				return [arg2[0], "#setListElement", arg1[2], arg1[3], arg2];
			}
			return [arg2[0], "#setListElement", arg1[2], arg1[3], [me[0], "#operator-", arg1, arg2]];
		}
		if(arg1[1] == "#variable") {
			if(arg2[1] == "#operator+-") {
				arg2[2] = arg2[2].map(elem => [-elem[0], elem[1]]);
				return [me[0], "#changeVariable", arg1, arg2];
			}
			if(arg2[1] == "#number") {
				arg2[2] = -arg2[2];
				return [arg2[0], "#changeVariable", arg1, arg2];
			}
			return [arg2[0], "#changeVariable", arg1, [me[0], "#operator-", [me[0], "#number", 0], arg2]];
		}
		if(arg1[1] == "#argument") return error("Arguments are constant and can't be changed.", me[0]);
		return error("Left argument of '=' is in some way invalid.", me[0]);
		
	},
	"#operator*=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		if(arg1[1] == "#readListElement") {
			return [arg2[0], "#setListElement", arg1[2], arg1[3], [me[0], "#operator*", arg1, arg2]];
		}
		if(arg1[1] == "#variable") {
			return [arg2[0], "#setVariable", arg1, [me[0], "#operator*", arg1, arg2]];
		}
		if(arg1[1] == "#argument") return error("Arguments are constant and can't be changed.", me[0]);
		return error("Left argument of '=' is in some way invalid.", me[0]);
		
	},
	"#operator/=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		if(arg1[1] == "#readListElement") {
			return [arg2[0], "#setListElement", arg1[2], arg1[3], [me[0], "#operator/", arg1, arg2]];
		}
		if(arg1[1] == "#variable") {
			return [arg2[0], "#setVariable", arg1, [me[0], "#operator/", arg1, arg2]];
		}
		if(arg1[1] == "#argument") return error("Arguments are constant and can't be changed.", me[0]);
		return error("Left argument of '=' is in some way invalid.", me[0]);
		
	},
	"#operator=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		if(arg1[1] == "#readListElement") {
			return [arg2[0], "#setListElement", arg1[2], arg1[3], arg2];
		}
		if(arg1[1] == "#variable") {
			return [arg2[0], "#setVariable", arg1, arg2];
		}
		if(arg1[1] == "#list") {
			let inline = [];
			if(arg2[1] !== "#square") return error("Lists can only be assigned to []", arg2[0]);
			inline.push([arg2[0], "#listClear", arg1]);
			let found = null;
			for(let cur of arg2[2]) {
				if(!(cur[1] === "#separator" && cur[2] === "\n")) {
					if(found) {
						return error("More than 1 token inside []", found[0]);
					} else {
						found = cur;
					}
				}
			}
			if(found) {
				let values = t.unroll(t, found);
				for(let value of values) {
					inline.push([value[0], "#listPush", arg1, t.exec(t, value)]);
				}
			}
			return [arg2[0], "#inline", inline];
		}
		if(arg1[1] == "#argument") return error("Arguments are constant and can't be changed.", me[0]);
		return error("Left argument of '=' is in some way invalid.", me[0]);
	},
	"#separator": function(t, me) {
		return null;
	},
	"#number": function(t, me) {
		return me;
	},
	"#string": function(t, me) {
		return me;
	},
	"#identifier": function(t, me) {
		if(me[2] == "true") return [me[0], "#bool", true];
		if(me[2] == "false") return [me[0], "#bool", false];
		let elem = currentNamespace[me[2]] ?? currentOuterNamespace[me[2]] ?? globalNamespace[me[2]];
		if(!elem) {
			error("'"+me[2]+"' is not defined"+didYouMean(me[2], [...Object.keys(currentNamespace), ...Object.keys(currentOuterNamespace), ...Object.keys(globalNamespace)]), me[0]);
			return [me[0], "#string", "invalid identifier"]
		}
		if(elem.type === "constant") {
			let copy = elem.value.slice();
			let isSal = currentFunction.sals.find(e => e.value === elem.value);
			if(isSal) currentFunction.sals.push({"type": isSal.type, "value": copy});
			copy[0] = me[0];
			//console.warn("COPIED1", copy);
			if(copy[1] === "#operator+-") copy[2] = copy[2].slice();
			if(copy[1] === "#readListElement" && copy[3][1] === "#operator+-") {
				copy[3] = copy[3].slice();
				copy[3][2] = copy[3][2].slice();
			}
			return copy;
		}
		if(elem.type === "sal") {
			return elem.value;
		}
		if(elem.type === "argument") {
			return [me[0], "#argument", elem.name, elem.id, elem];
		}
		if(elem.type === "variable") {
			return [me[0], "#variable", elem.fullName, elem.id, elem];
		}
		if(elem.type === "list") {
			return [me[0], "#list", elem.fullName, elem.id, elem];
		}
		if(elem.type === "namespace") {
			return [me[0], "#namespace", elem];
		}
		if(elem.type === "function") {
			return [me[0], "#function", elem];
		}
		if(elem.type === "inlineFunction") {
			return [me[0], "#function", elem];
		}
		if(elem.type === "nativeFunction") {
			return [me[0], "#function", elem];
		}
		return error("'"+elem.type+"' is not a referencable type.", me[0]);
	},
	"#readProperty": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = me[3];
		if(arg1[1] === "#list" && arg2[1] === "#identifier") {
			if(arg2[2] == "length") {
				return [arg2[0], "#listLength", arg1];
			}
			if(arg2[2] == "reserved") {
				let res = [arg2[0], "#number", 0];
				listReserved.push([arg1[4], res]);
				return res;
			}
			if(arg2[2] == "push") return [arg2[0], "#function", {
				"type": "nativeFunction",
				"exec": Natives.listPush,
				"list": arg1,
			}]
			if(arg2[2] == "insert") return [arg2[0], "#function", {
				"type": "nativeFunction",
				"exec": Natives.listInsert,
				"list": arg1,
			}]
			if(arg2[2] == "delete") return [arg2[0], "#function", {
				"type": "nativeFunction",
				"exec": Natives.listDelete,
				"list": arg1,
			}]
			if(arg2[2] == "clear") return [arg2[0], "#function", {
				"type": "nativeFunction",
				"exec": Natives.listClear,
				"list": arg1,
			}]
			if(arg2[2] == "has") return [arg2[0], "#function", {
				"type": "nativeFunction",
				"exec": Natives.listHas,
				"list": arg1,
			}]
			if(arg2[2] == "indexOf") return [arg2[0], "#function", {
				"type": "nativeFunction",
				"exec": Natives.listIndexOf,
				"list": arg1,
			}]
		}
		if(arg1[1] !== "#namespace") {
			return error("Left argument is not a namespace.", arg1[0]);
		}
		if(arg2[1] !== "#identifier") {
			return error("Property specified in an invalid way.", arg2[0]);
		}
		let namespace = arg1[2].value;
		let elem = namespace[arg2[2]];
		if(!elem) {
//			console.log("Searching", arg2[2], "in", namespace, ". Found nothing.")
			return error("'"+arg2[2]+"' is not defined"+didYouMean(arg2[2], namespace), arg2[0]);
		}
		if(elem.type === "constant") {
			let copy = elem.value.slice();
			let isSal = currentFunction.sals.find(e => e.value === elem.value);
			if(isSal) currentFunction.sals.push({"type": isSal.type, "value": copy});
			//console.warn("COPIED2", copy);
			if(copy[1] === "#operator+-") copy[2] = copy[2].slice();
			if(copy[1] === "#readListElement" && copy[3][1] === "#operator+-") {
				copy[3] = copy[3].slice();
				copy[3][2] = copy[3][2].slice();
			}
			copy[0] = arg2[0];
			return copy;
		}
		if(elem.type === "sal") {
			return elem.value;
		}
		if(elem.type === "argument") {
			return [arg2[0], "#argument", elem.name, elem.id, elem];
		}
		if(elem.type === "variable") {
			return [arg2[0], "#variable", elem.fullName, elem.id, elem];
		}
		if(elem.type === "list") {
			return [arg2[0], "#list", elem.fullName, elem.id, elem];
		}
		if(elem.type === "namespace") {
			return [arg2[0], "#namespace", elem];
		}
		if(elem.type === "function") {
			return [arg2[0], "#function", elem];
		}
		if(elem.type === "inlineFunction") {
			return [arg2[0], "#function", elem];
		}
		if(elem.type === "nativeFunction") {
			return [arg2[0], "#function", elem];
		}
		return error("'"+elem.type+"' is not a referencable type.", me[0]);
	},
	"#readOffset": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		if(arg1[1] !== "#readListElement") {
			return error("Offset can only be applied to on list element reading", me[0]);
		}
		let offset = null;
		if(me[3][1] == PARSED.identifier) {
			offset = arg1[2][4].offsets[me[3][2]];
			if(!offset) {
				let options = Object.keys(arg1[2][4].offsets);
				if(options.length > 0) {
					return error("Offset named '"+me[3][2]+"' isn't found"+". Availible options are: "+options.join(", ")+". Problem", me[3][0]);
				} else {
					return error("Offset named '"+me[3][2]+"' isn't found"+". This list doesn't have any offsets defined for it at all. Problem", me[3][0]);
				}
			}
		}
		if(me[3][1] == PARSED.number) offset = parseInt(me[3][2]);
		if(offset === null) return error("Invalid offset token type", me[3][0]);
		let index = arg1[3];
		if(index[1] == "#operator+-") {
			index[2].push([1, [me[3][0], "#number", offset ?? "ERROR"]]);
		} else {
			arg1[3] = [index[0], "#operator+-", [[1, index], [1, [me[3][0], "#number", offset ?? "ERROR"]]]];
		}
		return arg1;
	},
	"#readElement": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		if(arg1[1] !== "#list") {
			return error("Not a list.", arg1[0]);
		}
		return [me[0], "#readListElement", arg1, arg2];
	},
	"#operator+": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		let list = [];
		if(arg1[1] == "#operator+-") {
			list.push(...arg1[2]);
		} else {
			list.push([1, arg1]);
		}
		if(arg2[1] == "#operator+-") {
			list.push(...arg2[2]);
		} else {
			list.push([1, arg2]);
		}
		return [arg2[0], "#operator+-", list]
		//return [me[0], "#operator+", t.exec(t, me[2]), t.exec(t, me[3])];
	},
	"#operator-": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		let list = [];
		if(arg1[1] == "#operator+-") {
			list.push(...arg1[2]);
		} else {
			list.push([1, arg1]);
		}
		if(arg2[1] == "#operator+-") {
			list.push(...(arg2[2].map(elem => [-elem[0], elem[1]])));
		} else {
			list.push([-1, arg2]);
		}
		return [arg2[0], "#operator+-", list]
		//return [me[0], "#operator-", t.exec(t, me[2]), t.exec(t, me[3])];
	},
	"#operator*": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator*", arg1, arg2];
	},
	"#operator/": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator/", arg1, arg2];
	},
	"#operator%": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator%", arg1, arg2];
	},
	"#operator>": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator>", arg1, arg2];
	},
	"#operator<": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator<", arg1, arg2];
	},
	"#operator>=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator!", [arg2[0], "#operator<", arg1, arg2]];
	},
	"#operator<=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator!", [arg2[0], "#operator>", arg1, arg2]];
	},
	"#operator==": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator==", arg1, arg2];
	},
	"#operator!=": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator!", [arg2[0], "#operator==", arg1, arg2]];
	},
	"#operator&&": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator&&", arg1, arg2];
	},
	"#operator||": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator||", arg1, arg2];
	},
	"#operator!": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [arg2[0], "#operator!", arg1, arg2];
	},
	"#call": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let unrolled = t.unroll(t, me[3]);
		let args2 = unrolled.map(e => t.exec(t, e));
		if(arg1[1] !== "#function") return error("Trying to call () on something which isn't a function.", me[0]);
		if(arg1[2].type === "nativeFunction") {
			return arg1[2].exec(arg1[2], me[0], args2);
		} else if(arg1[2].type === "inlineFunction") {
			if(arg1[2].args.length !== args2.length) {
				console.log("Provided argument list: ", args2);
				return error("Function '"+arg1[2].fullName+"' expects "+arg1[2].args.length+" arguments", me[0]);
			}
			let previousNamespace = currentNamespace;
			currentNamespace = {...previousNamespace};
			currentNamespace["#"] = new Map(previousNamespace["#"]);
			let res = t.emit([[me[0], "#const", unrolled.map((e, i) => ({"name": arg1[2].args[i].name, "value": e}))], ...arg1[2].body]);
			currentNamespace = previousNamespace;
			return [me[0], "#inline", res];
		} else {
			//console.log("arg12", arg1[2], args2);
			if(arg1[2].args.length !== args2.length) {
				console.log("Provided argument list: ", args2);
				return error("Function '"+arg1[2].fullName+"' expects "+arg1[2].args.length+" arguments", me[0]);
			}
			currentFunction.calls.push({"offsets": new Map(currentNamespace["#"]), "fn": arg1[2]});
			return [me[0], "#functionCall", arg1[2], args2];
		}
	},
	"#dummy": function(t, me) {
		return null;
	},
	"#round": function(t, me) {
		return t.exec(t, me[2][0]);
	},
	"#figure": function(t, me) {
		let previousNamespace = currentNamespace;
		currentNamespace = {...previousNamespace};
		currentNamespace["#"] = new Map(previousNamespace["#"]);
		let inside = [];
		for(let i=0; i<me[2].length; i++) {
			let val = t.exec(t, me[2][i], true);
			if(val === null) continue;
			if(val[1] === "#inline") {
				inside.push(...val[2]);
			} else {
				inside.push(val);
			}
		}
		currentNamespace = previousNamespace;
		return [me[0], "#code", inside];
	},
	"#if": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [me[0], "#if", arg1, arg2];
	},
	"#ifelse": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		let arg3 = t.exec(t, me[4]);
		return [me[0], "#ifelse", arg1, arg2, arg3];
	},
	"#forever": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		return [me[0], "#forever", arg1];
	},
	"#while": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [me[0], "#while", arg1, arg2];
	},
	"#until": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [me[0], "#until", arg1, arg2];
	},
	"#repeat": function(t, me) {
		let arg1 = t.exec(t, me[2]);
		let arg2 = t.exec(t, me[3]);
		return [me[0], "#repeat", arg1, arg2];
	},
	"#for": function(t, me) {
		let arg1 = null;
		if(me[2][1] !== "#let") arg1 = t.exec(t, me[2], true);
		let arg2 = t.exec(t, me[3]);
		let previousNamespace = currentNamespace;
		currentNamespace = {...previousNamespace};
		currentNamespace["#"] = new Map(previousNamespace["#"]);
		if(!arg1 || arg1[1] == "#inline") {
			t.exec(t, [0, "#let", me[2][2]]);
			let first = me[2][2][0];
			if(first[1] !== "#identifier") return error("Invalid variable as first argument of 'for' loop.", first[0]);
			arg1 = t.exec(t, [0, "#identifier", first[2]]);
		}
		let arg3 = t.exec(t, me[4]);
		currentNamespace = previousNamespace;
		return [me[0], "#for", arg1, arg2, arg3];
	},
	"#const": function(t, me) {
		let items = me[2];
		for(let item of items) {
			currentNamespace[item.name] = {
				"type": "constant",
				"name": item.name,
				"value": t.exec(t, item.value),
			}
		}
		return null;
	},
	"#sal": function(t, me) {
		let type = getByPath(me[2]);
		if(!type) return error("Attempting to make sal of something that doesn't exist.", me[2][0]);
		if(type.type !== "list") return error("sal can only be made out of list.", me[2][0]);
		let mul = type.step;
		let names = me[3];
		let lib = currentNamespace["#"];
		if(!lib.has(type)) lib.set(type, 0);
		for(let name of names) {
			let num = [0, "#number", lib.get(type)]
			currentNamespace[name] = {
				"type": "sal",
				"name": name,
				"value": num,
			}
			currentFunction.sals.push({"type": type, "value": num});
			lib.set(type, lib.get(type)+mul);
		}
		return null;
	},
	"#let": function(t, me) {
		let inline = [];
		let names = me[2];
		let lib = currentNamespace["#"];
		if(!lib.has("#let")) lib.set("#let", 0);
		for(let elem of names) {
			let name;
			if(elem[1] == "#operator=") {
				name = elem[2][2];
			} else {
				name = elem[2];
			}
			let varName = "s"+(lib.get("#let") || 0);
			let varObj = getLocalVar(varName);
			let num = [0, "#variable", varName, varObj.id, varObj];
			currentNamespace[name] = {
				"type": "sal",
				"name": name,
				"value": num,
			}
			currentFunction.sals.push({"type": "#let", "value": num});
			lib.set("#let", lib.get("#let")+1);
			if(elem[1] == "#operator=") inline.push(...t.emit([elem]));
		}
		return [me[0], "#inline", inline];
	},
	"#lst": function(t, me) {
		let inline = [];
		let names = me[2];
		let lib = currentNamespace["#"];
		if(!lib.has("#lst")) lib.set("#lst", 0);
		for(let elem of names) {
			let name;
			if(elem[1] == "#operator=") {
				name = elem[2][2];
			} else {
				name = elem[2];
			}
			let varName = "list "+(lib.get("#lst") || 0);
			let varObj = getLocalList(varName);
			let num = [0, "#list", varName, varObj.id, varObj];
			currentNamespace[name] = {
				"type": "sal",
				"name": name,
				"value": num,
			}
			currentFunction.sals.push({"type": "#lst", "value": num});
			lib.set("#lst", lib.get("#lst")+1);
			if(elem[1] == "#operator=") inline.push(...t.emit([elem]));
		}
		return [me[0], "#inline", inline];
	},
	"#doubleQuotes": function(t, me) {
		return [me[0], "#string", me[2]];
	},
	"#singleQuotes": function(t, me) {
		return [me[0], "#string", me[2]];
	},
	"#return": function(t, me) {
		return me;
	},
	"#square": function(t, me) {
		return me;
	},
}