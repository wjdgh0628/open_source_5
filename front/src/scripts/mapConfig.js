export const MC = {
	map: {
		center: [126.95336, 37.34524],
		zoom: 17,
		style: "mapbox://styles/mapbox/streets-v12",
		maxBounds: [
			[
              126.94885855342051,
              37.34010026501433
            ],
			[
              126.95850903964549,
              37.349584812158525
            ]
		],
		key: "pk.eyJ1IjoibGF6eWRldjEwMjQiLCJhIjoiY21mdW91NnNyMTVkZDJtcHd4dHNtNHU0ayJ9.mLzbdcCPq_-BeA8DlHu1KA"
	},
	camera: {
		building: "around",
		floor: "above",
		room: "above2",
		around: { zoom: 18, pitch: 60, bearing: -45, speed: 0.8, curve: 1.25 },
		above: { zoom: 19.9, pitch: 0, speed: 0.4 },
		above2: { zoom: 19.9, pitch: 0, speed: 0.6 },
		floorZoomStep: 0.07
	},
	layerProps: {
		floorThickness: 3,
		baseThickness: 1,
		roomThickness: 2,
		floorGap: 3,
		levelThick: 6,
		clickedFloorColor: "#888888",
		defaultFloorCount: 3,
		taseTheRainbow: (i, fi, bi, bmLevel, flLevel) => {
			const colorPalette = ["#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00", "#ccff00", "#88ff00", "#44ff00", "#00ff00", "#00ff44", "#00ff88", "#00ffcc", "#00ffff", "#00ccff", "#0088ff", "#0044ff", "#0000ff"];
			const basementPalette = ["#4400ff", "#8800ff", "#cc00ff", "#ff00ff"];
			const colorJump = parseInt(colorPalette.length / flLevel);
			return i >= bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi - 1];
		},
		oreoCake: (i, fi, bmLevel) => {
			return i >= bmLevel ? fi % 2 == 0 ? "#FFFFFF" : "#000000" : "#4400FF";
		}
		// basementPalette: ["#ff00ff", "#cc00ff", "#8800ff", "#4400ff"]
	},
	bgIdList: [
		"land",
		"poi",
		"road",
		"building"
	]
};

export const req = [
	{
		bid: "@id",
		center: "center",
		bearing: "bearing",
		floorBearing: "floorBearing"
	},
	{
		flList: "flList",
		flVars: "flVars",
		flLevel: "flLevel",
		bmLevel: "bmLevel"
	}, {}
];

export const current = {
	mode: 0,
	bid: null,
	lvI: null
};