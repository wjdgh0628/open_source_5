export const EC = {};

// draw.js: 좌표 변환, 폴리곤 그리기/히트테스트 모듈

export const COORD_DECIMALS = 8;
export const EARTH_RADIUS = 6378137;
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

// Local reference point (lon, lat) to keep world coordinates small and Mapbox-like
export const REF_LON = 126.95336;
export const REF_LAT = 37.34524;
export const REF_LAMBDA = REF_LON * DEG2RAD;
export const REF_PHI = REF_LAT * DEG2RAD;
export const REF_MX = EARTH_RADIUS * REF_LAMBDA;
export const REF_MY = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + REF_PHI / 2));
export const PALETTE = {
	"강의실-호수": "#bedceb",
	"실습실-호수": "#bedceb",
	"교수실, 교수연구실-호수":"#00ff11",

	"연구실": "#007aff",
	"기계실 등 설비실-이름":"#01061e",
	"회의실-이름":"#007aff",
	"학회실,학생회관-이름":"#007aff",
	"행정실-이름":"#dce1e6",
	"매점-이름":"#a8d57c",
	"동아리실-이름":"#6200ea",
	"열람실, 스터디룸-이름":"#007aff",
	"자료실-이름":"#007aff",
	"창고-이름":"#a0785a",

	"건물별 특수실-이름":"#007aff",
	"학생지원 등 센터-이름":"#007aff",
	"노조-이름":"#007aff",

	"계단, 엘리베이터-이름":"#afb9c3",
	"화장실-이름":"#ecc5ca",
};