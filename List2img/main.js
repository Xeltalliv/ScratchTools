//    ScratchTools - a set of simple Scratch related tools
//    Copyright (C) 2021-2022  Xeltalliv
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

const channelModes = [[0], [0,1,2], [0,1,2,3], [3,0,1,2]];
const modeElem = document.getElementById("mode");
if(location.hash) modeElem.value = location.hash.substr(1,3);
modeElem.onchange = () => {location.hash = "#"+modeElem.value; changeMode(); process();}

let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
let widthElem = document.getElementById("width");
let heightElem = document.getElementById("height");
let offsetElem = document.getElementById("offset");
let image = document.getElementById("image");
let error = document.getElementById("error");

let listData = [];
let colors = [];
let func = null;
let step = 1;
let shown = false;

document.getElementById("file").onchange = async filepicker => {
	let reader = new FileReader();
	reader.onload = () => {
		listData = reader.result.split("\n");
		document.getElementById("file").value = null;
		changeMode();
		if(!shown) {
			document.getElementById("main").append(...document.getElementById("hidden").childNodes);
			shown = true;
		}
		process();
	}
	reader.readAsText(filepicker.target.files[0]);
};

widthElem.addEventListener('input', process);
heightElem.addEventListener('input', process);
offsetElem.addEventListener('input', process);

function process() {
	if(listData.length == 0) return;

	let width = widthElem.value | 0;
	let height = heightElem.value | 0;
	let offset = offsetElem.value | 0
	colors = [];
	func(listData.slice(offset, width*height*step), colors);
	if(colors.length != width*height*4) {
		image.style.display = "none";
		error.style.display = "block";
		return
	}
	canvas.width = width;
	canvas.height = height;
	ctx.putImageData(new ImageData(new Uint8ClampedArray(colors), width, height), 0, 0);
	image.src = canvas.toDataURL('image/png');
	image.style.display = "block";
	error.style.display = "none";
}

function changeMode() {
	let mode = modeElem.value;
	step = "1344"[mode[2]];
	let colors = [];

	let wrapperStart;
	let wrapperEnd;
	if(mode[0] == "d") {
		wrapperStart = "";
		wrapperEnd = "";
	}
	if(mode[0] == "h") {
		wrapperStart = "parseInt(";
		wrapperEnd = ", 16)";
	}
	if(mode[0] == "p") {
		wrapperStart = "parseInt(";
		wrapperEnd = ")";
	}

	let value0;
	let value1;
	let value2;
	let value3;
	if(mode[1] == "n") {
		value0 = wrapperStart+"lines[i]"+wrapperEnd;
		value1 = wrapperStart+"lines[i+1]"+wrapperEnd;
		value2 = wrapperStart+"lines[i+2]"+wrapperEnd;
		value3 = wrapperStart+"lines[i+3]"+wrapperEnd;
	}
	if(mode[1] == "c") {
		value0 = "("+wrapperStart+"lines[i]"+wrapperEnd+" >> 24) & 0xff";
		value1 = "("+wrapperStart+"lines[i]"+wrapperEnd+" >> 16) & 0xff";
		value2 = "("+wrapperStart+"lines[i]"+wrapperEnd+" >> 8) & 0xff";
		value3 =     wrapperStart+"lines[i]"+wrapperEnd+      " & 0xff";
		for(let i=0; i<(4-step); i++) {
			value0 = value1;
			value1 = value2;
			value2 = value3;
		}
		step = 1;
	}
	let red = "";
	let green = "";
	let blue = "";
	let alpha = "";
	let extra = "";
	if(mode[2] == "0") {
		extra = "let value = "+value0+"; ";
		red = "value"
		green = "value";
		blue = "value";
		alpha = "255";
	}
	if(mode[2] == "1") {
		red = value0;
		green = value1;
		blue = value2;
		alpha = "255";
	}
	if(mode[2] == "2") {
		red = value1;
		green = value2;
		blue = value3;
		alpha = value0;
	}
	if(mode[2] == "3") {
		red = value0;
		green = value1;
		blue = value2;
		alpha = value3;
	}

	let funcSrc = "(lines, colors) => {for(let i=0; i<lines.length; i+="+step+") {"+extra+"colors.push("+red+", "+green+", "+blue+", "+alpha+");}}";
	func = eval(funcSrc);
}

function guess() {
	let width = widthElem.value | 0;
	let height = heightElem.value | 0;
	let offset = offsetElem.value | 0
	colors = [];
	func(listData, colors);
	let pixelCount = colors.length / 4;

	let maxVal = 0;
	let maxWidth = 0;
	let abs = Math.abs;
	let size = Math.sqrt(pixelCount) * 2 * 4;
	for(let w=32; w<size; w+=4) {
		let sum = 0;
		let total = 0;
		for(let i=0, j=w; j<colors.length; i+=4, j+=4) {
			sum += 1024 - (abs(colors[i]-colors[j]) + abs(colors[i+1]-colors[j+1]) + abs(colors[i+2]-colors[j+2]) + abs(colors[i+3]-colors[j+3]));
			total += 1024;
		}
		sum /= total;
		if(sum > maxVal) {
			maxVal = sum;
			maxWidth = w;
		}
	}
	maxWidth /= 4;

	widthElem.value = maxWidth;
	heightElem.value = Math.floor(pixelCount / maxWidth);
	process();
}

function next() {
	let width = widthElem.value | 0;
	let height = heightElem.value | 0;
	let offset = offsetElem.value | 0
	offsetElem.value = offset + width * height * step;
	process();
}