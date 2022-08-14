// This was used early during development and was abandoned after creation of sb3 emitter.
// Considering all of the changes and new features added since then, this is probably very broken.

class ScratchblocksEmitter {
	emitAll() {
		let text = "";
		text += this.emitNamespace("", globalNamespace);
		document.getElementById("scratchBlocksHere").innerText = text;
		scratchblocks.renderMatching('pre.blocks', {});
	}
	emitNamespace(prefix, ns) {
		let text = "";
		for(let name in ns) {
			let elem = ns[name];
			if(elem.type == "variable") text += "\n"+prefix+name+" :: reporter variables";
			if(elem.type == "list") text += "\n"+prefix+name+" :: reporter list";
			if(elem.type == "namespace") text += this.emitNamespace(elem.visual, elem.value);
			if(elem.type == "function") text += this.emitMethod(prefix+name, elem);
		}
		return text;
	}
	emitMethod(name, method) {
		let text = "\ndefine "+name+" "+method.args.map(e => "("+e.name+")").join(" ");
		text += this.emit(this, method.body);
		return text;
	}
	emit(t, code) {
		let text = "";
		for(let j=0; j<code.length; j++) {
			text += t.exec(t, code[j]);
		}
		return text;
	}
	exec(t, elem) {
		if(!SBE[elem[1]]) console.warn("(invalid emitter)", SBE, elem);
		return SBE[elem[1]] ? SBE[elem[1]](t, elem) : "(invalid emitter)";
	}
	dropdown(text) {
		return text[0] == "[" ? text.slice(0, text.length-1)+" v]" : text;
	}
}

var SBE = {
	"#functionCall": function(t, me) {
		return "\n"+me[2].fullName+" "+me[3].map(e => t.exec(t, e)).join(" ")+" :: custom";
	},
	"#return": function(t, me) {
		return "\nstop [this script v]";
	},
	"#setListElement": function(t, me) {
		return "\nreplace item "+t.exec(t, me[4])+" of ["+me[2]+" v] with "+t.exec(t, me[5]);
	},
	"#readListElement": function(t, me) {
		return "(item "+t.exec(t, me[4])+" of ["+me[2]+" v])";
	},
	"#setVariable": function(t, me) {
		return "\nset ["+me[2]+" v] to "+t.exec(t, me[4]);
	},
	"#number": function(t, me) {
		return "("+me[2]+")";
	},
	"#string": function(t, me) {
		return "["+me[2]+"]";
	},
	"#separator": function(t, me) {
		return "";
	},
	"#argument": function(t, me) {
		return "("+me[2]+")";
	},
	"#variable": function(t, me) {
		return "("+me[2]+")";
	},
	"#list": function(t, me) {
		return "("+me[2]+" :: list)";
	},
	"#listLength": function(t, me) {
		return "(length of ["+me[2]+" v])";
	},
	"#listPush": function(t, me) {
		return "\nadd "+t.exec(t, me[4])+" to ["+me[2]+" v]";
	},
	"#listInsert": function(t, me) {
		return "\ninsert "+t.exec(t, me[4])+" at "+t.exec(t, me[5])+" of ["+me[2]+" v]";
	},
	"#listDelete": function(t, me) {
		return "\ndelete "+t.exec(t, me[4])+" of ["+me[2]+" v]";
	},
	"#listHas": function(t, me) {
		return "<["+me[2]+" v] contains "+t.exec(t, me[4])+"? :: list>";
	},
	"#listIndexOf": function(t, me) {
		return "(item # of "+t.exec(t, me[4])+"in ["+me[2]+" v] :: list)";
	},
	"#operator+": function(t, me) {
		return "("+t.exec(t, me[2])+" + "+t.exec(t, me[3])+")";
	},
	"#operator-": function(t, me) {
		return "("+t.exec(t, me[2])+" - "+t.exec(t, me[3])+")";
	},
	"#operator*": function(t, me) {
		return "("+t.exec(t, me[2])+" * "+t.exec(t, me[3])+")";
	},
	"#operator/": function(t, me) {
		return "("+t.exec(t, me[2])+" / "+t.exec(t, me[3])+")";
	},
	"#operator%": function(t, me) {
		return "("+t.exec(t, me[2])+" mod "+t.exec(t, me[3])+")";
	},
	"#operator>": function(t, me) {
		return "<"+t.exec(t, me[2])+" > "+t.exec(t, me[3])+">";
	},
	"#operator<": function(t, me) {
		return "<"+t.exec(t, me[2])+" < "+t.exec(t, me[3])+">";
	},
	"#operator==": function(t, me) {
		return "<"+t.exec(t, me[2])+" = "+t.exec(t, me[3])+">";
	},
	"#operator!": function(t, me) {
		return "<not "+t.exec(t, me[2])+">";
	},
	"#if": function(t, me) {
		return "\nif "+t.exec(t, me[2])+" then"+t.exec(t, me[3])+"\nend";
	},
	"#ifelse": function(t, me) {
		return "\nif "+t.exec(t, me[2])+" then"+t.exec(t, me[3])+"\nelse"+t.exec(t, me[4])+"\nend";
	},
	"#repeat": function(t, me) {
		return "\nrepeat "+t.exec(t, me[2])+t.exec(t, me[3])+"\nend";
	},
	"#for": function(t, me) {
		return "\nfor each ["+me[2]+" v] in "+t.exec(t, me[4])+"{"+t.exec(t, me[5])+"\n} :: control";
	},
	"#while": function(t, me) {
		return "\nwhile "+t.exec(t, me[2])+" {"+t.exec(t, me[3])+"\n} :: control";
	},
	"#until": function(t, me) {
		return "\nrepeat until "+t.exec(t, me[2])+t.exec(t, me[3])+"\nend";
	},
	"#code": function(t, me) {
		return t.emit(t, me[2]);
	},
	"#bool": function(t, me) {
		if(me[2]) return "<not <>>";
		return "<>";
	},
}