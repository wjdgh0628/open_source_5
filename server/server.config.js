import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const PORT = 4000;
export const baseUrl = `http://localhost:${PORT}`;
export const SC = {
    rooms:  __dirname + "/data/rooms.json",
    roomsUrl:  baseUrl + "/api/rooms",
    config:  __dirname + "/server.config.js",
    configUrl:  baseUrl + "/api/config",
    buildings:  __dirname + "/data/buildings.geojson",
    buildingsUrl:  baseUrl + "/api/buildings",

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
    idRules: {
        buildings: "campus-3d",
        fid: (bid, level) => { return `${bid}_${level}` },
        floorSid: (bid) => { return `${bid}_floors` },
        rid: (bid, level, index) => { return `${bid}_${level}0${index}` },
        roomSid: (fid) => {return `${fid}_rooms`},
        clickedFloor: (bid, level) => { return `${bid}_${level}_base` },
        lid: (pid) => { return `${pid}_label` },
        level: (bmLevel, lvI) => {return lvI >= bmLevel ? (lvI - bmLevel) + 1 : (bmLevel - lvI) * -1;},
        lvI: (bmLevel, level) => {return level < 0 ? level + bmLevel : level + bmLevel - 1;}
    }
};