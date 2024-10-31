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

const channelModes = [[0], [0,1,2], [0,1,2,3], [3,0,1,2], [3,0,1,2]];
const modeElem = document.getElementById("mode");
const fileElem = document.getElementById("file");
if(location.hash) modeElem.value = location.hash.substr(1,3);
modeElem.onchange = () => location.hash = "#"+modeElem.value;

fileElem.addEventListener('change', async function(event) {
	await processFiles(event.target.files);
	event.target.value = null;
});
document.addEventListener('paste', async function(event) {
	event.preventDefault();
	await processFiles(event.clipboardData.files);
});

async function processFiles(files) {
	let mode = modeElem.value;
	let channels = [];
	let channelMode = channelModes[mode[2]];
	for(let i=0; i<channelMode.length; i++) {
		let str = "imgdata[i+"+channelMode[i]+"]";
		if(mode[0] != "d") str = str+".toString(16).padStart(2,'0')";
		if(mode[0] == "d" && mode[1] == "c") {
			let mul = 256 ** (channelMode.length - 1 - i);
			if(mul > 1) str += "*"+mul;
		}
		if(mode[0] == "p" && mode[1] == "n") str = "'0x'+"+str;
		if(mode[0] == "i" && mode[1] == "n") str = "'#'+"+str;
		if(mode[2] == "4" && channelMode[i] == 3) str = "(imgdata[i+"+channelMode[i]+"]==255?"+(mode[0] == "d"?"0":"''")+":"+str+")";
		channels.push(str);
	}
	let funcSrc = "";
	if(mode[0]=="p" && mode[1]=="c") funcSrc = "'0x'+";
	if(mode[0]=="i" && mode[1]=="c") funcSrc = "'#'+";
	funcSrc += channels.join(mode[1]=="n" ? ", " : "+");
	if(mode[2] == "4" && mode[1] == "c") funcSrc = "imgdata[i+3]==0?'':("+funcSrc+")";
	funcSrc = "for(var i=0; i<imgdata.length; i+=4) output.push("+funcSrc+");";
	console.log(funcSrc);
	let func = new Function("output", "imgdata", funcSrc);

	let output = [];
	for(let i=0; i<files.length; i++) {
		let file = files[i];
		process(await new Promise((resolve, reject) => {
			let img = new Image();
			img.onload = () => resolve(img);
			img.onerror = err => alert(file.name+" is not a valid image");
			img.src = URL.createObjectURL(file);
		}), func, output);
	}

	let name = files.length == 1 ? files[0].name : "images";
	let blob = new Blob([output.join('\n')], {type:"text/plain;charset=utf-8"});
	saveAs(blob, name+".txt");
}

function process(image, func, output) {
	let canv = document.createElement("canvas");
	canv.width = image.width;
	canv.height = image.height;
	let ctx = canv.getContext("2d");
	ctx.drawImage(image, 0, 0);
	let imgdata = ctx.getImageData(0, 0, canv.width, canv.height).data;
	func(output, imgdata);
	URL.revokeObjectURL(image.src);
}