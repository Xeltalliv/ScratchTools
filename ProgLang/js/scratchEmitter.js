class ScratchEmitter {
	blocks;
	calledFrom;
	emitAll() {
		Visual.log("Emitting:");
		let json = JSON.parse(JSON.stringify(template));
		let targets = json.targets;
		let stage = targets.find(sprite => sprite.isStage);
		this.emitVarsLists(stage.variables, stage.lists, globalNamespace);
		for(let sprite of targets) {
			if(gotError) return;
			this.blocks = sprite.blocks;
			Visual.log("Filling sprite '"+sprite.name+"':");
			this.emitCode(sprite.name, globalNamespace);
		}
		//document.body.innerHTML = "<textarea>"+JSON.stringify(json, null, 4)+"</textarea>";
		let zip = new JSZip();
		zip.file("project.json", JSON.stringify(json));
		zip.generateAsync({type:"blob"}).then(async function(content) {
			if(dirHandle && outputHandle) {
				Visual.log("Done. File Compiled.sb3 is automatically overwritten");
				const writable = await outputHandle.createWritable();
				await writable.write(content);
				await writable.close();
			} else {
				Visual.log("Done. Please wait. The download of sb3 should start soon");
				saveAs(content, "Compiled.sb3");
			}
			document.body.style["background-color"] = "#ccf2cc";
		});
	}
	emitVarsLists(vars, lists, ns) {
		for(let name in ns) {
			let elem = ns[name];
			if(elem.type == "variable") vars[elem.id] = [elem.fullName, 0];
			if(elem.type == "list") lists[elem.id] = [elem.fullName, new Array(elem.reserved * elem.step).fill(0)];
			if(elem.type == "namespace") this.emitVarsLists(vars, lists, elem.value);
		}
	}
	emitCode(sprite, ns) {
		for(let name in ns) {
			if(gotError) return;
			let elem = ns[name];
			if(elem.type == "namespace") this.emitCode(sprite, elem.value);
			if(elem.type == "function" && elem.sprites.includes(sprite)) this.emitMethod(elem);
		}
	}
	emitMethod(method) {
		Visual.log("  emiting '"+method.fullName+"'");
		source = method.srcText;
		fileName = method.srcFile;
		let definition;
		if(method.name == "whenFlagClicked") {
			definition = new Block("event_whenflagclicked");
			definition.block.topLevel = true;
			definition.block.x = Math.floor(Math.random()*10000);
			definition.block.y = Math.floor(Math.random()*10000);
		} else {
			definition = new Block("procedures_definition");
			let proto = new Block("procedures_prototype");
			let args = method.args.map(elem => {
				let arg = new Block("argument_reporter_string_number")
				arg.block.parent = proto.id;
				arg.block.fields.VALUE = [elem.name, null];
				arg.block.shadow = true;
				proto.block.inputs[elem.id] = [1, arg.id];
			});
			definition.block.topLevel = true;
			definition.block.x = Math.floor(Math.random()*10000);
			definition.block.y = Math.floor(Math.random()*10000);
			definition.block.inputs.custom_block = [1, proto.id];
			proto.block.parent = definition.id;
			proto.block.shadow = true;
			proto.block.mutation = {
				"tagName": "mutation",
				"children": [],
				"proccode": method.proccode,
				"argumentids": method.argumentids,
				"argumentnames": method.argumentnames,
				"argumentdefaults": method.argumentdefaults,
				"warp": "true"
			}
		}
		let blocks = this.emit(this, method.body, definition);
		if(blocks) definition.block.next = blocks.id;
	}
	emit(t, code, last) {
		let first = null;
		for(let j=0; j<code.length; j++) {
			let current = t.exec(t, code[j]);
			if(current !== null) {
				if(first) last.block.next = current.id;
				if(current.block == undefined) console.warn("current.block is undefined", current);
				current.block.parent = last.id;
				last = current;
				if(!first) first = current;
			}
		}
		return first;
	}
	exec(t, elem) {
		if(!SE[elem[1]]) console.warn("(invalid emitter)", SE, elem);
		return SE[elem[1]] ? SE[elem[1]](t, elem) : "(invalid emitter)";
	}
	plusMinus(t, list) {
		let positive = [];
		let negative = [];
		let size = 1;
		let i = 0;
		let total = 0;
		for(let elem of list) {
			if(elem[1][1] === "#number") {
				total += parseFloat(elem[1][2]) * elem[0];
				continue;
			}
			if(elem[0] ===  1) positive.push(elem);
			if(elem[0] === -1) negative.push(elem);
			if(++i > size) size += size;
		}
		if(positive.length == 0) {
			positive.push([1, [0, "#number", total]]);
			if(++i > size) size += size;
			total = 0;
		}
		if(total < 0) {
			negative.push([-1, [0, "#number", -total]]);
			if(++i > size) size += size;
		}
		if(total > 0) {
			positive.push([ 1, [0, "#number",  total]]);
			if(++i > size) size += size;
		}
		let res = t.plusMinusRecursive(t, [...positive, ...negative], 0, size/2);
		return res;
	}
	plusMinusRecursive(t, all, a, b) {
		if(b-a < 1) return t.exec(t, all[a][1]);
		let block;
		if(!(b < all.length)) return t.plusMinusRecursive(t, all, a, a+(b-a)/2);
		if(all[a][0] > 0 && all[b][0] > 0) block = new Block("operator_add");
		if(all[a][0] > 0 && all[b][0] < 0) block = new Block("operator_subtract");
		if(all[a][0] < 0 && all[b][0] < 0) block = new Block("operator_add");
		block.input("number", "NUM1", t.plusMinusRecursive(t, all, a, a+(b-a)/2));
		block.input("number", "NUM2", t.plusMinusRecursive(t, all, b, b+(b-a)/2));
		return block;
	}
}

class Block {
	block;
	id;
	constructor(opcode) {
		this.block = new RawBlock(opcode);
		this.id = genId();
		scratchEmitter.blocks[this.id] = this.block;
	}
	input(type, name, value) {
		if(value === undefined) throw new Error("Input value can't be undefined!");
		if(value instanceof Block) {
			value.block.parent = this.id;
			value = value.id;
		}
		if(value instanceof Array && value[0] > 3 && value[0] < 11) {
			this.block.inputs[name] = [1, [InputLib[type][0], ...value.slice(1)]];
		} else if(value === null) {
			this.block.inputs[name] = [1, InputLib[type]];
		} else {
			this.block.inputs[name] = [3, value, InputLib[type]];
		}
		return this;
	}
	inputCustom(custom, name, value) {
		if(value === undefined) throw new Error("Input value can't be undefined!");
		if(value instanceof Block) {
			value.block.parent = this.id;
			value = value.id;
		}
		if(value === null) {
			this.block.inputs[name] = [1, custom.id];
		} else {
			this.block.inputs[name] = [3, value, custom.id];
		}
		return this;
	}
	inputNullable(name, value) {
		if(value === undefined) throw new Error("Input value can't be undefined!");
		if(value instanceof Block) {
			value.block.parent = this.block.id;
			value = value.id;
		}
		if(value !== null) {
			this.block.inputs[name] = [2, value];
		}
		return this;
	}
	field(name, value, value2=null) {
		this.block.fields[name] = [value, value2];
		return this;
	}
}

class RawBlock {
	opcode;
	next;
	parent;
	inputs;
	fields;
	shadow;
	topLevel;
	constructor(opcode) {
		this.opcode = opcode;
		this.parent = null;
		this.next = null;
		this.inputs = {};
		this.fields = {};
		this.shadow = false;
		this.topLevel = false;
	}
}

var InputLib = {
	"number": [4, 0],
	"number+": [5, 0],
	"integer+": [6, 0],
	"integer": [7, 0],
	"angle": [8, 0],
	"color": [9, "#000000"],
	"string": [10, ""],
}

var SE = {
	"#functionCall": function(t, me) {
		let block = new Block("procedures_call");
		let method = me[2];
		let argsProto = method.args;
		let argsThis = me[3];
		for(let i=0; i<argsProto.length; i++) {
			block.input("string", argsProto[i].id, t.exec(t, argsThis[i]));
		}
		block.block.mutation = {
			"tagName": "mutation",
			"children": [],
			"proccode": method.proccode,
			"argumentids": method.argumentids,
			"warp": "true"
		}
		return block;
	},
	"#number": function(t, me) {
		return [4, me[2]];
	},
	"#string": function(t, me) {
		return [10, me[2]];
	},
	"#variable": function(t, me) {
		return [12, me[2], me[3]];
	},
	"#list": function(t, me) {
		return [13, me[2], me[3]];
	},
	"#argument": function(t, me) {
		let block = new Block("argument_reporter_string_number");
		block.field("VALUE", me[2]);
		return block;
	},
	"#operator+-": function(t, me) {
		return t.plusMinus(t, me[2]);
	},
	"#operator+": function(t, me) {
		let block = new Block("operator_add");
		block.input("number", "NUM1", t.exec(t, me[2]));
		block.input("number", "NUM2", t.exec(t, me[3]));
		return block;
	},
	"#operator-": function(t, me) {
		let block = new Block("operator_subtract");
		block.input("number", "NUM1", t.exec(t, me[2]));
		block.input("number", "NUM2", t.exec(t, me[3]));
		return block;
	},
	"#operator*": function(t, me) {
		let block = new Block("operator_multiply");
		block.input("number", "NUM1", t.exec(t, me[2]));
		block.input("number", "NUM2", t.exec(t, me[3]));
		return block;
	},
	"#operator/": function(t, me) {
		let block = new Block("operator_divide");
		block.input("number", "NUM1", t.exec(t, me[2]));
		block.input("number", "NUM2", t.exec(t, me[3]));
		return block;
	},
	"#operator%": function(t, me) {
		let block = new Block("operator_mod");
		block.input("number", "NUM1", t.exec(t, me[2]));
		block.input("number", "NUM2", t.exec(t, me[3]));
		return block;
	},
	"#operator>": function(t, me) {
		let block = new Block("operator_gt");
		block.input("number", "OPERAND1", t.exec(t, me[2]));
		block.input("number", "OPERAND2", t.exec(t, me[3]));
		return block;
	},
	"#operator<": function(t, me) {
		let block = new Block("operator_lt");
		block.input("number", "OPERAND1", t.exec(t, me[2]));
		block.input("number", "OPERAND2", t.exec(t, me[3]));
		return block;
	},
	"#operator==": function(t, me) {
		let block = new Block("operator_equals");
		block.input("number", "OPERAND1", t.exec(t, me[2]));
		block.input("number", "OPERAND2", t.exec(t, me[3]));
		return block;
	},
	"#operator&&": function(t, me) {
		let block = new Block("operator_and");
		block.input("number", "OPERAND1", t.exec(t, me[2]));
		block.input("number", "OPERAND2", t.exec(t, me[3]));
		return block;
	},
	"#operator||": function(t, me) {
		let block = new Block("operator_or");
		block.input("number", "OPERAND1", t.exec(t, me[2]));
		block.input("number", "OPERAND2", t.exec(t, me[3]));
		return block;
	},
	"#operator!": function(t, me) {
		let block = new Block("operator_not");
		block.input("number", "OPERAND", t.exec(t, me[2]));
		return block;
	},
	"#operatorMathop": function(t, me) {
		if(me[2] === "round") {
			let block = new Block("operator_round");
			block.input("number", "NUM", t.exec(t, me[3]));
			return block;
		} else if(me[2] === "random") {
			let block = new Block("operator_random");
			block.input("number", "FROM", t.exec(t, me[3]));
			block.input("number", "TO", t.exec(t, me[4]));
			return block;
		} else {
			let block = new Block("operator_mathop");
			block.field("OPERATOR", me[2]);
			block.input("number", "NUM", t.exec(t, me[3]));
			return block;
		}
	},
	"#listLength": function(t, me) {
		let block = new Block("data_lengthoflist");
		block.field("LIST", me[2][2], me[2][3]);
		return block;
	},
	"#readListElement": function(t, me) {
		let block = new Block("data_itemoflist");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("integer+", "INDEX", t.exec(t, me[3]));
		return block;
	},
	"#setListElement": function(t, me) {
		let block = new Block("data_replaceitemoflist");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("integer+", "INDEX", t.exec(t, me[3]));
		block.input("string", "ITEM", t.exec(t, me[4]));
		return block;
	},
	"#listInsert": function(t, me) {
		let block = new Block("data_insertatlist");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("string", "ITEM", t.exec(t, me[3]));
		block.input("integer+", "INDEX", t.exec(t, me[4]));
		return block;
	},
	"#listDelete": function(t, me) {
		let block = new Block("data_deleteoflist");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("integer+", "INDEX", t.exec(t, me[3]));
		return block;
	},
	"#listClear": function(t, me) {
		let block = new Block("data_deletealloflist");
		block.field("LIST", me[2][2], me[2][3]);
		return block;
	},
	"#listPush": function(t, me) {
		let block = new Block("data_addtolist");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("string", "ITEM", t.exec(t, me[3]));
		return block;
	},
	"#listHas": function(t, me) {
		let block = new Block("data_listcontainsitem");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("string", "ITEM", t.exec(t, me[3]));
		return block;
	},
	"#listIndexOf": function(t, me) {
		let block = new Block("data_itemnumoflist");
		block.field("LIST", me[2][2], me[2][3]);
		block.input("string", "ITEM", t.exec(t, me[3]));
		return block;
	},
	"#setVariable": function(t, me) {
		let block = new Block("data_setvariableto");
		block.field("VARIABLE", me[2][2], me[2][3]);
		block.input("string", "VALUE", t.exec(t, me[3]));
		return block;
	},
	"#changeVariable": function(t, me) {
		let block = new Block("data_changevariableby");
		block.field("VARIABLE", me[2][2], me[2][3]);
		block.input("string", "VALUE", t.exec(t, me[3]));
		return block;
	},
	"#separator": function(t, me) {
		return null;
	},
	"#if": function(t, me) {
		let block = new Block("control_if");
		block.inputNullable("CONDITION", t.exec(t, me[2]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[3]));
		return block;
	},
	"#ifelse": function(t, me) {
		let block = new Block("control_if_else");
		block.inputNullable("CONDITION", t.exec(t, me[2]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[3]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK2", t.exec(t, me[4]));
		return block;
	},
	"#repeat": function(t, me) {
		let block = new Block("control_repeat");
		block.input("integer+", "TIMES", t.exec(t, me[2]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[3]));
		return block;
	},
	"#for": function(t, me) {
		let block = new Block("control_for_each");
		block.field("VARIABLE", me[2][2], me[2][3]);
		block.input("integer+", "VALUE", t.exec(t, me[3]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[4]));
		return block;
	},
	"#while": function(t, me) {
		let block = new Block("control_while");
		block.inputNullable("CONDITION", t.exec(t, me[2]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[3]));
		return block;
	},
	"#until": function(t, me) {
		let block = new Block("control_repeat_until");
		block.inputNullable("CONDITION", t.exec(t, me[2]));
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[3]));
		return block;
	},
	"#forever": function(t, me) {
		let block = new Block("control_forever");
		t.calledFrom = block;
		block.inputNullable("SUBSTACK", t.exec(t, me[2]));
		return block;
	},
	"#code": function(t, me) {
		return t.emit(t, me[2], t.calledFrom);
	},
	"#return": function(t, me) {
		let block = new Block("control_stop");
		block.field("STOP_OPTION", "this script");
		block.block.mutation = {
			"tagName": "mutation",
			"children": [],
			"hasnext": "false"
		}
		return block;
	},
	"#whenFlagClicked": function(t, me) {
		return new Block("event_whenflagclicked");
	},
	"#penDown": function(t, me) {
		return new Block("pen_penDown");
	},
	"#penUp": function(t, me) {
		return new Block("pen_penUp");
	},
	"#penClear": function(t, me) {
		return new Block("pen_clear");
	},
	"#penSetSize": function(t, me) {
		let block = new Block("pen_setPenSizeTo");
		block.input("number", "SIZE", t.exec(t, me[2]));
		return block;
	},
	"#penMoveTo": function(t, me) {
		let block = new Block("motion_gotoxy");
		block.input("number", "X", t.exec(t, me[2]));
		block.input("number", "Y", t.exec(t, me[3]));
		return block;
	},
	"#mouseX": function(t, me) {
		return new Block("sensing_mousex");
	},
	"#mouseY": function(t, me) {
		return new Block("sensing_mousey");
	},
	"#mouseDown": function(t, me) {
		return new Block("sensing_mousedown");
	},
	"#keyPressed": function(t, me) {
		let key = t.exec(t, me[2]);
		let isVal = key instanceof Array && key[0] > 3 && key[0] < 11;
		let options = new Block("sensing_keyoptions");
		options.field("KEY_OPTION", isVal ? key[1] : "a");
		options.block.shadow = true;
		let block = new Block("sensing_keypressed");
		block.inputCustom(options, "KEY_OPTION", isVal ? null : key);
		return block;
	},
	"#looksSetSize": function(t, me) {
		let block = new Block("looks_setsizeto");
		block.input("number", "SIZE", t.exec(t, me[2]));
		return block;
	},
}

/*
var SE = {
	"#return": function(t, me) {
		return "\nstop [this script v]";
	},
	"#setVariable": function(t, me) {
		return "\nset ["+me[2]+" v] to "+t.exec(t, me[4]);
	},
	"#code": function(t, me) {
		return t.emit(t, me[2]);
	},
	"#bool": function(t, me) {
		if(me[2]) return "<not <>>";
		return "<>";
	},
}*/


