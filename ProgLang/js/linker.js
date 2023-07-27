class Linker {
	linkAll(ns, exportList) {
		if(exportList) {
			Visual.log("Parsing exportList.txt");
			exportList.split("\n").filter(row => row.length).some(row => {
				if(row == "#stop") return true;
				if(row.trimStart()[0] !== "#") {
					let words = row.split(" ");
					if(words.length == 2 && words[1].length > 0) {
						let path = words[1].split(".");
						let visited = "";
						let at = ns;
						for(let step of path) {
							if(step == "*") {
								this.findFnsForSprite(at, words[0]);
								return true;
							}
							if(!at[step]) {
								error2("exportList.txt error: path '"+visited+"' doesn't contain '"+step+"'.");
								return true;
							}
							at = at[step];
							if(!(at.type == "function" || at.type == "namespace")) {
								error2("exportList.txt error: element at path '"+visited+"' has disallowed type '"+at.type+"'.");
								return true;
							}
							if(at.type == "namespace") {
								at = at.value;
							}
							if(visited.length > 0) visited += ".";
							visited += step;
						}
						if(at.type == "function") {
							if(!at.sprites.includes(words[0])) at.sprites.push(words[0]);
						} else {
							error2("exportList.txt error: element at '"+visited+"' is '"+at.type+"', but it needs to be a 'function'.");
							return true;
						}
					}
				}
				return false;
			});
		}
		let allFns = [];
		this.findAllFns(allFns, ns);
		if(exportList) {
			for(let fn of allFns) {
				for(let call of fn.calls) {
					for(let sprite of fn.sprites) {
						this.addSprites(call.fn, sprite);
					}
				}
			}
			allFns = allFns.filter(fn => fn.sprites.length);
		} else {
			allFns.forEach(elem => elem.sprites = ["Sprite1"]); //TODO use actual sprite list from template json
		}
		for(let fn of allFns) {
			for(let call of fn.calls) {
				call.fn.called++;
			}
		}
		let rootFns = [];
		for(let fn of allFns) {
			if(fn.called == 0) rootFns.push(fn);
		}
		Visual.log("Linking:");
		for(let i=0; i<rootFns.length; i++) {
			if(gotError) return;
			let fn = rootFns[i];
			source = fn.srcText;
			fileName = fn.srcFile;
			Visual.log("  linking '"+fn.fullName+"'");
			for(let sal of fn.sals) {
				if(sal.value[1] == "#number") {
					sal.value[2] += fn.offsets.get(sal.type) || 0;
					if(sal.value[2] > sal.type.reserved - sal.type.step) sal.type.reserved = sal.value[2] + sal.type.step;
				}
				if(sal.value[1] == "#variable") {
					let varName = "s"+(parseInt(sal.value[2].slice(1)) + (fn.offsets.get(sal.type) || 0))
					let varObj = getLocalVar(varName);
					sal.value[2] = varName;
					sal.value[3] = varObj.id;
					sal.value[4] = varObj;
				}
				if(sal.value[1] == "#list") {
					let varName = "list "+(parseInt(sal.value[2].slice(5)) + (fn.offsets.get(sal.type) || 0))
					let varObj = getLocalList(varName);
					sal.value[2] = varName;
					sal.value[3] = varObj.id;
					if(sal.value[1] == "#list") sal.value[4] = varObj;
				}
			}
			for(let call of fn.calls) {
				for(let [type, offset] of fn.offsets) {
					if(!call.offsets.has(type)) call.offsets.set(type, 0);
					call.offsets.set(type, call.offsets.get(type) + offset);
				}
			}
			for(let call of fn.calls) {
				for(let [type, offset] of call.offsets) {
					call.fn.offsets.set(type, Math.max(offset, call.fn.offsets.get(type) || 0));
				}
				call.fn.called--;
				if(call.fn.called == 0) rootFns.push(call.fn);
			}
		}
		for(let element of listReserved) {
			element[1][2] = element[0].reserved;
		}
	}
	findAllFns(allFns, ns) {
		let previousNamespace = currentNamespace;
		currentNamespace = ns;
		for(let j in ns) {
			let elem = ns[j];
			let type = elem.type;
			if(type == "function") {
				allFns.push(elem);
			}
			if(type == "namespace") {
				this.findAllFns(allFns, elem.value);
			}
		}
		currentNamespace = previousNamespace;
	}
	addSprites(fn, sprite) {
		if(!fn.sprites.includes(sprite)) {
			fn.sprites.push(sprite);
			for(let call of fn.calls) {
				this.addSprites(call.fn, sprite);
			}
		}
	}
	findFnsForSprite(ns, sprite) {
		for(let name in ns) {
			let elem = ns[name];
			if(elem.type == "namespace") this.findFnsForSprite(elem.value, sprite);
			if(elem.type == "function" && !elem.sprites.includes(sprite)) elem.sprites.push(sprite);
		}
	}
}