const DefaultTypes = ["number", "string", "boolean"];
const ReservedWords2 = ["if", "else", "forever", "repeat", "while", "until", "for", "let", "lst", "const", "sal"];
const ReservedWords = [...DefaultTypes, ...ReservedWords2];
const ValidMath = ["abs", "sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "floor", "ceil", "round", "randomInt", "randomFloat", "random", "pow"];

var parser = new Parser(syntax, syntaxRequirements);
var methodCompiler = new MethodCompiler();
var linker = new Linker();
//var scratchblocksEmitter = new ScratchblocksEmitter();
var scratchEmitter = new ScratchEmitter();

var globalNamespace;
var currentNamespace;
var currentOuterNamespace;
var currentPrefix;
var currentFunction;
var exportList;
var listReserved;
var gotError;
var fileName;

var dirHandle;

var Elements = {
	dirPickerButton: document.getElementById("dirPickerButton"),
	importZipButton: document.getElementById("importZipButton"),
	compileButton: document.getElementById("compileButton"),
	log: document.getElementById("log"),
	importError: document.getElementById("importError"),
	waitForDownload: document.getElementById("waitForDownload"),
}


function resetAll() {
	globalNamespace =  {"Math": {"name": "Math", "type": "namespace", "visual": "Math | ", "value": {}},
						"Pen": {"name": "Pen", "type": "namespace", "visual": "Pen | ", "value": {}}};
	ValidMath.forEach(op => globalNamespace.Math.value[op] = {"type": "nativeFunction", "exec": Natives.mathOp, "name": op});
	globalNamespace.Pen.value["down"] = {"type": "nativeFunction", "exec": Natives.penDown, "name": "down"};
	globalNamespace.Pen.value["up"] = {"type": "nativeFunction", "exec": Natives.penUp, "name": "up"};
	globalNamespace.Pen.value["clear"] = {"type": "nativeFunction", "exec": Natives.penClear, "name": "clear"};
	globalNamespace.Pen.value["setSize"] = {"type": "nativeFunction", "exec": Natives.penSetSize, "name": "setSize"};
	globalNamespace.Pen.value["moveTo"] = {"type": "nativeFunction", "exec": Natives.penMoveTo, "name": "moveTo"};
	currentNamespace = globalNamespace;
	currentOuterNamespace = globalNamespace;
	currentPrefix = "";
	currentFunction = null;
	exportList = null;
	listReserved = [];
	gotError = false;
}

async function openDirPicker() {
	try {
		dirHandle = await window.showDirectoryPicker();
	} catch(e) {};
	if(dirHandle) {
		Elements.compileButton.removeAttribute("disabled");
	} else {
		Elements.compileButton.setAttribute("disabled", 1);
	}
}

async function compile() {
	if(!dirHandle) return;
	resetAll();
	Elements.log.innerText = "";
	Visual.log("Starting compilation...");

	// Recursively go through files and find correct ones
	let files = [];
	await getFiles(dirHandle, files);
	if(exportList) {
		Visual.log("Found 'exportList.txt'");
		exportList = await (await exportList.getFile()).text();
	} else {
		Visual.log("'exportList.txt' is missing. Exporting everything to the first sprite");
	}

	for(let file of files) {
		// Read text file contents
		fileName = file.handle.name;
		let f = await file.handle.getFile();
		source = await f.text();

		// Turn text into token tree
		let tokens = tokenizeMain(0);
		Visual.log("  parsing file "+file.handle.name);
		if(gotError) return;

		// Parse everything outside functions
		parser.parse(tokens, "main");
		if(gotError) return;
	}
	// Parse (but not compile) inline functions
	Visual.log("Compiling inline functions:");
	methodCompiler.compileInliners(globalNamespace);
	if(gotError) return;

	// Parse and compile normal functions. Parsed inline functions are pasted in before full compilation
	Visual.log("Compiling functions:");
	methodCompiler.compileAll(globalNamespace);
	if(gotError) return;

	// Prevent overlaps in sal (statically allocated list positions), let (local variables) and lst (local lists).
	linker.linkAll(globalNamespace, exportList);
	if(gotError) return;

	// Generate sb3
	scratchEmitter.emitAll();
	if(gotError) return;
	Visual.log("Done. Please wait. The download of sb3 should start soon");
	//scratchblocksEmitter.emitAll();
}

async function getFiles(handle, files) {
	for await (const entry of handle.values()) {
		if(entry.kind == "directory") await getFiles(entry, files);
		if(entry.kind == "file" && entry.name.endsWith(".js")) files.push({"handle": entry});
		if(entry.kind == "file" && entry.name == "exportList.txt") exportList = entry;
	}
}

function genId() {
	const chars = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789";
	const length = chars.length;
	let out = "";
	for(let i=0; i<20; i++) {
		out += chars[(Math.random() * length) | 0];
	}
	return out;
}