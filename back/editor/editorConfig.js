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