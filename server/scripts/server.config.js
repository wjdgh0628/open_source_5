import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __scriptsname = path.dirname(__filename);
export const __dirname = path.dirname(__scriptsname);
export const PORT = 4000;
export const baseUrl = `http://localhost:${PORT}`;
export const SC = {
	config: __dirname + "/scripts/server.config.js",
	rooms: __dirname + "/data/rooms.json",
	buildings: __dirname + "/data/buildings.geojson",
	configUrl: baseUrl + "/api/config",
	roomsUrl: baseUrl + "/api/json/rooms",
	buildingsUrl: baseUrl + "/api/json/buildings",
	reqRooms: baseUrl + "/api/request/rooms",
	reqBuildings: baseUrl + "/api/request/buildings",

	jsonProp: {
		id: "@id",
		name: "name",
	},
	bidList: [
		"main",
		"grad",
		"design",
		"gemi",
		"music",
		"rodem",
		"visionCentre",
		"stem",
		"council",
		"theology",
		"vision"
	],
	roomList: {
		main: [[],[],[],[],[],[],[],[],[],[]],
		grad: [[],[],[],[],[],[],[]],
		design: [[],[],[],[],[],[],[]],
		gemi: [[],[],[],[],[],[]],
		music: [[],[],[],[],[],[],[]],
		rodem: [[],[]],
		visionCentre: [[],[],[],[],[],[],[],[],[],[]],
		stem: [[],[],[],[]],
		council: [[],[],[],[]],
		theology: [[],[],[],[],[],[]],
		vision: [[],[],[],[],[],[]]
	}
};
export const idRules = {
	buildings: "campus-3d",
	fid: (bid, lvI) => { return `${bid}_${lvI}`; },
	floorSid: (bid) => { return `${bid}_floors`; },
	rid: (bid, lvI, index) => { return `${bid}_${lvI}_${index}`; },
	roomSid: (fid) => { return `${fid}_rooms`; },
	clickedFloor: (bid, lvI) => { return `${bid}_${lvI}_base`; },
	lid: (pid) => { return `${pid}_label`; },
	level: (bmLevel, lvI) => { return lvI >= bmLevel ? (lvI - bmLevel) + 1 : (bmLevel - lvI) * -1; },
	lvI: (bmLevel, level) => { return level < 0 ? level + bmLevel : level + bmLevel - 1; }
};