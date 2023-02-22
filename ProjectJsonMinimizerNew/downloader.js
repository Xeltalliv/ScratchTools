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

let requestsAwaiting = [];
let requestsActive = 0;

function download(url, type, errorMsg) {
	return new Promise((resolve, reject) => {
		requestsAwaiting.push({url, type, resolve, reject, errorMsg, attempt:1});
		downloadNext();
	});
}

function downloadNext() {
	if(requestsAwaiting > 9 || requestsAwaiting.length == 0) return;
	requestsActive++;
	let current = requestsAwaiting.shift();

	let xhr = new XMLHttpRequest();
	if(current.type) xhr.responseType = current.type;
	xhr.open("GET", current.url, true);
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
			alert(current.errorMsg);
			current.reject(current.errorMsg);
		}
	}
	xhr.send();
}