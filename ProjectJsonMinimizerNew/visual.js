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

class Visual {
	optionCheckboxes = [];
	idCheckboxes = [];
	allCheckboxes = [];

	constructor() {
		this.optionCheckboxes = Array.from(document.getElementsByClassName("option"));
		this.idCheckboxes = Array.from(document.getElementsByClassName("compressId"));
		this.allCheckboxes = [...this.optionCheckboxes, ...this.idCheckboxes];
	}

	reset() {
		id("newbar").style.width = "0%";
		id("oldbar").style.width = "0%";
		id("importError").innerText = "";
		id("message").innerText = "nothing yet";
		id("waitForDownload").style.display = "none";
	}

	newbar(size) {
		id("newbar").style.width = `${size*100}%`;
	}

	oldbar(size) {
		id("oldbar").style.width = `${size*100}%`;
	}

	show(string) {
		id("message").innerHTML = string;
	}

	lock() {
		id("loadFromFile").disabled = true;
		id("loadFromUrl").disabled = true;

		for(let checkbox of this.allCheckboxes) {
			checkbox.disabled = true;
		}
	}

	unlock() {
		id("loadFromFile").disabled = false;
		id("loadFromUrl").disabled = false;

		for(let checkbox of this.allCheckboxes) {
			checkbox.disabled = false;
		}
	}

	getOptions() {
		let options = {};
		for(let checkbox of this.optionCheckboxes) {
			options[checkbox.name] = checkbox.checked;
		}
		options.reduceIds = [];
		for(let checkbox of this.idCheckboxes) {
			if(checkbox.checked) options.reduceIds.push(checkbox.name);
		}
		return options;
	}
}
Visual = new Visual();