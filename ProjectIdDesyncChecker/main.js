const filePicker = document.getElementById("filePicker");
const projectUrls = document.getElementById("projectUrls");
const startButton = document.getElementById("startButton");
const results = document.getElementById("results");
const status = document.getElementById("status");
const username = document.getElementById("username");

const corsProxy = "https://corsproxy.io/?url=";

async function start() {
	startButton.disabled = true;
	projectUrls.disabled = true;

	await getProjectJsons();

	log("Done");
	startButton.disabled = false;
	projectUrls.disabled = false;
}

async function getProjectJsons() {
	for(const file of filePicker.files) {
		status.textContent = `decoding ${file.name}`;
		if (file.name.endsWith(".json")) {
			checkJson(file.name, JSON.parse(await file.text()));
		}
		if (file.name.endsWith(".sb3") || file.name.endsWith(".zip")) {
			const zip = await JSZip.loadAsync(file);
			const projectJsonFile = zip.file("project.json");
			if (!projectJsonFile) continue;
			checkJson(file.name, JSON.parse(await projectJsonFile.async("string")));
		}
	}
	const rows = projectUrls.value.replaceAll("\n", " ").split(" ");
	if (username.value && username.value.length > 0) {
		try {
			let offset = 0;
			let limit = 20;
			while(true) {
				status.textContent = `user projects ${offset/limit}`;
				const projects = await (await fetch(`${corsProxy}https://api.scratch.mit.edu/users/${username.value}/projects/?offset=${offset}&limit=${limit}`)).json();
				for(const project of projects) rows.push(""+project.id);
				if (projects.length < limit) break;
				offset += limit;
			}
		} catch(e) {
			status.textContent = `failed to get user data!`;
			await new Promise(res => setTimeout(res, 1000));
		}
	}
	for(let row of rows) {
		try {
			const match = row.match(/\d+/);
			if (!match) continue;
			const projectId = match[0];
			status.textContent = `downloading ${projectId}`;
			const projectApiJson = await (await fetch(`https://trampoline.turbowarp.org/proxy/projects/${projectId}`)).json();
			const projectJson = await (await fetch(`https://projects.scratch.mit.edu/${projectId}?token=${projectApiJson.project_token}`)).json();
			checkJson(`${projectApiJson.title} [${projectId}]`, projectJson);
		} catch(e) {}
	}
	status.textContent = "";
}

function checkJson(name, projectJson) {
	log(`Analyzing project "${name}":`);
	if (projectJson.objName) {
		log("    project is sb2, therefore not affected\n");
		return;
	}
	if (!projectJson.targets) {
		log("    not valid sb3\n");
		return;
	}
	const stage = projectJson.targets.find(t => t.isStage);
	for(const target of projectJson.targets) {
		target.variablesFromIds = cacheFromIds(target.variables);
		target.variablesFromNames = cacheFromNames(target.variables);
		target.listsFromIds = cacheFromIds(target.lists);
		target.listsFromNames = cacheFromNames(target.lists);
	}
	for(const target of projectJson.targets) {
		for(const [blockId, block] of Object.entries(target.blocks)) {
			checkBlock(block, target, stage);
		}
	}
	log("");
}

function cacheFromIds(all) {
	const table = {};
	for(const [key, value] of Object.entries(all)) {
		table[key] = value[0];
	}
	return table;
}

function cacheFromNames(all) {
	const table = {};
	for(const [key, value] of Object.entries(all)) {
		table[value[0]] = key;
	}
	return table;
}

const VARIABLE = 12;
const LIST = 13;

function checkBlock(block, target, stage) {
	if (Array.isArray(block)) {
		if (block[0] === VARIABLE) checkVariable(block[2], block[1], stage, target);
		if (block[0] === LIST) checkList(block[2], block[1], stage, target);
	} else if (typeof block === "object" && block !== null) {
		const fields = block.fields;
		if (fields) {
			if (fields.VARIABLE) checkVariable(fields.VARIABLE[1], fields.VARIABLE[0], stage, target);
			if (fields.LIST) checkList(fields.LIST[1], fields.LIST[0], stage, target);
		}
		const inputs = block.inputs;
		if (inputs) {
			for(const [inputName, values] of Object.entries(inputs)) {
				checkBlock(values[1], target, stage);
			}
		}
	}
}

function checkVariable(id, name, stage, target) {
	const err = checkData(id, name, stage.variablesFromIds, stage.variablesFromNames, target.variablesFromIds, target.variablesFromNames);
	if (err) log(`  ${target.name}: variable\n${err}`);
}

function checkList(id, name, stage, target) {
	const err = checkData(id, name, stage.listsFromIds, stage.listsFromNames, target.listsFromIds, target.listsFromNames);
	if (err) log(`  "${target.name}": list\n${err}`);
}

function checkData(id, name, stageFromIds, stageFromNames, targetFromIds, targetFromNames) {
	const stageById = stageFromIds[id] && {id, name: stageFromIds[id]};
	const stageByName = stageFromNames[name] && {id: stageFromNames[name], name};
	const targetById = targetFromIds[id] && {id, name: targetFromIds[id]};
	const targetByName = targetFromNames[name] && {id: targetFromNames[name], name};

	const found = stageById ?? stageByName ?? targetById ?? targetByName;
	if (!found) {
		return `    referenced: "${name}" "${id}"\n    actual:     not found`;
	}
	if (found.id !== id || found.name !== name) {
		return `    referenced: "${name}" "${id}"\n    actual:     "${found.name}" "${found.id}"`;
	}
	return null;
}

function log(message) {
	results.value = results.value == "" ? message : results.value + "\n" + message;
}

startButton.addEventListener("click", start);