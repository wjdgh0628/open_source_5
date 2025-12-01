import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __scriptsname = path.dirname(__filename);
export const __dirname = path.dirname(__scriptsname);
export const SC = {
	config: __dirname + "/scripts/server.config.js",
	rooms: __dirname + "/data/rooms.json",
	buildings: __dirname + "/data/buildings.geojson",
	
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
	]
};
export const basicInfos = {};
