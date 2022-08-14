const syntax = `
parser "main":
	l_pass:
		find:
			any_value -> "a"
			operator "="
			any_value -> "b"
		replace:
			token:
				text "#operator="
				var "a"
				var "b"

	r_pass:
		find:
			identifier "variable"
			identifier => "names"
			optional:
				repeat:
					separator ","
					identifier => "names"
		javascript "regVar"
		replace:
			void

		find:
			identifier "list"
			identifier => "names"
			optional:
				repeat:
					separator ","
					identifier => "names"
		javascript "regList"
		replace:
			void

		find:
			identifier "listoffsets"
			identifier -> "name"
			fnumber -> "step"
			optional:
				figure -> "offsets"
		javascript "regListOffsets"
		replace:
			void

		find:
			identifier "namespace"
			identifier -> "name"
			optional:
				d_quotes -> "visual"
			figure -> "body"
		javascript "regNamespace"
		replace:
			void

		find:
			optional:
				identifier "inline" -> "inline"
			identifier "function"
			identifier -> "name"
			round -> "args"
			figure -> "body"
		javascript "regFunction"
		replace:
			void

		find:
			identifier "const" -> "const"
			custom "#operator=" => "items"
			optional:
				repeat:
					separator ","
					custom "#operator=" => "items"
		javascript "outerConst"
		replace:
			void


parser "listOffsets":
	r_pass:
		find:
			identifier -> "a"
			separator ":"
			fnumber -> "b"
		replace:
			token:
				text "#a:b"
				var_value "a"
				var_value "b"

parser "code":
#	Parse () [] {}
	r_pass:
		find:
			or:
				round -> "inside"
				square -> "inside"
				figure -> "inside"
		javascript "parseInside"
		replace:
			keep


#	Priority 18
	r_pass:
		find:
			any_value -> "a"
			square -> "b"
		replace:
			token:
				text "#readElement"
				var "a"
				var_value0 "b"

		find:
			any_value -> "a"
			separator "."
			any_value -> "b"
		replace:
			token:
				text "#readProperty"
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "#"
			any_value -> "b"
		replace:
			token:
				text "#readOffset"
				var "a"
				var "b"

		find:
			any_value -> "function"
			round -> "arguments"
		replace:
			token:
				text "#call"
				var "function"
				var_value0 "arguments"

#	Priority 16
	r_pass:
		find:
			any_value -> "a"
			operator "++"
		replace:
			token:
				text "#operatorN++"
				var "a"

		find:
			any_value -> "a"
			operator "--"
		replace:
			token:
				text "#operatorN--"
				var "a"

#	Priority 15
	r_pass:
		find:
			operator "++"
			any_value -> "a"
		replace:
			token:
				text "#operator++N"
				var "a"

		find:
			operator "--"
			any_value -> "a"
		replace:
			token:
				text "#operator--N"
				var "a"

#	Priority 14
	l_pass:
		find:
			any_value -> "a"
			operator "**"
			any_value -> "b"
		replace:
			token:
				text "#operator**"
				var "a"
				var "b"

#	Priority 13
	r_pass:
		find:
			any_value -> "a"
			operator "*"
			any_value -> "b"
		replace:
			token:
				text "#operator*"
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "/"
			any_value -> "b"
		replace:
			token:
				text "#operator/"
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "%"
			any_value -> "b"
		replace:
			token:
				text "#operator%"
				var "a"
				var "b"

#	Priority 12
	r_pass:
		find:
			any_value -> "a"
			operator "+"
			any_value -> "b"
		replace:
			token:
				text "#operator+"
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "-"
			any_value -> "b"
		replace:
			token:
				text "#operator-"
				var "a"
				var "b"

		find:
			operator "-"
			any_value -> "b"
		replace:
			token:
				text "#operator-"
				token:
					text "#number"
					number "0"
				var "b"

#	Priority 10
	r_pass:
		find:
			any_value -> "a"
			operator ">"
			any_value -> "b"
		replace:
			token:
				text "#operator>"
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "<"
			any_value -> "b"
		replace:
			token:
				text "#operator<"
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator ">="
			any_value -> "b"
		replace:
			token:
				text "#operator>="
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "<="
			any_value -> "b"
		replace:
			token:
				text "#operator<="
				var "a"
				var "b"

#	Priority 9
	r_pass:
		find:
			any_value -> "a"
			operator "=="
			any_value -> "b"
		replace:
			token:
				text "#operator=="
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "!="
			any_value -> "b"
		replace:
			token:
				text "#operator!="
				var "a"
				var "b"

#	Priority 5
	r_pass:
		find:
			any_value -> "a"
			operator "&&"
			any_value -> "b"
		replace:
			token:
				text "#operator&&"
				var "a"
				var "b"

#	Priority 4
	r_pass:
		find:
			any_value -> "a"
			operator "||"
			any_value -> "b"
		replace:
			token:
				text "#operator||"
				var "a"
				var "b"

#	Priority 2
	l_pass:
		find:
			identifier "let" -> "let"
			or:
				identifier => "names"
				custom "#operator=" => "names"
			optional:
				repeat:
					separator ","
					or:
						identifier => "names"
						custom "#operator=" => "names"
		javascript "varsLet"
		replace:
			var "jsOutput"

		find:
			identifier "lst" -> "lst"
			identifier => "names"
			optional:
				repeat:
					separator ","
					identifier => "names"
		javascript "varsLst"
		replace:
			var "jsOutput"

		find:
			identifier "const" -> "const"
			custom "#operator=" => "items"
			optional:
				repeat:
					separator ","
					custom "#operator=" => "items"
		javascript "varsConst"
		replace:
			var "jsOutput"

		find:
			identifier "sal" -> "sal"
			identifier -> "type"
			any_value => "names"
			optional:
				repeat:
					separator ","
					identifier => "names"
		javascript "varsSal"
		replace:
			var "jsOutput"

		find:
			any_value -> "a"
			operator "="
			any_value -> "b"
		replace:
			token:
				text "#operator="
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "+="
			any_value -> "b"
		replace:
			token:
				text "#operator+="
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "-="
			any_value -> "b"
		replace:
			token:
				text "#operator-="
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "*="
			any_value -> "b"
		replace:
			token:
				text "#operator*="
				var "a"
				var "b"

		find:
			any_value -> "a"
			operator "/="
			any_value -> "b"
		replace:
			token:
				text "#operator/="
				var "a"
				var "b"

#	Priority 1.5
	l_pass:
		find:
			identifier "return"
			any_value -> "returnValue"
		replace:
			token:
				text "#operator="
				token:
					text "#identifier"
					text "retVal"
				var "returnValue"
			token:
				text "#separator"
				text ";"
			token:
				text "#return"

		find:
			identifier "return"
		replace:
			token:
				text "#return"

#	Priority 1
	l_pass:
		find:
			any_value -> "a"
			separator ","
			any_value -> "b"
		replace:
			token:
				text "#operator,"
				var "a"
				var "b"

#	while for if if_else
	l_pass:
		find:
			identifier "forever"
			any_value -> "code"
		replace:
			token:
				text "#forever"
				var "code"

		find:
			identifier "while"
			round -> "condition"
			any_value -> "code"
		replace:
			token:
				text "#while"
				var "condition"
				var "code"

		find:
			identifier "until"
			round -> "condition"
			any_value -> "code"
		replace:
			token:
				text "#until"
				var "condition"
				var "code"

		find:
			identifier "repeat"
			round -> "amount"
			any_value -> "code"
		replace:
			token:
				text "#repeat"
				var "amount"
				var "code"

		find:
			identifier "for" -> "forLoop"
			round -> "params"
			any_value -> "code"
		javascript "forLoop"
		replace:
			var "jsOutput"

		find:
			identifier "if"
			round -> "condition"
			any_value -> "code_true"
			identifier "else"
			any_value -> "code_false"
		replace:
			token:
				text "#ifelse"
				var "condition"
				var "code_true"
				var "code_false"

		find:
			identifier "if"
			round -> "condition"
			any_value -> "code_true"
		replace:
			token:
				text "#if"
				var "condition"
				var "code_true"
	separation


`;

const syntaxRequirements = `
parser		1		any
r_pass		0		any
l_pass		0		any
find		0		any
javascript	1		0
replace		0		any
list		0		any
optional	0		any
or			0		any
repeat		0		any
identifier	0..1	0
separator	0..1	0
operator	0..1	0
custom		1		0
anything	0		0
fnumber		0..1	0
any_value	0		0
figure		0		0
round		0		0
square		0		0
text		1		0
number		1		0
boolean		1		0
var			1		0
var_value	1		0
var_value0	1		0
token		0		any
dummy		0		0
void		0		0
keep		0		0
separation	0		0
d_quotes	0		0
s_quotes	0		0
`;

function regVar(vars) {
	for(let name of vars.names) {
		currentNamespace[name] = {
			"name": name,
			"fullName": currentPrefix+name,
			"type": "variable",
			"id": genId(),
		}
	}
}

function regList(vars) {
	for(let name of vars.names) {
		currentNamespace[name] = {
			"name": name,
			"fullName": currentPrefix+name,
			"type": "list",
			"id": genId(),
			"step": 1,
			"offsets": {},
			"reserved": 0,
		}
	}
}

function regListOffsets(vars) {
	let list = currentNamespace[vars.name];
	if(vars.offsets) {
		parser.parse(vars.offsets, "listOffsets");
		let offsets = {};
		for(let j=0; j<vars.offsets.length; j++) {
			let elem = vars.offsets[j];
			if(j%2 == 0) {
				if(elem[1] != "#a:b") return error("Unexpected token. Expected 'name:offset'", elem[0]);
				offsets[elem[2]] = parseInt(elem[3]);
			} else {
				if(elem[1] != PARSED.separator || elem[2] != ",") return error("Unexpected token. Expected ','", elem[0]);
			}
		}
		list.offsets = offsets;
	}
	list.step = parseInt(vars.step);
}

function regNamespace(vars) {
	let backup = currentNamespace;
	let backup2 = currentPrefix;
	currentNamespace = backup[vars.name] ? backup[vars.name].value : {};
	currentPrefix = backup[vars.name] ? backup[vars.name].visual : (vars.visual ?? (vars.name+" | "));
	parser.parse(vars.body, "main");
	if(!backup[vars.name]) backup[vars.name] = {
		"name": vars.name,
		"type": "namespace",
		"visual": vars.visual ?? (vars.name+" | "),
		"value": currentNamespace,
	}
	currentNamespace = backup;
	currentPrefix = backup2;
}

function regFunction(vars) {
	var functionArgs = {}
	var args = [];
	for(let j=0; j<vars.args.length; j++) {
		if(j%2 == 0) {
			if(vars.args[j][1] != PARSED.identifier) return error("Unexpected token. Expected argument name", vars.args[j][0]);
			args.push({
				"type": "argument",
				"name": vars.args[j][2],
				"id": genId(),
			});
		} else {
			if(vars.args[j][1] != PARSED.separator || vars.args[j][2] != ",") return error("Unexpected token. Expected ','", vars.args[j][0]);
		}
	}
	currentNamespace[vars.name] = {
		"name": vars.name,
		"fullName": currentPrefix+vars.name,
		"type": vars.inline ? "inlineFunction" : "function",
		"args": args,
		"body": vars.body,
		"calls": [],
		"called": 0,
		"offsets": new Map(),
		"sals": [],
		"sprites": [],
		"proccode": currentPrefix+vars.name+(" %s".repeat(args.length)),
		"argumentids": JSON.stringify(args.map(elem => elem.id)),
		"argumentnames": JSON.stringify(args.map(elem => elem.name)),
		"argumentdefaults": JSON.stringify(args.map(elem => "")),
		"srcText": source,
		"srcFile": fileName,
	}
}

function parseInside(vars) {
	parser.parse(vars.inside, "code");
}

function varsConst(vars) {
	let items = vars.original.items;
	vars.original.jsOutput = [
		vars.original.const[0],
		"#const",
		items.map(e => ({"name": e[2][2], "value": e[3]}))
	];
}

function outerConst(vars) {
	let items = vars.original.items;
	for(let item of items) {
		currentNamespace[item[2][2]] = {
			"type": "constant",
			"name": item[2][2],
			"value": item[3],
		}
	}
}


function varsSal(vars) {
	vars.original.jsOutput = [
		vars.original.sal[0],
		"#sal",
		vars.original.type,
		vars.names
	];
}

function varsLet(vars) {
	vars.original.jsOutput = [
		vars.original.let[0],
		"#let",
		vars.original.names
	];
}

function varsLst(vars) {
	vars.original.jsOutput = [
		vars.original.lst[0],
		"#lst",
		vars.names
	];
}

function forLoop(vars) {
	if(vars.params.length == 3 && vars.params[1][1] == PARSED.separator && vars.params[1][2] == ";") {
		vars.original.jsOutput = [vars.original.forLoop[0], "#for", vars.params[0], vars.params[2], vars.original.code];
	} else {
		error("for loop needs to have 2 params separated by ;", vars.original.forLoop[0]);
		vars.original.jsOutput = [vars.original.forLoop[0], "#dummy"]
	}
}

function getByPath(path) {
	if(path[1] == "#readProperty") return (getByPath(path[2]))[path[3][2]];
	return currentNamespace[path[2]] ?? globalNamespace[path[2]] ?? null;
}

function getLocalVar(name) {
	if(!globalNamespace[name]) {
		globalNamespace[name] = {
			"name": name,
			"fullName": name,
			"type": "variable",
			"id": genId(),
		}
	}
	return globalNamespace[name];
}

function getLocalList(name) {
	if(!globalNamespace[name]) {
		globalNamespace[name] = {
			"name": name,
			"fullName": name,
			"type": "list",
			"id": genId(),
		}
	}
	return globalNamespace[name];
}