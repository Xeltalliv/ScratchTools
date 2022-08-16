function similar(s1, s2) {
	s1 = s1.toLowerCase();
	s2 = s2.toLowerCase();
	let scores = {0:0};
	let max = 0;
	for(let i=0; i<s1.length; i++) {
		for(let j=0; j<s2.length; j++) {
			if(s1[i] == s2[j]) {
				let pos = i-j;
				if(!scores[pos]) scores[pos] = 0;
				scores[pos]++;
				if(scores[pos] > scores[max]) max = pos;
			}
		}
	}
	scores = {};
	for(let i=0; i<s1.length; i++) {
		for(let j=0; j<s2.length; j++) {
			if(s1[i] == s2[j]) {
				let pos = i-j;
				if(pos != max) {
					if(s1[i] == s2[i-max]) continue;
					if(s1[j+max] == s2[j]) continue;
				}
				if(!scores[pos]) scores[pos] = 0;
				scores[pos]++;
			}
		}
	}
	let final = scores[max];
	let i = max;
	let mul = 0.8;
	while(i++, mul *= mul, scores[i]) {
		final += scores[i] * mul;
	}
	i = max;
	mul = 0.8;
	while(i--, mul *= mul, scores[i]) {
		final += scores[i] * mul;
	}
	return final / Math.max(s1.length, s2.length);
}

function findSimilar(string, list) {
	let max = 0;
	let maxI = 0;
	for(let i=0; i<list.length; i++) {
		let score = similar(string, list[i]);
		if(score > max) {
			max = score;
			maxI = i;
		}
	}
	if(max <= 0.5) return null;
	return list[maxI];
}

function didYouMean(string, list) {
	if(!(list instanceof Array)) list = Object.keys(list);
	let res = findSimilar(string, list);
	if(res === null) return "";
	return ". Did you mean '"+res+"'? Problem";
}