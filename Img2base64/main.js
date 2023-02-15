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

document.getElementById("file").onchange = async filepicker => {
	let output = [];
	let files = filepicker.target.files;
	for(let i=0; i<files.length; i++) {
		let file = files[i];
		process(await new Promise((resolve, reject) => {
			let img = new Image();
			img.onload = () => resolve(img);
			img.onerror = err => alert(file.name+" is not a valid image");
			img.src = URL.createObjectURL(file);
		}), output);
	}

	let name = files.length == 1 ? files[0].name : "images";
	let blob = new Blob([output.join('\n')], {type:"text/plain;charset=utf-8"});
	saveAs(blob, name+".txt");
	document.getElementById("file").value = null;
}

function process(image, output) {
	let canv = document.createElement("canvas");
	canv.width = image.width;
	canv.height = image.height;
	let ctx = canv.getContext("2d");
	ctx.drawImage(image, 0, 0);
	let imgdata = ctx.getImageData(0, 0, canv.width, canv.height).data;
	output.push(btoa(new Uint8Array(imgdata).reduce((data, byte) => data + String.fromCharCode(byte), '')));
	URL.revokeObjectURL(image.src);
}