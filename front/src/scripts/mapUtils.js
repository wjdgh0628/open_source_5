import mapboxgl from 'mapbox-gl';
import { idRules } from '@shared/rules.js';
import { getInfos as infos, getMap as Map } from '@shared/cache.js';
import { MC } from './mapConfig.js';
import { handleFloorClick } from './mapHandlers.js';

let popup = null;

function roomFillLayerId(fid) {
	return `${idRules.roomSid(fid)}_fill`;
}

function roomLabelLayerId(fid) {
	return `${idRules.roomSid(fid)}_label`;
}

function parseLngLat(value) {
	if (Array.isArray(value) && value.length === 2) return value;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed) && parsed.length === 2) return parsed;
		} catch {
			return null;
		}
	}
	return null;
}

/**카메라 이동 함수*/
export function flyCamera(mode, center, bearing = null, lvI = null) {
	const modeConfig = { ...MC.camera[mode] };
	if (bearing) modeConfig.bearing = bearing;
	// console.log(Map().getFreeCameraOptions());
	if (lvI != null) {
		Map().setCamera({ "camera-projection": "orthographic" });
		// Map().dragRotate.disable();
		// Map().touchZoomRotate.disableRotation();
	}
	else {
		Map().setCamera({ "camera-projection": "perspective" });
		// Map().dragRotate.enable();
		// Map().touchZoomRotate.enableRotation();
	}
	Map().flyTo({ center, ...modeConfig, essential: true });
}

/**폴리곤 무게중심 계산 함수*/
function calCenter(polygon) {
	const pts = polygon[0];
	let minX = pts[0][0], maxX = pts[0][0];
	let minY = pts[0][1], maxY = pts[0][1];

	for (let i = 1; i < pts.length; i++) {
		const x = pts[i][0];
		const y = pts[i][1];
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}

	return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/**데이터 배열 받아서 층이나 방 만드는 함수*/
function setLayers(sourceId, features) {
	if (Map().getSource(sourceId)) {
		console.log(`source id: ${sourceId}가 이미 존재`);
		return;
	}
	Map().addSource(sourceId, {
		type: "geojson",
		data: ({
			type: "FeatureCollection",
			features: features
		})
	});
	features.forEach((f, i) => {
		const layerId = f.properties.layerId;
		Map().addLayer({
			id: layerId,
			type: "fill-extrusion",
			source: sourceId,
			filter: ["==", ["get", "layerId"], layerId],
			paint: {
				"fill-extrusion-color": ["get", "color"],
				"fill-extrusion-base": ["get", "base"],
				"fill-extrusion-height": ["get", "height"],
				"fill-extrusion-opacity": 1
			}
		});
		if (f.properties.name) { //이름이 없으면 라벨 생성 안함
			Map().addLayer({
				id: idRules.lid(layerId),
				type: 'symbol',
				source: sourceId,
				filter: ["==", ["get", "layerId"], layerId],
				layout: {
					'text-field': ["get", "name"],
					'text-size': 14,
					'text-anchor': ["get", "anchor"],
					'text-allow-overlap': true,
					'symbol-placement': 'point',
					'symbol-z-order': "source"
				},
				paint: {
					'symbol-z-offset': f.properties.base,
					'text-color': '#000000',
					'text-halo-color': '#ffffff',
					'text-halo-width': 2
				}
			});
		}
		if (f.properties.popup) { //팝업 정보가 있으면 팝업 레이어 생성

			Map().on('mouseenter', layerId, (e) => {
				// console.log('mouseenter');
				const isPerspective = Map().getCamera()["camera-projection"] == "perspective";
				const isPitched = Map().getPitch() != 0;
				if (!popup) {
					popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, closeOnMove: true })
						.setLngLat(f.properties.center)
						.setAltitude(isPerspective || isPitched ? f.properties.base + MC.layerProps.roomThickness : 0)
						.setHTML(f.properties.popup)
						.setMaxWidth("300px")
						.addTo(Map());
				}
				else {
					popup.setLngLat(f.properties.center)
						.setHTML(f.properties.popup)
						.setAltitude(isPerspective || isPitched ? f.properties.base + MC.layerProps.roomThickness : 0)
						.addTo(Map());
				}
			});
			Map().on('mouseleave', layerId, (e) => {
				// console.log("mouseleave");
				const intoPopup = e.originalEvent.relatedTarget?.classList.contains('mapboxgl-popup-content');
				if (popup && !intoPopup) {
					popup.remove();
					popup = null;
				}
			});
		}
		// console.log(CONFIG.idRules.lid(layerId));
	});
}
/**핸들러 적용 함수*/
export function setHandler(type, id, callback) {
	const handler = e => {
		const features = Map().queryRenderedFeatures(e.point);
		if (!features.length) { return; }

		const topFeature = features[0];// z-index 개념은 없지만, queryRenderedFeatures의 배열은 위에서부터 순서대로 정렬됨
		const cur = e.features[0]; // 이 레이어 핸들러에 전달된 피처

		// feature.id가 있다면 id까지 비교 (없으면 layer.id만 비교)
		const isTop = (topFeature.layer.id === id) && (topFeature.id == null || topFeature.id === cur.id);

		// 원하는 이벤트를 topFeature 하나에만 적용
		if (isTop) { callback(topFeature); }
	};
	Map().on(type, id, (e) => handler(e));
}

/**레이어 보이기/숨기기*/
export function showLayer(id) {
	Map().getLayer(id) && Map().setLayoutProperty(id, "visibility", "visible");
	Map().getLayer(idRules.lid(id)) && Map().setLayoutProperty(idRules.lid(id), "visibility", "visible");
}
export function hideLayer(id) {
	Map().getLayer(id) && Map().setLayoutProperty(id, "visibility", "none");
	Map().getLayer(idRules.lid(id)) && Map().setLayoutProperty(idRules.lid(id), "visibility", "none");
}
/**특정 건물의 층들 숨기기*/
export async function hideFloorsByBid(bid) {
	const lvCount = (infos()[bid].rooms.length);
	allFloors(lvCount, bid, (fid, lvI) => {
		hideLayer(fid);
		hideAllRooms(bid, lvI);
	});
}
/**전체 건물들 층 숨기기*/
/* async function hideAllFloors(map) {
	const bidList = Object.keys(await reqBasicInfos(urls));
	for (const bid of bidList) {
		await hideFloorsByBid( bid);
	}
} */
/**층 내 전체 방 숨기기*/
export async function hideAllRooms(bid, lvI) {
	const fid = idRules.fid(bid, lvI);
	hideLayer(idRules.clickedFloor(bid, lvI));
	hideLayer(roomFillLayerId(fid));
	hideLayer(roomLabelLayerId(fid));
}


/**건물 내 전체 층에 대해 콜백*/
function allFloors(lvCount, bid, cb) {
	for (let i = 0; i < lvCount; i++) {
		const fid = idRules.fid(bid, i);
		cb(fid, i);
	}
}
/**
 * 층 생성/보이기
 * info: bid, flList, flVars, flLevel, bmLevel
 */
export function setFloors(info) {
	const bid = info.bid;
	const lvCount = info.flLevel + info.bmLevel;
	if (Map().getSource(idRules.floorSid(bid))) {
		allFloors(lvCount, bid, (fid) => { showLayer(fid); });
	}
	else {
		generateFloors(info);
	}
}
/**
 * 방 생성/보이기
 * info: bid, flVars, flList
 */
export async function setRooms(bid, lvI, info) {
	const fid = idRules.fid(bid, lvI);
	if (Map().getSource(idRules.roomSid(fid))) {
		showLayer(idRules.clickedFloor(bid, lvI));
		showLayer(roomFillLayerId(fid));
		showLayer(roomLabelLayerId(fid));
	}
	else {
		generateRooms(info, fid, lvI);
	}
}
/**
 * 층 생성하는 함수
 * info: bid, flList, flVars,flLevel, bmLevel
 */
function generateFloors(info) {
	const bid = info.bid;
	const { floorThickness, floorGap } = MC.layerProps;

	//층 모양(폴리곤이랑 높이 등)이랑 각종 정보들 floorSpec에 저장
	let floorsSpec = [];
	info.flList.forEach((flVarNum, lvI) => {
		let fi = lvI - info.bmLevel;
		let bi = info.bmLevel - lvI;
		const base = lvI * (floorThickness + floorGap);
		const level = idRules.level(info.bmLevel, lvI);
		floorsSpec.push({
			type: "Feature",
			properties: {
				name: idRules.lvChar(info.bmLevel, lvI),
				base,
				height: base + floorThickness,
				// color: i >= info.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi - 1],
				color: MC.layerProps.gradation(lvI, info.bmLevel, info.flLevel),
				level: level,
				anchor: "left",
				// offset: info.offset,
				layerId: idRules.fid(bid, lvI)
			},
			geometry: { type: "Polygon", coordinates: info.flVars[flVarNum] }
		});
	});

	// floorSpec 기반으로 source로 저장
	setLayers(idRules.floorSid(bid), floorsSpec);
	// 핸들러 지정
	floorsSpec.forEach((f, i) => {
		const fid = f.properties.layerId;
		setHandler("click", fid, e => handleFloorClick(fid, i, info));
	});
}
/**
 * 방 생성하는 함수
 * info: bid, flVars, flList
 */
async function generateRooms(info, fid, lvI) {
	const bid = info.bid;
	const { floorThickness, floorGap, baseThickness, roomThickness } = MC.layerProps;
	const base = (lvI * (floorThickness + floorGap));
	const rooms = infos()[bid].rooms[lvI];
	let roomsSpec = [];

	roomsSpec.push({
		type: "Feature",
		properties: {
			isBase: true,
			base: base,
			height: base + baseThickness,
			color: MC.layerProps.clickedFloorColor,
			layerId: idRules.clickedFloor(bid, lvI),
			anchor: "center"
		},
		geometry: { type: "Polygon", coordinates: info.flVars[info.flList[lvI]] }
	});
	rooms.forEach((room, i) => {
		roomsSpec.push({
			type: "Feature",
			properties: {
				isBase: false,
				name: room.name,
				base: base + baseThickness,
				height: base + baseThickness + roomThickness,
				color: room.color ? room.color : "#0088ff",
				anchor: "bottom",
				layerId: idRules.rid(bid, lvI, i),
				popup: room.desc ? room.desc : "상세설명 없음",
				center: calCenter(room.polygon)
			},
			geometry: { type: "Polygon", coordinates: room.polygon }
		});
	});

	const sourceId = idRules.roomSid(fid);
	Map().addSource(sourceId, {
		type: "geojson",
		data: ({
			type: "FeatureCollection",
			features: roomsSpec
		})
	});

	Map().addLayer({
		id: idRules.clickedFloor(bid, lvI),
		type: "fill-extrusion",
		source: sourceId,
		filter: ["==", ["get", "isBase"], true],
		paint: {
			"fill-extrusion-color": ["get", "color"],
			"fill-extrusion-base": ["get", "base"],
			"fill-extrusion-height": ["get", "height"],
			"fill-extrusion-opacity": 1
		}
	});

	Map().addLayer({
		id: roomFillLayerId(fid),
		type: "fill-extrusion",
		source: sourceId,
		filter: ["==", ["get", "isBase"], false],
		paint: {
			"fill-extrusion-color": ["get", "color"],
			"fill-extrusion-base": ["get", "base"],
			"fill-extrusion-height": ["get", "height"],
			"fill-extrusion-opacity": 1
		}
	});

	Map().addLayer({
		id: roomLabelLayerId(fid),
		type: 'symbol',
		source: sourceId,
		filter: [
			"all",
			["==", ["get", "isBase"], false],
			["has", "name"]
		],
		layout: {
			'text-field': ["get", "name"],
			'text-size': 14,
			'text-anchor': ["get", "anchor"],
			'text-allow-overlap': true,
			'symbol-placement': 'point',
			'symbol-z-order': "source"
		},
		paint: {
			'symbol-z-offset': ["get", "height"],
			'text-color': '#000000',
			'text-halo-color': '#ffffff',
			'text-halo-width': 2
		}
	});

	Map().on('mouseenter', roomFillLayerId(fid), () => {
		Map().getCanvas().style.cursor = "pointer";
	});
	Map().on('mousemove', roomFillLayerId(fid), (e) => {
		const feature = e.features?.[0];
		if (!feature) return;
		const isPerspective = Map().getCamera()["camera-projection"] == "perspective";
		const isPitched = Map().getPitch() != 0;
		const center = parseLngLat(feature.properties?.center);
		const html = feature.properties?.popup;
		const baseVal = Number(feature.properties?.base ?? 0);
		if (!center || !html) return;

		if (!popup) {
			popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, closeOnMove: true })
				.setMaxWidth("300px");
		}
		popup
			.setLngLat(center)
			.setHTML(html)
			.setAltitude(isPerspective || isPitched ? baseVal + MC.layerProps.roomThickness : 0)
			.addTo(Map());
	});
	Map().on('mouseleave', roomFillLayerId(fid), (e) => {
		Map().getCanvas().style.cursor = "";
		const intoPopup = e.originalEvent.relatedTarget?.classList.contains('mapboxgl-popup-content');
		if (popup && !intoPopup) {
			popup.remove();
			popup = null;
		}
	});
}
