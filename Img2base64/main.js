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

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const colors = {R:0,G:1,B:2,A:3};

document.getElementById("file").onchange = async filepicker => {
	let mode = document.getElementById("mode").value;
	let actions = [];
	for(let i=0; i<mode.length; i++) {
		if(mode[i] == " ") continue;
		let offset = colors[mode[i]];
		if(offset === undefined) {
			alert("invalid character: "+mode[i]);
			document.getElementById("file").value = null;
			return;
		}
		i++;
		let bits = +mode[i]
		if(isNaN(bits) || bits == 0) {
			alert("invalid bit count: "+mode[i]);
			document.getElementById("file").value = null;
			return;
		}
		actions.push([offset, bits]);
	}

	let output = [];
	let files = filepicker.target.files;
	for(let i=0; i<files.length; i++) {
		let file = files[i];
		process(await new Promise((resolve, reject) => {
			let img = new Image();
			img.onload = () => resolve(img);
			img.onerror = err => alert(file.name+" is not a valid image");
			img.src = URL.createObjectURL(file);
		}), output, actions);
	}

	let name = files.length == 1 ? files[0].name : "images";
	let blob = new Blob([output.join('\n')], {type:"text/plain;charset=utf-8"});
	saveAs(blob, name+".txt");
	document.getElementById("file").value = null;
}

function process(image, output, actions) {
	let canv = document.createElement("canvas");
	canv.width = image.width;
	canv.height = image.height;
	let ctx = canv.getContext("2d");
	ctx.drawImage(image, 0, 0);
	let imgdata = ctx.getImageData(0, 0, canv.width, canv.height).data;

	let bits = 0;
	let bitcount = 0;
	let out = "";
	for(let i=0; i<imgdata.length; i+=4) {
		for(let action of actions) {
			let color = imgdata[i+action[0]];
			bits = (bits << action[1]) + (color >> (8-action[1]));
			bitcount += action[1];
			while(bitcount >= 6) {
				out += chars[bits >> (bitcount - 6)];
				bits &= (1<<(bitcount-6))-1;
				bitcount -= 6;
			}
		}
	}
	if(bitcount > 0) out += chars[bits << (6-bitcount)];
	output.push(out);
	URL.revokeObjectURL(image.src);
}