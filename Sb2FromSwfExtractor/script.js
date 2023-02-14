var a = document.getElementById("a");
var input = document.getElementById("f");
var reader = new FileReader();
var sb2sizePos = 0x0004a2c8;
var sb2pos = 0x0004a2d2;

input.onchange = function() {
	a.download = this.files[0].name.replaceAll(".swf",".sb2");
	reader.readAsArrayBuffer(this.files[0]);
}

reader.onload = function() {
	var data = reader.result;
	var sb2sizeAB = data.slice(sb2sizePos, sb2sizePos+4);
	var sb2sizeU8 = new Uint8Array(sb2sizeAB);
	var sb2size = 0;
	for(let i=0,j=1; i<4; i++, j*=256) {
		sb2size += sb2sizeU8[i] * j;
	}
	sb2size -= 6;
	var sb2dataAB = data.slice(sb2pos, sb2pos+sb2size);
	var blob = new Blob([sb2dataAB], {type: 'application/octet-stream'});
	var url = URL.createObjectURL(blob);
	a.href = url;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}