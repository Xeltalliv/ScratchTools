String.prototype.occurrences = function(string, display) {
	var r = this.indexOf(string);
	var c = 0;
	while(r != -1) {
		if(display) throw new Error(string+" found at "+r+"\n"+this.substr(r-100,200));
		c++;
		r = this.indexOf(string, r + 1);
	}
	return c;
}

var Elements = {
	urlInput: document.getElementById("urlInput"),
	importError: document.getElementById("importError"),
	filePicker: document.getElementById("filePicker"),
	newbar: document.getElementById("new"),
	oldbar: document.getElementById("old"),
	checkboxMonit: document.getElementById("c0"),
	checkboxCover: document.getElementById("c1"),
	checkboxIdent: document.getElementById("c2"),
	loadFromFile: document.getElementById("loadFromFile"),
	loadFromUrl: document.getElementById("loadFromUrl"),
	message: document.getElementById("message"),
}

var Loader = {
	loadFromFile: async function () {
			Visual.reset();

			Elements.filePicker.click();
	},
	loadFromFile2: async function(file) {
		try {
			if(!file) throw new Error("No file was selected");

			Visual.lock();
			let project;
			let projectJson;
			try {
				project = await Loader.readBlob(file)
				projectJson = JSON.parse(project);
			} catch(e) {}

			if(projectJson) {
				project = await Minimizer.minimizeJSON(projectJson, project);
				let blob = new Blob([project],{type:"text/plain;charset=utf-8"});
				saveAs(blob, file.name);
			} else {
				let zip = await JSZip.loadAsync(file);
				project = await zip.file("project.json").async("string");
				projectJson = tryFunc(() => JSON.parse(project), "Failed to parse project's JSON");
				project = await Minimizer.minimizeJSON(projectJson, project);
				Loader.packageProject(project, {}, zip, file.name);
			}
		} catch(error) {
			Elements.importError.innerText = error;
		} finally {
			Visual.unlock();
		}
	},

	loadFromUrl: async function () {
		try {
			Visual.reset();
			Visual.lock();

			let id = parseInt(Elements.urlInput.value.match(/\d+/)?.[0]);
			if(isNaN(id)) throw new Error("Invalid project URL or id");

			await Visual.show("Loading project.json");
			let project = await download("https://projects.scratch.mit.edu/"+id, "text", "Failed to download project");
			let projectJson = tryFunc(() => JSON.parse(project), "Failed to parse project's JSON");
			let targets = tryVal(projectJson.targets, "Targets not found");

			let assets = {};
			let assetCounter = [0, 0];
			for(var spriteName in targets){
				let sprite = targets[spriteName];
				for(var asset in sprite.costumes) assetCounter[1]++;
				for(var asset in sprite.sounds) assetCounter[1]++;
			}
			await Visual.show("Loading "+assetCounter[1]+" assets");
			for(var spriteName in targets){
				let sprite = targets[spriteName];
				for(var asset in sprite.costumes) await Loader.processAsset(sprite.costumes[asset], assets, assetCounter);
				for(var asset in sprite.sounds) await Loader.processAsset(sprite.sounds[asset], assets, assetCounter);
			}
			console.log("All assets loaded");

			project = await Minimizer.minimizeJSON(projectJson, project);
			Loader.packageProject(project, assets);
		} catch(error) {
			Elements.importError.innerText = error;
		} finally {
			Visual.unlock();
		}
	},

	readBlob: function(file) {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.readAsText(file);
			reader.onload = event => resolve(event.target.result);
		});
	},

	processAsset: async function(asset, assets, assetCounter) {
		var md5ext = asset.md5ext;
		if(assets[md5ext]) return Visual.newbar((++assetCounter[0])/assetCounter[1]);
		assets[md5ext] = true;
		assets[md5ext] = await download("https://assets.scratch.mit.edu/internalapi/asset/"+md5ext+"/get","arraybuffer","Failed to download asset "+md5ext);
		console.log("Asset "+md5ext+" loaded");
		Visual.newbar((++assetCounter[0])/assetCounter[1]);
	},

	packageProject: async function(project, assets, zip = new JSZip(), name = "project.sb3") {
		zip.file("project.json", project);

		for(var md5ext in assets) {
			zip.file(md5ext, assets[md5ext]);
		}

		zip.generateAsync({type: "blob", compression: "DEFLATE"})
		.then(function(content) {
			saveAs(content, name);
		});
	}
}

var Minimizer = {
	minimizeJSON: async function(jsoned, content) { 
		try{
			var importantMonitors = {};

			var blocks = [];
			var variables = [];
			var lists = [];
			var broadcasts = [];
			var comments = [];

			var blocksAdded = {};
			var variablesAdded = {};
			var listsAdded = {};
			var broadcastsAdded = {};
			var commentsAdded = {};

			await Visual.show("JSON pass 1");


			let sprites = jsoned.targets;
			for(let a=0; a<sprites.length; a++) {
				let sprite = sprites[a];
				for(let b in sprite.blocks) {
					if(Elements.checkboxIdent.checked && !blocksAdded[b]) {
						let tmp = [b, 0];
						blocks.push(tmp);
						blocksAdded[b] = true;
					}
					if(Elements.checkboxCover.checked) {
						let block = sprite.blocks[b];
						for(let c in block.inputs){
							let u = block.inputs[c][2];
							if(u && typeof(u)=="object") {
								if(u[0] > 3 && u[0] < 9) u[1]=0;
								if(u[0] == 10) u[1]="";
							}
						}
					}
					if(Elements.checkboxMonit.checked) {
						let opcode = sprite.blocks[b].opcode;
						if(opcode == "data_hidevariable" || opcode == "data_showvariable") {
							importantMonitors[sprite.blocks[b].fields.VARIABLE[1]] = true;
						}
						if(opcode == "data_hidelist" || opcode == "data_showlist") {
							importantMonitors[sprite.blocks[b].fields.LIST[1]] = true;
						}
					}
				}
				if(Elements.checkboxIdent.checked) {
					for(let b in sprite.variables){
						if(!variablesAdded[b]){
							let tmp = [b, 0];
							variables.push(tmp);
							variablesAdded[b] = true;
						}
					}
					for(let b in sprite.lists){
						if(!listsAdded[b]){
							let tmp = [b, 0];
							lists.push(tmp);
							listsAdded[b] = true;
						}
					}
					for(let b in sprite.broadcasts){
						if(!broadcastsAdded[b]){
							let tmp = [b, 0];
							broadcasts.push(tmp);
							broadcastsAdded[b] = true;
						}
					}
					for(let b in sprite.comments){
						if(!commentsAdded[b]){
							let tmp = [b, 0];
							comments.push(tmp);
							commentsAdded[b] = true;
						}
					}
				}
			}

			if(Elements.checkboxMonit.checked && jsoned.monitors) {
				let monitors = jsoned.monitors;
				let newMonitors = [];
				for(let a=0; a<monitors.length; a++) {
					if(monitors[a].visible || importantMonitors[monitors[a].id]) {
						newMonitors.push(monitors[a]);
					}
				}
				jsoned.monitors = newMonitors;
			}



			await Visual.show("Counting occurances");

			let all = [...blocks, ...variables, ...lists, ...broadcasts, ...comments];
			let m = 0, n = 0;
			for(var b in all){
				all[b][1] = content.occurrences('"'+all[b][0]+'"');
				m++;
				if(m > 49) {
					n += m;
					m = 0;
					Visual.newbar(n / blocks.length);
					await waitFrame();
				}
			}



			await Visual.show("Sorting");

			let sorter = function(a, b) {
				if(a[1] > b[1]) return -1;
				if(a[1] < b[1]) return 1;
				return 0;
			}
			blocks.sort(sorter);
			variables.sort(sorter);
			lists.sort(sorter);
			broadcasts.sort(sorter);
			comments.sort(sorter);
			all.sort(sorter);



			await Visual.show("Generating conversion table");
    
			let code = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789"
			let combin = [0,0,0];
			let combin2 = ["q","q","q"];

			function increment(combin, combin2, code, i){
				if(combin[i] === undefined) {
					combin.push(0);
					combin2.push("q");
					return;
				}
				combin[i]++;
				if(combin[i] == code.length) {
					combin[i] = 0;
					combin2[i] = "q";
					increment(combin, combin2, code, i+1);
				}
				combin2[i] = code[combin[i]];
			}

			var cTable2 = {};
			for(var b in all){
				increment(combin, combin2, code, 0);
				cTable2[all[b][0]] = combin2.join("");
			}
			var cTable = new Proxy(cTable2,{
				get(target, prop) {
					if(target[prop] == undefined) {
						increment(combin, combin2, code, 0);
						target[prop] = cTable2[prop] = combin2.join("");
					}
					return target[prop];
				}
			});

			await Visual.show("JSON pass 2");
    
			m = 0;
			for(let a=0; a<sprites.length; a++) {
				let sprite = sprites[a];
				let newList = {};
				for(let b in sprite.blocks) {
					let block = sprite.blocks[b];
					newList[cTable[b]] = block;
					if(block.opcode){
						if(block.parent ) block.parent  = cTable[block.parent ];
						if(block.next   ) block.next    = cTable[block.next   ];
						if(block.comment) block.comment = cTable[block.comment];
						let inputs = block.inputs;
						for(let c in inputs){
							let input = inputs[c];
							if(typeof input != "object") continue;
							for(let d in input){
								switch(typeof input[d]) {
									case "string":
										input[d] = cTable[input[d]];
										break;
									case "object":
										if(!input[d]) continue;
										if(input[d][0] == 11) input[d][2] = cTable[input[d][2]];
										if(input[d][0] == 12) input[d][2] = cTable[input[d][2]];
										if(input[d][0] == 13) input[d][2] = cTable[input[d][2]];
										break;
								}
							}
						}
						let fields = block.fields;
						if(fields.VARIABLE) fields.VARIABLE[1] = cTable[fields.VARIABLE[1]];
						if(fields.LIST) fields.LIST[1] = cTable[fields.LIST[1]];
						if(fields.BROADCAST_OPTION) fields.BROADCAST_OPTION[1] = cTable[fields.BROADCAST_OPTION[1]];
					} else if(block){
						if(block[0] == 11) block[2] = cTable[block[2]];
						if(block[0] == 12) block[2] = cTable[block[2]];
						if(block[0] == 13) block[2] = cTable[block[2]];
					}
					m++;
					if(m > 199) {
						m = 0;
						Visual.newbar(a / sprites.length);
						await waitFrame();
					}
				}
				sprite.blocks = newList;
				newList = {};
				for(let b in sprite.variables){
					newList[cTable[b]] = sprite.variables[b];
				}
				sprite.variables = newList;
				newList = {};
				for(let b in sprite.lists){
					newList[cTable[b]] = sprite.lists[b];
				}
				sprite.lists = newList;
				newList = {};
				for(let b in sprite.broadcasts){
					newList[cTable[b]] = sprite.broadcasts[b];
				}
				sprite.broadcasts = newList;
				newList = {};
				for(let b in sprite.comments){
					newList[cTable[b]] = sprite.comments[b];
					sprite.comments[b].blockId = cTable[sprite.comments[b].blockId];
				}
				sprite.comments = newList;
			}
			for(let a=0; a<jsoned.monitors.length; a++) {
				jsoned.monitors[a].id = cTable[jsoned.monitors[a].id];
			}


			var content3 = JSON.stringify(jsoned);

			if(false) {
				await Visual.show("Searching for errors");
				m = 0;
				n = 0;
				for(var b in all){
					content3.occurrences('"'+all[b][0]+'"', true);
					m++;
					if(m > 199) {
						n += m;
						m = 0;
						Visual.newbar(n / blocks.length);
						await waitFrame();
					}
				}
			}

			var delta = content.length - content3.length;
			Elements.message.innerText = "Size decreased by "+delta+" bytes";
			Visual.newbar(content3.length / 5242880);
			Visual.oldbar((content.length - content3.length) / 5242880);
			return content3;
		} catch(error) {
			Elements.message.innerText='<span class=redText>'+error+'</span>';
		}
	}
}

var Visual = {
	reset: function() {
		Elements.newbar.style.width = "0%";
		Elements.oldbar.style.width = "0%";
		Elements.importError.innerText = "";
		Elements.message.innerText = "nothing yet";
	},

	newbar: function(size) {
		Elements.newbar.style.width = (size*100)+"%";
	},

	oldbar: function(size) {
		Elements.oldbar.style.width = (size*100)+"%";
	},

	show: async function(string){
		Elements.message.innerHTML = string;
		await waitFrame();
	},

	lock: function() {
		Elements.checkboxMonit.disabled = true;
		Elements.checkboxCover.disabled = true;
		Elements.checkboxIdent.disabled = true;
		Elements.loadFromFile .disabled = true;
		Elements.loadFromUrl  .disabled = true;
	},

	unlock: function() {
		Elements.checkboxMonit.disabled = false;
		Elements.checkboxCover.disabled = false;
		Elements.checkboxIdent.disabled = false;
		Elements.loadFromFile .disabled = false;
		Elements.loadFromUrl  .disabled = false;
	}
}

Elements.filePicker.onchange = async function(e) { 
	let file = e.target.files[0]; 
	if(!file) return;
	Elements.filePicker.value = null;
	Loader.loadFromFile2(file);
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

function waitFrame(){
	return new Promise((resolve,reject) => {
		window.requestAnimationFrame(() => resolve(true));
	});
}


var requestsAwaiting = [];
var requestsActive = 0;

function download(url, type, error) {
	return new Promise((resolve, reject) => {
		requestsAwaiting.push({url:url, type:type, resolve:resolve, reject:reject, error:error});
		downloadNext();
	});
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