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

const id = (id) => document.getElementById(id);
if(location.hash) id("urlInput").value = location.hash.substr(1);

id("loadFromUrl").addEventListener("click", async function(event) {
	try {
		Visual.reset();
		Visual.lock();
		let project = new Project();
		await project.loadFromUrl(id("urlInput").value);
		await compressAndSave(project);
	} catch(error) {
		id("importError").innerText = error;
	}
	Visual.unlock();
});

id("loadFromFile").addEventListener("click", function(event) {
	id("filePicker").click();
});

id("filePicker").addEventListener("change", async function(event) {
	try {
		Visual.reset();
		Visual.lock();
		let file = event.target.files[0]; 
		if(!file) return;
		event.target.value = null;
		let project = new Project();
		await project.loadFromFile(file);
		await compressAndSave(project);
	} catch(error) {
		id("importError").innerText = error;
	}
	Visual.unlock();
});

async function compressAndSave(project) {
	try {
		let options = Visual.getOptions();
		let min = new Minimizer();
		min.main(project.projectJson, options);

		let oldJson = project.projectJsonString;
		let newJson = project.projectJsonString = JSON.stringify(project.projectJson);
		let delta = oldJson.length - newJson.length;
		if(delta >  0) id("message").innerText = `Size decreased by ${delta} bytes`;
		if(delta == 0) id("message").innerText = `Size hasn't changed`;
		if(delta <  0) id("message").innerHTML = `Size <span class="redText">increased</span> by ${-delta} bytes`;
		Visual.newbar(newJson.length / 5242880);
		Visual.oldbar(delta / 5242880);

		if(!options.dryRun) {
			id("waitForDownload").style.display = "inline";
			await project.save();
		}
	} catch(error) {
		id("message").innerHTML=`<span class="redText">${error}</span>`;
	}
}

function parse(string, errorMsg) {
	try {
		return JSON.parse(string);
	} catch(e) {
		throw new Error(errorMsg);
	}
}

function defined(value, errorMsg) {
	if(value === undefined || value === null) throw new Error(errorMsg);
	return value;
}