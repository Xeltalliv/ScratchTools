var project;
var content;
var maps;
var mode;
var warnings;

var compressed;

async function start() {
	try{
		warnings = 0;
		project = document.getElementById("project").value;
		var shareware = document.getElementById("shareware").checked;
		var file = document.getElementById("file").files[0];
		maps = document.getElementById("map").value.split(" ");
		mode = document.getElementById("mode").value;

		var button = document.getElementById("button");
		button.disabled = true;

		if(!file) throw new Error("File is missing");
		if(!project) throw new Error("Project of engine is missing");

		content = await readBlob(file);


		compressed = [];

		var lumpCount = num(content.substr(4,4));
		var lumpListStart = num(content.substr(8,4));
		var lumpType = "normal";

		var textures = {"-":"0"};
		var pointers2 = {};
		var flats = {};
		var patches = {};
		var pnames = [];
		var palette = [];
		var colors = [];

		var lumpNameArray = [];

		for (var q=0,b=lumpListStart; q < lumpCount; q++, b+=16) {
			var lumpName = content.substr(b+8,8).replace(/\0/g, '');
			lumpNameArray.push(lumpName);

			if(lumpName == "F1_END" ) lumpType = "normal";
			if(lumpName == "P1_END" ) lumpType = "normal";
			if(lumpName == "F2_END" ) lumpType = "normal";
			if(lumpName == "P2_END" ) lumpType = "normal";
			if(lumpName == "F3_END" ) lumpType = "normal";
			if(lumpName == "P3_END" ) lumpType = "normal";

			if(lumpName == "PLAYPAL"  ) getPalette(b, palette);
			if(lumpName == "PNAMES"   ) getPatchNames(b, pnames);
			if(lumpName == "TEXTURE1" ) pointers2.texture = {b:b, lumpName:lumpName};
			if(lumpType == "flat"     ) getFlat(b, lumpName, flats, palette, colors);
			if(lumpType == "patch"    ) getPatch(b, lumpName, patches);

			if(lumpName == "F1_START" ) lumpType = "flat";
			if(lumpName == "P1_START" ) lumpType = "patch";
			if(!shareware) {
				if(lumpName == "F2_START" ) lumpType = "flat";
				if(lumpName == "P2_START" ) lumpType = "patch";
				if(lumpName == "F3_START" ) lumpType = "flat";
				if(lumpName == "P3_START" ) lumpType = "patch";
			}
		}

		flats.F_SKY1   = "sky"; // DEFAULT
		flats.F_SKY    = "sky"; // HEXEN
		flats.F_SKY001 = "sky"; // STRIFE

		getTextures(pointers2.texture.b, pointers2.texture.lumpName, textures, colors, patches, pnames, palette);

		for(var m=0; m<maps.length; m++) {
			var mapFound = false;
			pointers = {};

			for (var q=0,b=lumpListStart; q < lumpCount; q++, b+=16) {
				var lumpName = lumpNameArray[q];

				if(lumpName == maps[m]) {
					pointers = {};
					mapFound = true;
				}
				if(lumpName == "VERTEXES" && !pointers.vertexes) pointers.vertexes = b;
				if(lumpName == "SEGS"     && !pointers.segs    ) pointers.segs     = b;
				if(lumpName == "LINEDEFS" && !pointers.linedefs) pointers.linedefs = b;
				if(lumpName == "SIDEDEFS" && !pointers.sidedefs) pointers.sidedefs = b;
				if(lumpName == "SECTORS"  && !pointers.sectors ) pointers.sectors  = b;
				if(lumpName == "SSECTORS" && !pointers.ssectors) pointers.ssectors = b;
				if(lumpName == "NODES"    && !pointers.nodes   ) pointers.nodes    = b;
				if(lumpName == "THINGS"   && !pointers.things  ) pointers.things   = b;
		    			}
			if(!mapFound) throw new Error("Map " + maps[m] + " not found");

			getVertexes();
			getSegs();
			getLinedefs();
			getSidedefs(textures);
			getSectors(flats);
			getSsectors();
			getNodes();
		}


		await downloadProject();
		await patchProject();
		await packageProject();

	} catch(error) {
		console.log(error);
		alert(error.message);
	} finally {
		button.disabled = false;
	}
}

function getPalette(location, palette) {
	var start = num(content.substr(location,4));
	var size  = num(content.substr(location+4,4));

	for(var x=0; x < 16; x++){
		for(var y=0; y < 16; y++){
			var red   = num(content.substr(start + (x * 16 + y) * 3,     1));
			var green = num(content.substr(start + (x * 16 + y) * 3 + 1, 1));
			var blue  = num(content.substr(start + (x * 16 + y) * 3 + 2, 1));
			palette.push([red, green, blue]);
		}
	}
}

function getFlat(location, name, flats, palette, colors) {
	var start = num(content.substr(location,4));

	var colorSum = [0, 0, 0];

	for(var x=0; x < 64; x++){
		for(var y=0; y < 64; y++){
			var color = palette[num(content.substr(start + (x * 64 + y),1))];
			colorSum[0] += color[0];
			colorSum[1] += color[1];
			colorSum[2] += color[2];
		}
	}
	colorSum[0] = (0 + Math.floor(colorSum[0] / 4096).toString(16)).slice(-2);
	colorSum[1] = (0 + Math.floor(colorSum[1] / 4096).toString(16)).slice(-2);
	colorSum[2] = (0 + Math.floor(colorSum[2] / 4096).toString(16)).slice(-2);
	colors.push("" + colorSum[0] + colorSum[1] + colorSum[2]);
	flats[name] = colors.length;
}

function getPatch(location, name, patches) {
	var start = num(content.substr(location,4));

	var width = num(content.substr(start,2));
	var height = num(content.substr(start+2,2));
	var image = new Array(height*width).fill(null);

	for(var x=0; x<width; x++) {
		var i = num(content.substr(start + 8 + x * 4, 4));
		var subColumns = 0;
		var yOffsetOld = -1;
		while(subColumns < 250) {
			subColumns++;
			var yOffset = num(content.substr(start + i, 1));
			if(yOffset < yOffsetOld) yOffset += 256;
			yOffsetOld = yOffset;
			var columnHeight = num(content.substr(start + i + 1, 1));
			i += 2;
			for(var y=0; y<columnHeight; y++, i++) {
				image[x * height + y + yOffset] = num(content.substr(start + i + 1, 1));
			}
			i += 2;
			if(num(content.substr(start + i, 1)) == 255) break;
		}
		if(subColumns > 249) throw new Error("Image decoding failed");
	}
	patches[name] = [width, height, image];
}

function getTextures(location, name, textures, colors, patches, pnames, palette) {
	var start = num(content.substr(location,4));

	var current = start;
	var amount = num(content.substr(start,4));
	for (var i=0; i < amount; i++) {
		current+=4;
		var textureStart = num(content.substr(current,4));

		var textureName = content.substr(start+textureStart,8).replace(/\0/g, '');
		var totalWidth = num(content.substr(start+textureStart+12,2));
		var totalHeight = num(content.substr(start+textureStart+14,2));
		var image = new Array(totalWidth * totalHeight).fill(null);

		var patchAmount = num(content.substr(start+textureStart+20,2));
		for (var u=0; u < patchAmount; u++) {
			var xOffset = mod(num(content.substr(start+textureStart+22+u*10,2))-32768,65536)-32768;
			var yOffset = mod(num(content.substr(start+textureStart+24+u*10,2))-32768,65536)-32768;
			var patchIndex = num(content.substr(start+textureStart+26+u*10,2));
			var patch = patches[pnames[patchIndex]];
			if(!patch) {
				warn("Patch "+pnames[patchIndex]+" with index "+patchIndex+" not found");
				continue;
			}
			for(var x=0; x<patch[0]; x++){
				for(var y=0; y<patch[1]; y++){
					var color = patch[2][x * patch[1] + y];
					if(color != null) image[(x + xOffset) * totalHeight + (y + yOffset)] = color;
				}
			}
		}
		colors.push(getAverageColor(image, palette));
		textures[textureName] = colors.length;
	}
	compressed.push(new base64Writer().put(colors.join("")).get());
}

function displayImage(image, width, height){
	var canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	var ctx = canvas.getContext("2d");
	for(var x=0; x<width; x++) {
		for(var y=0; y<height; y++) {
			var color = palette[image[x * height + y]];
			if(!color) continue;
			var red  = color[0];
			var green = color[1];
			var blue = color[2];
			ctx.fillStyle = "rgba("+red+","+green+","+blue+",1)";
			ctx.fillRect(x, y, 1, 1);
		}
	}
	document.body.appendChild(canvas);
}

function getAverageColor(image, palette){
	var colorSum = [0, 0, 0];
	var total = 0;

	for(var i=0; i < image.length; i++){
		if(image[i] == null) continue;
		var color = palette[image[i]];
		colorSum[0] += color[0];
		colorSum[1] += color[1];
		colorSum[2] += color[2];
		total++;
	}
	colorSum[0] = (0 + Math.floor(colorSum[0] / total).toString(16)).slice(-2);
	colorSum[1] = (0 + Math.floor(colorSum[1] / total).toString(16)).slice(-2);
	colorSum[2] = (0 + Math.floor(colorSum[2] / total).toString(16)).slice(-2);
	return "" + colorSum[0] + colorSum[1] + colorSum[2];
}

function getPatchNames(location, pnames) {
	var start = num(content.substr(location,4));
	var amount = num(content.substr(start, 4));
	var current = start + 4;
    for (var i=0; i < amount; i++, current+=8) {
		pnames.push(content.substr(current, 8).replace(/\0/g, '').toUpperCase());
    }
}

function getVertexes() {
	var start = num(content.substr(pointers.vertexes,4));
	var size  = num(content.substr(pointers.vertexes+4,4));

	var current = start;
	var sizediv = size / 4;

	var vertexes = new base64Writer();

	for(var i=0; i < sizediv; i++, current+=4) {
		vertexes.putDec(num(content.substr(current,2)));
		vertexes.putDec(num(content.substr(current+2,2)));
	}

	compressed.push(vertexes.get());
}

function getSegs() {
	var start = num(content.substr(pointers.segs,4));
	var size  = num(content.substr(pointers.segs+4,4));

	var current = start;
	var sizediv = size / 12;

	var segs = new base64Writer();

	for(var i=0; i < sizediv; i++, current+=12) {
		segs.putDec(num(content.substr(current,2)));
		segs.putDec(num(content.substr(current+2,2)));
	  //segs.putDec(num(content.substr(current+4,2)));
		segs.putDec(num(content.substr(current+6,2)));
		segs.putDec(num(content.substr(current+8,2)));
		segs.putDec(num(content.substr(current+10,2)));
	}

	compressed.push(segs.get());
}


function getLinedefs(){
	var start = num(content.substr(pointers.linedefs,4));
	var size  = num(content.substr(pointers.linedefs+4,4));

	var current = start;
	

	var linedefs = new base64Writer();

	switch(mode) {
		case "hexen":
			var sizediv = size / 16;
			for(var i=0; i < sizediv; i++, current+=16) {
				linedefs.putDec(num(content.substr(current,2)));
				linedefs.putDec(num(content.substr(current+2,2)));
				linedefs.putDec(num(content.substr(current+4,2)));
				linedefs.putDec(num(content.substr(current+6,1)));
				linedefs.putDec(0);
				linedefs.putDec(num(content.substr(current+12,2)));
				linedefs.putDec(num(content.substr(current+14,2)));
			}
		default:
			var sizediv = size / 14;
			for(var i=0; i < sizediv; i++, current+=14) {
				linedefs.putDec(num(content.substr(current,2)));
				linedefs.putDec(num(content.substr(current+2,2)));
				linedefs.putDec(num(content.substr(current+4,2)));
				linedefs.putDec(num(content.substr(current+6,2)));
				linedefs.putDec(num(content.substr(current+8,2)));
				linedefs.putDec(num(content.substr(current+10,2)));
				linedefs.putDec(num(content.substr(current+12,2)));
			}
	}
	compressed.push(linedefs.get());
}

function getSidedefs(textures){
	var start = num(content.substr(pointers.sidedefs,4));
	var size  = num(content.substr(pointers.sidedefs+4,4));

	var current = start;
	var sizediv = size / 30;

	sidedefs = new base64Writer();

	for(var i=0; i < sizediv; i++, current+=30) {
		sidedefs.putDec(num(content.substr(current,2)));
		sidedefs.putDec(num(content.substr(current+2,2)));
		sidedefs.putDec(textures[content.substr(current+4,8).replace(/\0/g, '').toUpperCase()] || warn("Missing texture "+content.substr(current+4,8).replace(/\0/g, '').toUpperCase()) || 0);
		sidedefs.putDec(textures[content.substr(current+12,8).replace(/\0/g, '').toUpperCase()] || warn("Missing texture "+content.substr(current+12,8).replace(/\0/g, '').toUpperCase()) || 0);
		sidedefs.putDec(textures[content.substr(current+20,8).replace(/\0/g, '').toUpperCase()] || warn("Missing texture "+content.substr(current+20,8).replace(/\0/g, '').toUpperCase()) || 0);
		sidedefs.putDec(num(content.substr(current+28,2)));
	}
	compressed.push(sidedefs.get());
}

function getSectors(flats){
	var start = num(content.substr(pointers.sectors,4));
	var size  = num(content.substr(pointers.sectors+4,4));

	var current = start;
	var sizediv = size / 26;

	sectors = new base64Writer();

	for(var i=0; i < sizediv; i++, current+=26) {
		sectors.putDec(num(content.substr(current,2))); //signed
		sectors.putDec(num(content.substr(current+2,2))); //signed
		sectors.putDec(flats[content.substr(current+4,8).replace(/\0/g, '').toUpperCase()] || warn("Missing flat "+content.substr(current+4,8).replace(/\0/g, '').toUpperCase()) || 0);
		sectors.putDec(flats[content.substr(current+12,8).replace(/\0/g, '').toUpperCase()] || warn("Missing flat "+content.substr(current+12,8).replace(/\0/g, '').toUpperCase()) || 0);
		sectors.putDec(num(content.substr(current+20,2)));
		sectors.putDec(num(content.substr(current+22,2)));
		sectors.putDec(num(content.substr(current+24,2)));
	}
	compressed.push(sectors.get());
}

function getSsectors(){
	var start = num(content.substr(pointers.ssectors,4));
	var size  = num(content.substr(pointers.ssectors+4,4));

	var current = start;
	var sizediv = size / 4;

	ssectors = new base64Writer();

	for(var i=0; i < sizediv; i++, current+=4) {
		ssectors.putDec(num(content.substr(current,2)));
		ssectors.putDec(num(content.substr(current+2,2)));
	}
	compressed.push(ssectors.get());
}

function getNodes(){
	var start = num(content.substr(pointers.nodes,4));
	var size  = num(content.substr(pointers.nodes+4,4));

	var current = start;
	var sizediv = size / 28;

	nodesX = [];
	nodesZ = [];
	nodesDX = [];
	nodesDZ = [];
	nodesZMax0 = [];
	nodesZMin0 = [];
	nodesXMin0 = [];
	nodesXMax0 = [];
	nodesZMax1 = [];
	nodesZMin1 = [];
	nodesXMin1 = [];
	nodesXMax1 = [];
	nodesChild0 = [];
	nodesChild1 = [];
	for(var i=0; i < sizediv; i++, current+=28) {
		nodesX     .push(num(content.substr(current,2)));
		nodesZ     .push(num(content.substr(current+2,2)));
		nodesDX    .push(num(content.substr(current+4,2)));
		nodesDZ    .push(num(content.substr(current+6,2)));
		nodesZMax0 .push(num(content.substr(current+8,2)));
		nodesZMin0 .push(num(content.substr(current+10,2)));
		nodesXMin0 .push(num(content.substr(current+12,2)));
		nodesXMax0 .push(num(content.substr(current+14,2)));
		nodesZMax1 .push(num(content.substr(current+16,2)));
		nodesZMin1 .push(num(content.substr(current+18,2)));
		nodesXMin1 .push(num(content.substr(current+20,2)));
		nodesXMax1 .push(num(content.substr(current+22,2)));
		nodesChild0.push(num(content.substr(current+24,2)));
		nodesChild1.push(num(content.substr(current+26,2)));
	}
	compressed.push(mergeListsB64([nodesDX,nodesDZ,nodesX,nodesZ,nodesChild0,nodesChild1]));
	compressed.push(mergeListsB64([nodesZMax0,nodesZMin0,nodesXMin0,nodesXMax0,nodesZMax1,nodesZMin1,nodesXMin1,nodesXMax1]));
}

async function downloadProject() {
	try {
		project = await download("https://projects.scratch.mit.edu/"+project,"text","Failed to download project");
		project = tryFunc(() => JSON.parse(project),"Failed to parse project's JSON");
		let targets = tryVal(project.targets,"Targets not found");
		console.log(project);

		assets = {};
		for(var spriteName in targets){
			let sprite = targets[spriteName];
			for(var asset in sprite.costumes) await processAsset(sprite.costumes[asset]);
			for(var asset in sprite.sounds) await processAsset(sprite.sounds[asset]);
		};
		console.log("all assets loaded");
	} catch(e) {
		alert(e);
	}
}

async function processAsset(asset){
	var md5ext = asset.md5ext;
	if(assets[md5ext]) return;
	assets[md5ext] = true;
	assets[md5ext] = await download("https://assets.scratch.mit.edu/internalapi/asset/" + md5ext + "/get","arraybuffer","Failed to download asset " + md5ext);
	console.log("asset "+md5ext+" loaded");
}

async function patchProject() {
	try {
		let targets = tryVal(project.targets,"Targets not found");
		let stage = tryVal(targets.filter((sprite) => { return sprite.isStage === true; })[0],"Stage is missing");
		let engine = tryVal(targets.filter((sprite) => { return sprite.name === "engine"; })[0],"Engine is missing");


		patchList("COMPRESSED", compressed, stage);

/*					let bsp = new base64Writer();
		for(var i=0; i < nodesX.length; i++){
			bsp.putDec(-nodesDZ[i]);
			bsp.putDec( nodesDX[i]);
			bsp.putDec(-(nodesZ[i]*nodesDX[i]-nodesX[i]*nodesDZ[i]));
			if(nodesChild0[i] > 32767){
				bsp.putDec(32767 - nodesChild0[i]);
			} else {
				bsp.putDec(nodesChild0[i] + 1);
			}
			if(nodesChild1[i] > 32767){
				bsp.putDec(32767 - nodesChild1[i]);
			} else {
				bsp.putDec(nodesChild1[i] + 1);
			}
		}

		for(name in patches) {
			if(name.substr(0, 3) == "SKY") {
				let patch = patches[name];
				let file = await imageToFile(patch[2], patch[0], patch[1]);
				let text = await readBlob(file);
				let md5 = MD5(text);
				assets[md5 + ".png"] = file;
				engine.costumes.push({
					assetId: md5,
					name: name,
					bitmapResolution: 2,
					md5ext: md5 + ".png",
					dataFormat: "png",
					rotationCenterX: patch[0] / 2,
					rotationCenterY: patch[1] / 2
				});
			}
		}*/
	} catch(e) {
		console.error(e);
	}
}

function imageToFile(image, width, height) {
	var canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	var ctx = canvas.getContext("2d");
	for(var x=0; x<width; x++) {
		for(var y=0; y<height; y++) {
			var color = palette[image[x * height + y]];
			if(!color) continue;
			var red  = color[0];
			var green = color[1];
			var blue = color[2];
			ctx.fillStyle = "rgba("+red+","+green+","+blue+",1)";
			ctx.fillRect(x, y, 1, 1);
		}
	}
	return new Promise((resolve, reject) => {
		canvas.toBlob(resolve);
	});
}

function patchList(name, newValue, stage) {
	for(var i in stage.lists) {
		let value = stage.lists[i];
		if(value[0] === name) {
			value[1] = newValue;
			return;
		}
	}
	throw new Error("List " + name + " is missing");
}

async function packageProject() {
	try {
		var zip = new JSZip();

		zip.file("project.json", JSON.stringify(project));

		for(var md5ext in assets){
			zip.file(md5ext, assets[md5ext]);
		}

		zip.generateAsync({type: "blob", compression: "DEFLATE"})
		.then(function(content) {
			saveAs(content, "project.sb3");
		});
		if(warnings > 0) alert("There were " + warnings + " non-critical errors while generating this sb3. Open browser console to view them");
	} catch(e) {
		alert(e);
	}
}

var requestsAwaiting = [];
var requestsActive = 0;

function download(url,type,error) {
	return new Promise((resolve, reject) => {
		requestsAwaiting.push({url:url, type:type, resolve:resolve, reject:reject, error:error});
		downloadNext();
	});
}

function tryFunc(func, error) {
	try {
		return func();
	} catch(e) {
		throw new Error(error);
	}
}

function tryVal(val, error) {
	if(val){
		return val;
	} else {
		throw new Error(error);
	}
}

function downloadNext() {
	if(requestsAwaiting > 9 || requestsAwaiting.length == 0) return;
	requestsActive++;
	var current = requestsAwaiting.shift();
	var XHR = ("onload" in new XMLHttpRequest()) ? XMLHttpRequest : XDomainRequest;
	var xhr = new XHR();
	if(current.type) xhr.responseType = current.type;
	xhr.open('GET', current.url, true);
	xhr.onload = function() {
		if(current.type == "arraybuffer"){
			current.resolve(this.response);
		} else {
			current.resolve(this.responseText);
		}
		requestsActive--;
		downloadNext();
	}
	xhr.onerror = function() {
		alert(current.error);
	}
	xhr.send();
}

function num(str) {
	var var1 = 0;
	var var2 = 1;
	for (var n = 0; n < str.length; n ++) {
		var1 += Number(str.charCodeAt(n)) * var2;
		var2 *= 256;
	}
	return var1;
}

function mod(a,b){
	return a - Math.floor(a / b) * b;
}

function warn(...args) {
	warnings++;
	console.warn(...args);
}

function mergeListsB64(input){
	var out = new base64Writer();
	for(var i=0; i < input[0].length; i++) {
		for(var u=0; u < input.length; u++) {
			if(input[u][i] == undefined) {
				out.putDec(0);
			} else {
				out.putDec(input[u][i]);
			}
		}
	}
	return out.get();
}

function readBlob(file) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();
		reader.readAsBinaryString(file);
		reader.onload = event => resolve(event.target.result);
	});
}

class base64Writer {
	static code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	constructor() {
		this.outBit = 0b100000;
		this.outVal = 0;
		this.output = "";
	}

	putDec(input, cut = 4) {
		return this.put(("000"+input.toString(16)).slice(-cut));
	}

	put(input) {
		for(let char of input) {
			let number = parseInt(char, 16);
			for(var i=0, inBit=8; i<4; i++) {
				let bit = number & inBit;
				this.outVal = this.outVal | ((bit ? 255 : 0) & this.outBit);
				inBit = inBit >> 1;
				this.outBit = this.outBit >> 1;
				if(this.outBit == 0) {
					this.output += base64Writer.code[this.outVal];
					this.outVal = 0;
					this.outBit = 0b100000;
				}
			}
		}
		return this;
	}

	get() {
		if(this.outBit < 32) {
			this.output += base64Writer.code[this.outVal];
			this.outVal = 0;
			this.outBit = 0b100000;
		}
		return this.output;
	}
}