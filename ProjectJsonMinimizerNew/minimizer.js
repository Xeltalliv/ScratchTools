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

class Minimizer {
	// TODO: unlink comments from removed blocks
	main(json, options={}) {
		if(typeof json !== "object") {
			throw new Error("First argument needs to be an object (parsed json)");
		}
		//console.log(json);
		if(options.useListLast) {
			this.useListLast(json);
		}
		if(options.clearUnusedMonitors) {
			this.clearUnusedMonitors(json);
		}
		if(Array.isArray(options.reduceIds) && options.reduceIds.length > 0) {
			let ids = [];
			let mutations = [];

			this.findIdsMutations(json, ids, mutations);
			this.reduceIds(json, ids, options.reduceIds);
			this.applyIdsMutations(json, ids, mutations);
		}
		if(options.dataNumberify) {
			this.dataNumberify(json);
		}
		if(options.dataRoundLastDigit) {
			this.dataRoundLastDigit(json);
		}
		if(options.roundBlockAndCommentCoords) {
			this.roundBlockAndCommentCoords(json);
		}
		if(options.clearMonitorValues) {
			this.clearMonitorValues(json);
		}
		if(options.clearCovered) {
			this.clearCovered(json);
		}
		//console.log(json);
		return json;
	}

	findIdsMutations(json, ids, mutations) {
		let sprites = json.targets;
		let monitors = json.monitors;
		
		for(let monitor of monitors) {
			if(monitor.params.VARIABLE) ids.push({id: monitor.id, object: monitor, item: "id", location: "item", type: "variable"});
			if(monitor.params.LIST)     ids.push({id: monitor.id, object: monitor, item: "id", location: "item", type: "list"});
		}
		
		for(let sprite of sprites) {
			//console.log(sprite);
			if(Array.isArray(sprite)) throw new Error("topLevel blocks represented by arrays are not supported yet");
			
			let blocks = sprite.blocks;
			let comments = sprite.comments;
			let broadcasts = sprite.broadcasts;
			let variables = sprite.variables;
			let lists = sprite.lists;

			for(let blockId in blocks) {
				let block = blocks[blockId];
				ids.push({id: blockId, object: blocks, location: "key", type: "block"});

				if(Array.isArray(block)) {
					if(block[0] == 11) {
						ids.push({id: block[2], object: block, item: 2, location: "item", type: "broadcast"});
					}
					if(block[0] == 12) {
						ids.push({id: block[2], object: block, item: 2, location: "item", type: "variable"});
					}
					if(block[0] == 13) {
						ids.push({id: block[2], object: block, item: 2, location: "item", type: "list"});
					}
					continue;
				}
				
				if(block.next) ids.push({id: block.next, object: block, item: "next", location: "item", type: "block"});
				if(block.parent) ids.push({id: block.parent, object: block, item: "parent", location: "item", type: "block"});
				if(block.comment) ids.push({id: block.comment, object: block, item: "comment", location: "item", type: "comment"});
				
				let inputs = block.inputs;
				for(let inputName in inputs) {
					let input = inputs[inputName];
					
					for(let i=1; i<input.length; i++) {
						let inputBlock = input[i];
						if(Array.isArray(inputBlock)) {
							if(inputBlock[0] == 11) {
								ids.push({id: inputBlock[2], object: inputBlock, item: 2, location: "item", type: "broadcast"});
							}
							if(inputBlock[0] == 12) {
								ids.push({id: inputBlock[2], object: inputBlock, item: 2, location: "item", type: "variable"});
							}
							if(inputBlock[0] == 13) {
								ids.push({id: inputBlock[2], object: inputBlock, item: 2, location: "item", type: "list"});
							}
							if(inputBlock[0] < 4 || inputBlock[0] > 13) {
								throw new Error("Encountered unimplemented input type "+inputBlock[0]);
							}
						} else {
							ids.push({id: inputBlock, object: input, item: i, location: "item", type: "block"});
						}
					}
				}
				
				let fields = block.fields;
				for(let fieldName in fields) {
					let field = fields[fieldName];
					
					if(fieldName == "BROADCAST_OPTION") {
						ids.push({id: field[1], object: field, item: 1, location: "item", type: "broadcast"});
					}
					if(fieldName == "VARIABLE") {
						ids.push({id: field[1], object: field, item: 1, location: "item", type: "variable"});
					}
					if(fieldName == "LIST") {
						ids.push({id: field[1], object: field, item: 1, location: "item", type: "list"});
					}
				}
				
				if(block.opcode == "procedures_call" || block.opcode == "procedures_prototype") {
					let mutation = block.mutation;
					if(mutation.argumentids) {
						let parsed = JSON.parse(mutation.argumentids);
						mutations.push({object: mutation, item: "argumentids", location: "item", parsed: parsed});
						for(let i=0; i<parsed.length; i++) {
							ids.push({id: parsed[i], object: parsed, item: i, location: "item", type: "argument"});
							if(inputs[parsed[i]]) {
								ids.push({id: parsed[i], object: inputs, location: "key", type: "argument"});
							}
						}
					}
				}
			}
			
			for(let commentId in comments) {
				let comment = comments[commentId];
				ids.push({id: commentId, object: comments, location: "key", type: "comment"});
				
				if(comment.blockId) ids.push({id: comment.blockId, object: comment, item: "blockId", location: "item", type: "block"});
			}
			
			for(let broadcastId in broadcasts) {
				ids.push({id: broadcastId, object: broadcasts, location: "key", type: "broadcast"});
			}
			
			for(let variableId in variables) {
				ids.push({id: variableId, object: variables, location: "key", type: "variable"});
			}
			
			for(let listId in lists) {
				ids.push({id: listId, object: lists, location: "key", type: "list"});
			}
		}
		
		//console.log(ids)
		//console.log(mutations);
	}

	reduceIds(json, ids, types) {
		let idUsesObject = {};
		let idsThatRemainUnchanged = {};
		
		for(let use of ids) {
			if(types.includes(use.type)) {
				if(!idUsesObject[use.id]) {
					idUsesObject[use.id] = {
						id: use.id,
						uses: [],
						newId: null
					}
				}
				idUsesObject[use.id].uses.push(use);
			} else {
				idsThatRemainUnchanged[use.id] = true;
			}
		}
		
		let idUsesArray = Object.values(idUsesObject);
		idUsesArray.sort((a,b) => b.uses.length-a.uses.length);
		
		let idGen = new IdGenerator();
		idGen.forbidden = idsThatRemainUnchanged;
		
		for(let i=0; i<idUsesArray.length; i++) {
			let newId = idUsesArray[i].newId = idGen.genId();
			let uses = idUsesArray[i].uses;
			//console.log("nid",newId.length);
			
			for(let use of uses) {
				use.newId = newId;
			}
		}
		//console.log(idUsesArray, idsThatRemainUnchanged);
	}

	applyIdsMutations(json, ids, mutations) {
		for(let id of ids) {
			if(id.newId) {
				if(id.location == "item") {
					if(id.object[id.item] !== id.id) throw new Error("Id that needs to be replaced is not there (mode=item)");
					id.object[id.item] = id.newId;
				}
				if(id.location == "key") {
					if(!id.object[id.id]) throw new Error("Id that needs to be replaced is not there (mode=key)");
					id.value = id.object[id.id];
					delete id.object[id.id];
				}
			}
		}
		for(let id of ids) {
			if(id.newId) {
				if(id.location == "key") {
					id.object[id.newId] = id.value;
				}
			}
		}
		
		for(let mutation of mutations) {
			let newValue = JSON.stringify(mutation.parsed);
			
			if(mutation.location == "item") {
				if(!mutation.object[mutation.item]) throw new Error("Mutation that needs to be replaced is not there (mode=item)");
				mutation.object[mutation.item] = newValue;
			}
		}
		//console.log("JSON",json);
	}







	dataRoundLastDigit(json) {
		let optimizer = function(value) {
			let string = value+"";
			let short = +string.substr(0, string.length-1);
			if((short+"").length < string.length-5 && Math.abs(1-(value/short)) < 1e-14) {
				return short;
			} else {
				return value;
			}
		}
		this.dataValueOptimization(json, optimizer);
	}

	dataNumberify(json) {
		let optimizer = function(value) {
			const number = Number.parseFloat(value);
			if(number+"" === value && Number.isFinite(number)) {
				return number;
			} else {
				return value;
			}
		}
		this.dataValueOptimization(json, optimizer);
	}

	dataValueOptimization(json, optimizer) {
		let sprites = json.targets;
		
		for(let sprite of sprites) {
			let variables = sprite.variables;
			let lists = sprite.lists;
			
			for(let variableId in variables) {
				variables[variableId][1] = optimizer(variables[variableId][1]);
			}
			
			for(let listId in lists) {
				lists[listId][1] = lists[listId][1].map(optimizer);
			}
		}
	}

	roundBlockAndCommentCoords(json) {
		let sprites = json.targets;
		
		for(let sprite of sprites) {
			let blocks = sprite.blocks;
			let comments = sprite.comments;
			
			for(let blockId in blocks) {
				let block = blocks[blockId];
				if(block.topLevel) {
					block.x = Math.round(block.x) || 0;
					block.y = Math.round(block.y) || 0;
				}
				if(Array.isArray(block) && block.length > 3) {
					block[3] = Math.round(block[3]) || 0;
					block[4] = Math.round(block[4]) || 0;
				}
			}
			
			for(let commentId in comments) {
				let comment = comments[commentId];
				if('x' in comment || 'y' in comment) {
					comment.x = Math.round(comment.x) || 0;
					comment.y = Math.round(comment.y) || 0;
				}
				if('width' in comment || 'height' in comment) {
					comment.width = Math.round(comment.width);
					comment.height = Math.round(comment.height);
				}
			}
		}
	}

	clearMonitorValues(json) {
		let monitors = json.monitors;
		
		for(let monitor of monitors) {
			if(monitor.opcode == "data_listcontents") {
				monitor.value = [];
			} else {
				monitor.value = 0;
			}
		}
	}

	clearCovered(json) {
		let sprites = json.targets;
		
		for(let sprite of sprites) {
			let blocks = sprite.blocks;
			
			for(let blockId in blocks) {
				let block = blocks[blockId];
				if(Array.isArray(block)) continue;

				let inputs = block.inputs;
				for(let inputName in inputs) {
					let input = inputs[inputName];
					if(input.length == 3) {
						if(Array.isArray(input[2])) {
							this.processCovered(input[2]);
						}
					}
				}
			}
		}
	}

	processCovered(array) {
		if(array[0] >= 4 && array[0] <= 8) {
			if((array[1]+"").length == 1) {
				if(typeof array[1] == "string") array[1] = +array[1] || 0;
			} else {
				array[1] = 0;
			}
		}
		if(array[0] == 10) {
			array[1] = "";
		}
		if(array[0] < 4 || array[0] > 13) {
			throw new Error("Encountered unimplemented input type "+array[0]);
		}
	}

	useListLast(json) {
		let sprites = json.targets;
		
		for(let sprite of sprites) {
			let blocks = sprite.blocks;
			
			for(let blockId in blocks) {
				let block = blocks[blockId];
				if( block.opcode !== "data_itemoflist" &&
					block.opcode !== "data_replaceitemoflist" &&
					block.opcode !== "data_deleteoflist") continue;

				let input = block.inputs.INDEX;
				if(input.length !== 3) continue;

				let inputBlockId = input[1];
				if(typeof inputBlockId !== "string") continue;

				let inputBlock = blocks[inputBlockId];
				if(!inputBlock || inputBlock.opcode !== "data_lengthoflist") continue;

				let list1 = block.fields.LIST;
				let list2 = inputBlock.fields.LIST;
				if(list1[0] !== list2[0] || list1[1] !== list2[1]) continue;
				
				//console.log("deleting", inputBlockId);
				//console.log("modifying", blockId);
				delete blocks[inputBlockId];
				block.inputs.INDEX = [1, [6, "last"]];
			}
		}
	}

	clearUnusedMonitors(json) {
		let sprites = json.targets;
		let referencedMonitors = {};
		
		for(let sprite of sprites) {
			let blocks = sprite.blocks;
			
			for(let blockId in blocks) {
				let block = blocks[blockId];
				let opcode = block.opcode;

				if(opcode == "data_hidevariable" || opcode == "data_showvariable") {
					referencedMonitors[block.fields.VARIABLE[1]] = true;
				}
				if(opcode == "data_hidelist" || opcode == "data_showlist") {
					referencedMonitors[block.fields.LIST[1]] = true;
				}
			}
		}
		let monitors = json.monitors;
		let newMonitors = [];
		for(let monitor of monitors) {
			if(monitor.visible || referencedMonitors[monitor.id]) {
				newMonitors.push(monitor);
			}
		}
		json.monitors = newMonitors;
	}
}