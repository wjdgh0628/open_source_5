import { SC } from './server.config.js';
import fs from 'fs';

function fetchBuildings() {
	// console.log(fs.existsSync(SC.buildings));
	console.log(++fetched);
	return JSON.parse(fs.readFileSync(SC.buildings, 'utf-8'));
}
function fetchBuildingByBid(bid) {
	// console.log(fs.existsSync(SC.buildings));
	const data = fetchBuildings();

	const feature = data.features.find(f => f.properties[SC.jsonProp.id] === bid);
	if (feature){
		return feature;
	}
	else {
		console.log("해당 ID를 가진 객체가 없습니다.:", bid);
		return false;
	}
}
function filterBuilidingProps(feature, opt){
	const prop = feature.properties;
	const geo = feature.geometry;
	const foors = prop.floors;

	for(const key in opt[0]){
		const propKey = opt[0][key];
		opt[0][key] = prop[propKey];
	}
	for(const key in opt[1]){
		const propKey = opt[1][key];
		opt[1][key] = foors[propKey];
	}
	for(const key in opt[2]){
		const propKey = opt[2][key];
		opt[2][key] = geo[propKey];
	}
	
	return {...opt[0], ...opt[1], ...opt[2]};
}
export function fetchBuildingInfo(bid, opt){
	const feature = fetchBuildingByBid(bid);
	return filterBuilidingProps(feature, opt);
}
export function fetchBuildingsInfo(bids, opt) {
	if (!Array.isArray(bids)) {
		bids = [bids];          // 문자열 하나 들어와도 대응
	}

	const bidSet = new Set(bids);           // 빠른 포함 검사용
	const data = fetchBuildings().features; // 전체 feature
	const features = [];

	data.forEach(feature => {
		const id = feature.properties[SC.jsonProp.id]; // "@id" 같은 키
		if (bidSet.has(id)) {
			features.push(filterBuilidingProps(feature, opt));
		}
	});

	return features;
}

export function fetchAllRooms() {
	console.log(++fetched);
	// console.log(fs.existsSync(SC.buildings));
	return JSON.parse(fs.readFileSync(SC.rooms, 'utf-8'));
}
export function fetchRoomsByLvI(bid, lvI) {
	// console.log(fs.existsSync(SC.buildings));
	const data = fetchAllRooms();
	const rooms = data[bid][lvI];
	
	if (rooms){
		return rooms;
	}
	else {
		console.log("해당 lvI를 가진 객체가 없습니다.:", bid, lvI);
		return false;
	}
}

let fetched = 0;