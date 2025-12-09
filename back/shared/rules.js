export const idRules = {
	buildings: "campus-3d",
	fid: (bid, lvI) => { return `${bid}_${lvI}`; },
	floorSid: (bid) => { return `${bid}_floors`; },
	rid: (bid, lvI, index) => { return `${bid}_${lvI}_${index}`; },
	roomSid: (fid) => { return `${fid}_rooms`; },
	clickedFloor: (bid, lvI) => { return `${bid}_${lvI}_base`; },
	lid: (pid) => { return `${pid}_label`; },
	level: (bmLevel, lvI) => { return lvI >= bmLevel ? (lvI - bmLevel) + 1 : (bmLevel - lvI) * -1; },
	lvChar: (bmLevel, lvI) => { return lvI >= bmLevel ? `${lvI - bmLevel + 1}F` : `B${bmLevel - lvI}`; },
	lvI: (bmLevel, level) => { return level < 0 ? level + bmLevel : level + bmLevel - 1; }
};
export const jsonProp = {
	id: "@id",
	name: "name",
	center: "center",
	bearing: "bearing",
	floorBearing: "floorBearing",
	floors: "floors",
	flProps: {
		flLevel: "flLevel",
		bmLevel: "bmLevel",
		flList: "flList",
		flVars: "flVars"
	}
};

export const PORT = 4000;
export const server = `http://localhost:${PORT}`;

export const setApiUrl = (base) => (
	{
		roomsUrl: base + "api/json/rooms",
		buildingsUrl: base + "api/json/buildings",
	}
);