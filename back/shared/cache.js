let infos = {};
const infosListeners = new Set();

export function getInfos(bid = null) {
	if (bid)
		return infos[bid];
	else
		return infos;
}
export function setInfos(next) {
	infos = next;
	infosListeners.forEach((fn) => fn(next));
}
export function subInfos(fn) {
	infosListeners.add(fn);
	return () => infosListeners.delete(fn);
}

let current = {
	mode: 0,
	bid: null,
	lvI: null
};
const currentListeners = new Set();

export function getCurrent(bid = null) {
	if (bid)
		return current[bid];
	else
		return current;
}
export function setCurrent(cb) {
	const next = cb(current);
	current = next;
	currentListeners.forEach((fn) => fn(next));
}
export function subCurrent(fn) {
	currentListeners.add(fn);
	return () => currentListeners.delete(fn);
}

let map = null;

export function getMap() {
	// if (!map) throw new Error("Map is not initialized yet");
	return map;
}
export function setMap(instance) {
	map = instance;
}