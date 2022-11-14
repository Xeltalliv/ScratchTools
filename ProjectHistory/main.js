const id = (id) => document.getElementById(id);
let hash = null;

id("select").addEventListener("input", (evt) => {
	hash = evt.target.value;
});

id("previewTW").addEventListener("click", () => {
	id("main").append(...id("hiddenIframe").childNodes);
	id("iframe").src = "https://turbowarp.org/embed?project_url=https://scratchdb.lefty.one/v3/project/source/"+hash+"/";
});

id("previewFork").addEventListener("click", () => {
	id("main").append(...id("hiddenIframe").childNodes);
	id("iframe").src = "https://forkphorus.github.io/embed.html?id="+id+"&auto-start=true&light-content=false&phost=https://scratchdb.lefty.one/v3/project/source/"+hash+"/";
});

id("load").addEventListener("click", async (evt) => {
	evt.target.disabled = true;
	try {
		await loadProject();
	} catch(e) {
		id("out1").innerText = e;
	}
	evt.target.disabled = false;
});


id("download").addEventListener("click", async (evt) => {
	evt.target.disabled = true;
	try {
		await downloadProject();
	} catch(e) {
		id("out2").innerText = e;
	}
	evt.target.disabled = false;
});

async function loadProject(button) {
	let select = id("select");
	let projectId = parseInt(id("urlInput").value.match(/\d+/)?.[0]);
	if(isNaN(projectId)) throw new Error("Invalid project URL or id");

	let res = await fetch("https://scratchdb.lefty.one/v3/project/info/"+projectId+"/");
	if(res.status == 404) throw new Error("Project data not found");
	let pdata = await res.json();
	let history = pdata.metadata.history;
	while (select.firstChild) {
		select.removeChild(select.lastChild);
	}
	let sorted = [];
	for(let date in history) {
		sorted.push({
			timestamp:new Date(date).getTime(),
			date: new Date(date).toGMTString(),
			hash: history[date]
		});
	}
	sorted.sort((a,b) => a.timestamp-b.timestamp);
	for(let version of sorted) {
		let opt = document.createElement("option");
		opt.value = version.hash;
		opt.textContent = version.date;
		select.append(opt);
	}
	hash = select.value;
	id("main").append(...id("hiddenButtons").childNodes);
}


async function downloadProject() {
	let project = await download("https://scratchdb.lefty.one/v3/project/source/"+hash+"/", "text", "Failed to load project.json of "+hash);
	let projectJson = tryFunc(() => JSON.parse(project), "Failed to parse project's JSON");
	let targets = tryVal(projectJson.targets, "Targets not found");

	let assets = {};
	let assetCounter = {now:0, total:0};
	for(var spriteName in targets) {
		let sprite = targets[spriteName];
		for(var asset in sprite.costumes) assetCounter.total++;
		for(var asset in sprite.sounds) assetCounter.total++;
	}

	let promiseList = [];
	for(var spriteName in targets) {
		let sprite = targets[spriteName];
		for(var asset in sprite.costumes) promiseList.push(processAsset(sprite.costumes[asset], assets, assetCounter));
		for(var asset in sprite.sounds) promiseList.push(processAsset(sprite.sounds[asset], assets, assetCounter));
	}
	await Promise.all(promiseList);

	id("out2").innerText = "Filling sb3";
	let zip = new JSZip();
	zip.file("project.json", project);
	for(let md5ext in assets) {
		zip.file(md5ext, assets[md5ext]);
	}
	id("out2").innerText = "Packing sb3";
	let blob = await zip.generateAsync({type: "blob", compression: "DEFLATE"});
	id("out2").innerText = "Wait for download";
	saveAs(blob, name);
}

async function processAsset(asset, assets, assetCounter) {
	let md5ext = asset.md5ext;
	if(!assets[md5ext]) {
		assets[md5ext] = true;
		assets[md5ext] = await download("https://assets.scratch.mit.edu/internalapi/asset/"+md5ext+"/get", "arraybuffer", "Failed to download asset "+md5ext);
		console.log("Asset "+md5ext+" loaded");
	}
	id("out2").innerText = (++assetCounter.now)+"/"+assetCounter.total;
}

function tryFunc(func, error) {
	try {
		return func();
	} catch(e) {
		throw new Error(error);
	}
}

function tryVal(val, error) {
	if(val) {
		return val;
	} else {
		throw new Error(error);
	}
}

var requestsAwaiting = [];
var requestsActive = 0;

function download(url, type, error) {
	return new Promise((resolve, reject) => {
		requestsAwaiting.push({url:url, type:type, resolve:resolve, error:error, attempt:1});
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
		if(current.type == "arraybuffer") {
			current.resolve(this.response);
		} else {
			current.resolve(this.responseText);
		}
		requestsActive--;
		downloadNext();
	}
	xhr.onerror = function() {
		if(current.attempt < 4) {
			current.attempt++;
			requestsAwaiting.push(current);
			requestsActive--;
			downloadNext();
		} else {
			alert(current.error);
		}
	}
	xhr.send();
}