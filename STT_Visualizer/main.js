var joined = "";
var gi = 0;
var outputP = null;
var outputW = null;
var outputPOld = null;
var outputWOld = null;
var worldprops = ["start date","daycount"];
var playerprops = ["HashID", "lives", "upgrades", "energy", "position"];

function doStuff() {
	document.getElementById("inputs").style = "display: none;"
	let val = JSON.parse(document.getElementById("ta").value);
	let e = "0".repeat(256);
	let variables = [e,e,e,e,e,e,e,e,e];
	for(let i=val.length-1; i>=0; i--) {
		if(!val[i]["verb"] == "set_var") continue;
		variables[val[i]["name"][6]-1] = val[i]["value"];
		if(variables[0] != e && variables[1] != e) {
			print(" ");
			print("Processing data by "+val[i]["user"]+":");
			decode(variables);
		} else {
			print(" ");
			print("Skipping user "+val[i]["user"]+"");
		}
	}
}
function decode(variables) {
	joined = variables.join("");
	gi = 0;
	outputPOld = outputP;
	outputWOld = outputW;
	outputP = [];
	outputW = [];
	for(let w=0; w<10; w++) {
		readW(4);
		readW(2);
		for(let p=0; p<16; p++) {
			readP(6);
			readP(1);
			readP(1);
			readP(2);
			readP(3);
		}
	}
	if(outputWOld) {
		for(let i=0; i<outputW.length; i++) {
			if(outputW[i] != outputWOld[i]) print(" - Changed World " + Math.floor(i/2) + " property " + worldprops[i%2] + " from " + outputWOld[i] + " to " + outputW[i]);
		}
		for(let i=0; i<outputP.length; i++) {
			if(outputP[i] != outputPOld[i]) print(" - Changed Player " + Math.floor(i/5) + " property " + playerprops[i%5] + " from " + outputPOld[i] + " to " + outputP[i]);
		}
	}
}

function readP(n) {
	outputP.push(joined.substr(gi, n));
	gi += n;
}
function readW(n) {
	outputW.push(joined.substr(gi, n));
	gi += n;
}

function print(msg) {
	let elem = document.createElement("span");
	elem.innerText = msg;
	document.body.appendChild(elem);
	document.body.appendChild(document.createElement("br"));
	//console.log(msg);
}