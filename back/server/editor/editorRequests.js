import { url } from '../shared/rules.js';
export async function reqBasicInfos() {
	return await (await fetch(url.bInfoUrl)).json();
}

//geojson bid로 건물 데이터 요청
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
			// console.log(data);
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}
export async function reqBuildingsByBid(bidList, opt) {
	const req = {
		method: 'POST',
  		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			bids: bidList,
			opt: opt
		})
	};
	return await fetch(url.reqBuildings, req)
		.then(response => response.json())
		.then(data => {
			// console.log(data);
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
			// console.log(data);
			return data;
		})
		.catch(err => { console.error("파일 불러오기 실패:", err); return false; });
}