import { SC } from './serverConfig.js';
import { jsonProp } from '../../../shared/rules.js';
import fs from 'fs';

function fetchBuildings() {
	return JSON.parse(fs.readFileSync(SC.buildings, 'utf-8'));
}
function fetchBuildingByBid(bid) {
	const data = fetchBuildings();

	const feature = data.features.find(f => f.properties[jsonProp.id] === bid);
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
	const [pOpt, fOpt, gOpt] = opt.map(o => ({ ...o }));

	for(const key in pOpt){
		const propKey = pOpt[key];
		pOpt[key] = prop[propKey];
	}
	for(const key in fOpt){
		const propKey = fOpt[key];
		fOpt[key] = foors[propKey];
	}
	for(const key in gOpt){
		const propKey = gOpt[key];
		gOpt[key] = geo[propKey];
	}
	
	return {...pOpt, ...fOpt, ...gOpt};
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
		const id = feature.properties[jsonProp.id]; // "@id" 같은 키
		if (bidSet.has(id)) {
			features[id] = (filterBuilidingProps(feature, opt));
		}
	});
	return features;
}

export function fetchAllRooms() {
	return JSON.parse(fs.readFileSync(SC.rooms, 'utf-8'));
}
export function fetchRoomsByLvI(bid, lvI) {
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