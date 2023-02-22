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

class IdGenerator {
	// https://github.com/LLK/scratch-blocks/blob/67e0ba1942b473fde31e4fd9435b28919afbaa02/core/utils.js#L632-L633
	chars = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789!#$%()*+,-./:;=?@[]^_`{|}~";
	indexes = [-1];
	forbidden = {};

	constructor() {
		this.indexes = [-1];
	}

	genId() {
		let indexes = this.indexes;
		let charCount = this.chars.length;
		let chars = this.chars;
		let forbidden = this.forbidden;
		
		let result = "123";
		while(!isNaN(result) || result == "of" || forbidden[result]) {
			let i = 0;
			while(true) {
				indexes[i]++;
				if(indexes[i] >= charCount) {
					indexes[i] = 0;
					i++;
					if(i == indexes.length) {
						indexes.push(0);
						break;
					}
				} else {
					break;
				}
			}
			result = indexes.map(charIndex => chars[charIndex]).join("");
		}
		return result;
	}
}