export const EC = {
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
}
const res = await fetch("../api/config");
export const SC  = await res.json();