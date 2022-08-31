const DefaultTypes = ["number", "string", "boolean"];
const ReservedWords2 = ["if", "else", "forever", "repeat", "while", "until", "for", "let", "lst", "const", "sal"];
const ReservedWords = [...DefaultTypes, ...ReservedWords2];
const ValidMath = ["abs", "sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "floor", "ceil", "round", "random", "pow"];

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
var srcZip;
var outputHandle;
var dirHandle;

var Elements = {
	dirPickerButton: document.getElementById("dirPickerButton"),
	importZipButton: document.getElementById("importZipButton"),
	compileButton: document.getElementById("compileButton"),
	log: document.getElementById("log"),
	importError: document.getElementById("importError"),
	waitForDownload: document.getElementById("waitForDownload"),
	filePicker: document.getElementById("filePicker"),
	icon: document.getElementById("icon"),
}

if(!window.showDirectoryPicker) {
	Elements.dirPickerButton.disabled = true;
	Elements.dirPickerButton.title = "Not supported in your browser";
}

Elements.filePicker.onchange = async function(e) { 
	let file = e.target.files[0]; 
	if(!file) return;
	Elements.filePicker.value = null;
	srcZip = await JSZip.loadAsync(file);
	if(srcZip) dirHandle = null;
	if(dirHandle || srcZip) {
		Elements.compileButton.removeAttribute("disabled");
	} else {
		Elements.compileButton.setAttribute("disabled", 1);
	}
}


function resetAll() {
	globalNamespace =  {"Math": {"name": "Math", "type": "namespace", "visual": "Math | ", "value": {}},
						"Pen": {"name": "Pen", "type": "namespace", "visual": "Pen | ", "value": {}},
						"Looks": {"name": "Looks", "type": "namespace", "visual": "Looks | ", "value": {}},
						"Sensing": {"name": "Sensing", "type": "namespace", "visual": "Sensing | ", "value": {}}};
	ValidMath.forEach(op => globalNamespace.Math.value[op] = {"type": "nativeFunction", "exec": Natives.mathOp, "name": op});
	globalNamespace.Pen.value["down"] = {"type": "nativeFunction", "exec": Natives.penDown, "name": "down"};
	globalNamespace.Pen.value["up"] = {"type": "nativeFunction", "exec": Natives.penUp, "name": "up"};
	globalNamespace.Pen.value["clear"] = {"type": "nativeFunction", "exec": Natives.penClear, "name": "clear"};
	globalNamespace.Pen.value["setSize"] = {"type": "nativeFunction", "exec": Natives.penSetSize, "name": "setSize"};
	globalNamespace.Pen.value["moveTo"] = {"type": "nativeFunction", "exec": Natives.penMoveTo, "name": "moveTo"};
	globalNamespace.Looks.value["setSize"] = {"type": "nativeFunction", "exec": Natives.setSize, "name": "setSize"};
	globalNamespace.Sensing.value["mouseX"] = {"type": "constant", "value": [0, "#mouseX"], "name": "mouseX"};
	globalNamespace.Sensing.value["mouseY"] = {"type": "constant", "value": [0, "#mouseY"], "name": "mouseY"};
	globalNamespace.Sensing.value["mouseDown"] = {"type": "constant", "value": [0, "#mouseDown"], "name": "mouseDown"};
	globalNamespace.Sensing.value["keyDown"] = {"type": "nativeFunction", "exec": Natives.sensingKeyPressed, "name": "keyDown"};
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
	if(dirHandle) srcZip = null;
	if(dirHandle || srcZip) {
		Elements.compileButton.removeAttribute("disabled");
	} else {
		Elements.compileButton.setAttribute("disabled", 1);
	}
}

async function importZip() {
	Elements.filePicker.click();
}

async function compile() {
	if(!dirHandle && !srcZip) return;
	resetAll();
	Elements.log.innerText = "";
	Visual.log("Starting compilation...");

	// Recursively go through files and find correct ones
	let files = dirHandle ? await scanFilesFSAPI(dirHandle) : await scanFilesJSZIP(srcZip);

	for(let file of files) {
		// Read text file contents
		if(dirHandle) await fileContentFSAPI(file);
		else await fileContentJSZIP(file)

		// Turn text into token tree
		let tokens = tokenizeMain(0);
		Visual.log("  parsing file "+file.name);
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
	//scratchblocksEmitter.emitAll();
}

async function getFiles(handle, files) {
	for await (const entry of handle.values()) {
		if(entry.kind == "directory") await getFiles(entry, files);
		if(entry.kind == "file" && entry.name.endsWith(".vspl")) files.push(entry);
		if(entry.kind == "file" && entry.name == "exportList.txt") exportList = entry;
		if(entry.kind == "file" && entry.name == "Compiled.sb3") outputHandle = entry;
	}
}

async function scanFilesFSAPI(handle) {
	let files = [];
	await getFiles(dirHandle, files);
	if(exportList) {
		Visual.log("Found 'exportList.txt'");
		exportList = await (await exportList.getFile()).text();
	} else {
		Visual.log("'exportList.txt' is missing. Exporting everything to the first sprite");
	}
	return files;
}

async function scanFilesJSZIP(handle) {
	let files = [];
	handle.forEach(function (relativePath, entry) {
		if(!entry.dir && entry.name.endsWith(".js")) files.push(entry);
		if(!entry.dir && entry.name.split("/").at(-1) == "exportList.txt") exportList = entry;
	});
	if(exportList) {
		Visual.log("Found 'exportList.txt'");
		exportList = await exportList.async("string");
	} else {
		Visual.log("'exportList.txt' is missing. Exporting everything to the first sprite");
	}
	return files;
}

async function fileContentFSAPI(file) {
	fileName = file.name;
	source = await (await file.getFile()).text();
}

async function fileContentJSZIP(file) {
	fileName = file.name;
	source = await file.async("string");
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