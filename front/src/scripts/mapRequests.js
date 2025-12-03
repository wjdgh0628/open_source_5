import { setApiUrl } from '@shared/rules.js';

const url = setApiUrl(__API_BASE__);
export const basicInfos = await reqBasicInfos();
export async function reqBasicInfos() {
	return await (await fetch(url.bInfoUrl)).json();
}

export async function reqBuildingByBid(bid, opt) {
	const req = {
		method: 'POST',
  		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			bid: bid,
			opt: opt
		})
	};
	return await fetch(url.reqBuildings, req)
		.then(response => response.json())
		.then(data => {
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}
export async function reqBuildingsInfo(bids, opt) {
	const req = {
		method: 'POST',
  		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			bids: bids,
			opt: opt
		})
	};
	return await fetch(url.reqBuildings, req)
		.then(response => response.json())
		.then(data => {
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}
export async function reqRoomsByLvI(bid, lvI) {
	const req = {
		method: 'POST',
  		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			bid: bid,
			lvI: lvI
		})
	};
	return await fetch(url.reqRooms, req)
		.then(response => response.json())
		.then(data => {
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}