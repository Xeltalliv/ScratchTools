//    ScratchTools - a set of simple Scratch related tools
//    Copyright (C) 2021-2023  Xeltalliv
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <https://www.gnu.org/licenses/>.

class Project {
	name;
	projectJson;
	projectJsonString = "";
	zip;
	type;

	async loadFromFile(file) {
		if(!file) throw new Error("No file was selected");

		try {
			let projectJsonString = await this.readBlob(file);
			let projectJson = JSON.parse(project);
			
			this.name = file.name || "project.json";
			this.projectJson = projectJson;
			this.projectJsonString = projectJsonString;
			this.type = "json";
		} catch(e) {
			let zip = await JSZip.loadAsync(file);
			let projectJsonString = await zip.file("project.json").async("string");
			let projectJson = parse(projectJsonString, "Failed to parse project's JSON");

			this.name = file.name || "project.sb3";
			this.projectJson = projectJson;
			this.projectJsonString = projectJsonString;
			this.zip = zip;
			this.type = "sb3";
		}
	}

	async loadFromUrl(url) {
		let id = parseInt(url.match(/\d+/)?.[0]);
		if(isNaN(id)) throw new Error("Invalid project URL or id");

		await Visual.show("Loading project.json");
		let projectApi = await download(`https://trampoline.turbowarp.org/proxy/projects/${id}`, "text", "Failed to get project token");
		let projectApiJson = parse(projectApi, "Failed to parse project's api JSON");
		let projectJsonString = await download(`https://projects.scratch.mit.edu/${id}?token=${projectApiJson.project_token}`, "text", "Failed to download project json");
		let projectJson = parse(projectJsonString, "Failed to parse project's JSON");
		let targets = defined(projectJson.targets, "Targets not found");

		let assets = {};
		let assetCounter = {total:0, loaded:0};
		let promiseList = [];
		let zip = new JSZip();
		for(var spriteName in targets) {
			let sprite = targets[spriteName];
			for(var asset in sprite.costumes) promiseList.push(this.processAsset(sprite.costumes[asset], assets, assetCounter, zip));
			for(var asset in sprite.sounds) promiseList.push(this.processAsset(sprite.sounds[asset], assets, assetCounter, zip));
		}
		await Visual.show(`Loading ${assetCounter.total} assets`);
		await Promise.all(promiseList);
		console.log("All assets loaded");

		this.name = `${id}.sb3`;
		this.projectJson = projectJson;
		this.projectJsonString = projectJsonString;
		this.zip = zip;
		this.type = "sb3";
	}

	async readBlob(file) {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.readAsText(file);
			reader.onload = event => resolve(event.target.result);
		});
	}

	async processAsset(asset, assets, assetCounter, zip) {
		var md5ext = asset.md5ext || asset.assetId+"."+asset.dataFormat;
		if(assets[md5ext]) return;
		assets[md5ext] = true;
		assetCounter.total++;
		let content = await download(`https://assets.scratch.mit.edu/internalapi/asset/${md5ext}/get`, "arraybuffer", `Failed to download asset ${md5ext}`);
		zip.file(md5ext, content);
		console.log(`Asset ${md5ext} loaded`);
		assetCounter.loaded++;
		Visual.newbar(assetCounter.loaded / assetCounter.total);
	}

	async save() {
		let blob;
		let projectJsonString = this.projectJsonString;

		let name = this.name.split(".");
		name.splice(name.length-1, 0, "min");
		name = name.join(".");
		
		if(this.type == "json") {
			blob = new Blob([projectJsonString], {type: "text/plain;charset=utf-8"});
		} else if(this.type == "sb3") {
			this.zip.file("project.json", projectJsonString);
			blob = await this.zip.generateAsync({type: "blob", compression: "DEFLATE"});
		} else {
			throw new Error(`Unrecognized project type: ${this.type}`);
		}
		saveAs(blob, name);
	}
}