var a = document.getElementById("a");
var input = document.getElementById("f");
var reader = new FileReader();

input.onchange = function() {
	a.download = this.files[0].name.replaceAll(".swf",".sb2");
	reader.readAsArrayBuffer(this.files[0]);
}

reader.onload = function() {
	var data = reader.result;
	var toFind = [0x50, 0x4b, 0x03, 0x04];
	var at = 0;
	var sb2pos = null;
	var data2 = new Uint8Array(data);
	for(let i=0; i<data2.length; i++) {
		if(data2[i] == toFind[at]) {
			at++;
			if(at == 4) {
				sb2pos = i - 3;
				break;
			}
		} else {
			at = 0;
		}
	}
	if (sb2pos == null) return alert("SB2 zip header was not found :(");
	var sb2dataAB = data.slice(sb2pos);
	var blob = new Blob([sb2dataAB], {type: 'application/octet-stream'});
	var url = URL.createObjectURL(blob);
	a.href = url;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}