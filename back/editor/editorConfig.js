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
	"강의실,세미나실,멀티실": "#289D8F",
	"실습실": "#289D8F",
	"동아리실": "#289D8F",

	"편의점,플라타너스,복사실,서점,식당": "#F4A261",
	"휴게실,회의실,스터디룸,원우회실": "#F4A261",

	"행정실,사무실,센터": "#E8C46A",
	"열람실,자료실,서고": "#E8C46A",
	"학회실,의원회실,학과회실": "#E8C46A",

	"계단,엘베,입구": "#FFFFFF",

	"화장실": "#F4A261",

	"총장실,비서실,이사장실,임원회의실": "#284553",
	"경비실,전기실,기계실,관리자구역": "#284553"
};