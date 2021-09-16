var checkbox = [];
var text = document.getElementById("text");
String.prototype.occurrences = function(string, display){
	var r = this.indexOf(string);
	var c = 0;
	while(r != -1) {
		if(display) throw new Error(string+" found at "+r+"\n"+this.substr(r-100,200));
		c++;
		r = this.indexOf(string, r + 1);
	}
	return c;
}
var filepicker = document.getElementById("file1");
filepicker.onchange = async function(e) { 
	try{
		document.getElementById("new").style.width = "0%";
		document.getElementById("old").style.width = "0%";
		var file = e.target.files[0]; 
		if(!file) return;

		checkbox = [];
		for(let i=0;i<4;i++){
			let c = document.getElementById("c"+i);
			checkbox.push(c);
			c.disabled = true;
		}
		filepicker.disabled = true;

		var name = file.name;

		var blocks = [];
		var variables = [];
		var lists = [];
		var broadcasts = [];
		var comments = [];

		var blocksAdded = {};
		var variablesAdded = {};
		var listsAdded = {};
		var broadcastsAdded = {};
		var commentsAdded = {};

		await show("Reading file");
		var content = await readBlob(file);
		filepicker.value = null;

		await show("Parsing file");
		jsoned = JSON.parse(content);

		await show("JSON pass 1");

		if(checkbox[0].checked && jsoned.monitors) jsoned.monitors = [];

		let sprites = jsoned.targets;
		for(let a=0; a<sprites.length; a++) {
			let sprite = sprites[a];
			for(let b in sprite.blocks) {
				if(checkbox[2].checked && !blocksAdded[b]) {
					let tmp = [b, 0];
					blocks.push(tmp);
					blocksAdded[b] = true;
				}
				if(checkbox[1].checked) {
					let block = sprite.blocks[b];
					for(let c in block.inputs){
						let u = block.inputs[c][2];
						if(u && typeof(u)=="object") {
							if(u[0] > 3 && u[0] < 9) u[1]=0;
							if(u[0] == 10) u[1]="";
						}
					}
				}
			}
			if(checkbox[2].checked) {
				for(let b in sprite.variables){
					if(!variablesAdded[b]){
						let tmp = [b, 0];
						variables.push(tmp);
						variablesAdded[b] = true;
					}
				}
				for(let b in sprite.lists){
					if(!listsAdded[b]){
						let tmp = [b, 0];
						lists.push(tmp);
						listsAdded[b] = true;
					}
				}
				for(let b in sprite.broadcasts){
					if(!broadcastsAdded[b]){
						let tmp = [b, 0];
						broadcasts.push(tmp);
						broadcastsAdded[b] = true;
					}
				}
				for(let b in sprite.comments){
					if(!commentsAdded[b]){
						let tmp = [b, 0];
						comments.push(tmp);
						commentsAdded[b] = true;
					}
				}
			}
		}

		await show("Counting occurances");
		let all = [...blocks, ...variables, ...lists, ...broadcasts, ...comments];
		let m = 0, n = 0;
		for(var b in all){
			all[b][1] = content.occurrences('"'+all[b][0]+'"');
			m++;
			if(m > 199) {
				n += m;
				m = 0;
				document.getElementById("new").style.width = (n / blocks.length * 100)+"%";
				await waitFrame();
			}
		}
		await show("Sorting");

		let sorter = function(a, b) {
			if(a[1] > b[1]) return -1;
			if(a[1] < b[1]) return 1;
			return 0;
		}
		blocks.sort(sorter);
		variables.sort(sorter);
		lists.sort(sorter);
		broadcasts.sort(sorter);
		comments.sort(sorter);
		all.sort(sorter);

		await show("Generating conversion table");

		let code = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789"
		let combin = [0,0,0];
		let combin2 = ["q","q","q"];
		function increment(combin,combin2,code,i){
			if(combin[i] === undefined) {
				combin.push(0);
				combin2.push("q");
				return;
			}
			combin[i]++;
			if(combin[i] == code.length) {
				combin[i] = 0;
				combin2[i] = "q";
				increment(combin,combin2,code,i+1);
			}
			combin2[i] = code[combin[i]];
		}
		var cTable2 = {};
		for(var b in all){
			increment(combin,combin2,code,0);
			cTable2[all[b][0]] = combin2.join("");
		}
		var cTable = new Proxy(cTable2,{
			get(target, prop) {
				if(target[prop] == undefined) {
					increment(combin,combin2,code,0);
					target[prop] = cTable2[prop] = combin2.join("");
				}
				return target[prop];
			}
		});
		await show("JSON pass 2");

		m = 0;
		for(let a=0; a<sprites.length; a++) {
			let sprite = sprites[a];
			let newList = {};
			for(let b in sprite.blocks) {
				let block = sprite.blocks[b];
				newList[cTable[b]] = block;
				if(block.opcode){
					if(block.parent ) block.parent  = cTable[block.parent ];
					if(block.next   ) block.next    = cTable[block.next   ];
					if(block.comment) block.comment = cTable[block.comment];
					let inputs = block.inputs;
					for(let c in inputs){
						let input = inputs[c];
						if(typeof input != "object") continue;
						for(let d in input){
							switch(typeof input[d]) {
								case "string":
									input[d] = cTable[input[d]];
									break;
								case "object":
									if(!input[d]) continue;
									if(input[d][0] == 11) input[d][2] = cTable[input[d][2]];
									if(input[d][0] == 12) input[d][2] = cTable[input[d][2]];
									if(input[d][0] == 13) input[d][2] = cTable[input[d][2]];
									break;
							}
						}
					}
					let fields = block.fields;
					if(fields.VARIABLE) fields.VARIABLE[1] = cTable[fields.VARIABLE[1]];
					if(fields.LIST) fields.LIST[1] = cTable[fields.LIST[1]];
					if(fields.BROADCAST_OPTION) fields.BROADCAST_OPTION[1] = cTable[fields.BROADCAST_OPTION[1]];
				} else if(block){
					if(block[0] == 11) block[2] = cTable[block[2]];
					if(block[0] == 12) block[2] = cTable[block[2]];
					if(block[0] == 13) block[2] = cTable[block[2]];
				}
				m++;
				if(m > 199) {
					m = 0;
					document.getElementById("new").style.width = (a / sprites.length * 100)+"%";
					await waitFrame();
				}
			}
			sprite.blocks = newList;
			newList = {};
			for(let b in sprite.variables){
				newList[cTable[b]] = sprite.variables[b];
			}
			sprite.variables = newList;
			newList = {};
			for(let b in sprite.lists){
				newList[cTable[b]] = sprite.lists[b];
			}
			sprite.lists = newList;
			newList = {};
			for(let b in sprite.broadcasts){
				newList[cTable[b]] = sprite.broadcasts[b];
			}
			sprite.broadcasts = newList;
			newList = {};
			for(let b in sprite.comments){
				newList[cTable[b]] = sprite.comments[b];
				sprite.comments[b].blockId = cTable[sprite.comments[b].blockId];
			}
			sprite.comments = newList;
		}

		var content3 = JSON.stringify(jsoned);

		if(checkbox[3].checked) {
			console.log(checkbox[3].checked);
			console.log(checkbox);
			await show("Searching for errors");
			m = 0;
			n = 0;
			for(var b in all){
				content3.occurrences('"'+all[b][0]+'"', true);
				m++;
				if(m > 199) {
					n += m;
					m = 0;
					document.getElementById("new").style.width = (n / blocks.length * 100)+"%";
					await waitFrame();
				}
			}
		}

		var delta=content.length-content3.length;
		document.getElementById("text").innerHTML="Size decreased by "+delta+" bytes";
		document.getElementById("new").style.width = (content3.length / 5242880 * 100)+"%";
		document.getElementById("old").style.width = ((content.length - content3.length) / 5242880 * 100)+"%";
		var blob= new Blob([content3],{type:"text/plain;charset=utf-8"});
		saveAs(blob,"project.json");
	} catch(error) {
		text.innerHTML='<span style="color:red;">'+error+'</span>';
	} finally {
		filepicker.disabled = false;
		for(let i=0;i<4;i++) checkbox[i].disabled = false;
	}
}
function readBlob(file) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();
		reader.readAsText(file);
		reader.onload = event => resolve(event.target.result);
	});
}
async function show(text2){
	text.innerHTML = text2;
	await waitFrame();
}
function waitFrame(){
	return new Promise((resolve,reject) => {
		window.requestAnimationFrame(() => resolve(true));
	});
}