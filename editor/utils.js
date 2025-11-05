export const CONFIG = {
    map: {
        center: [126.95336, 37.34524],
        zoom: 16,
        style: "mapbox://styles/mapbox/streets-v12"
    },
    camera: {
        building: "around",
        floor: "above",
        around: { zoom: 18, pitch: 60, bearing: -45, speed: 0.8, curve: 1.25 },
        above: { zoom: 19, pitch: 0, speed: 0.4 }
    },
    buildingDefaults: {
        floorThickness: 1,
        floorGap: 7,
        colorPalette: ["#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00", "#ccff00", "#88ff00", "#44ff00", "#00ff00", "#00ff44", "#00ff88", "#00ffcc", "#00ffff", "#00ccff", "#0088ff", "#0044ff", "#0000ff"],
        // basementPalette: ["#4400ff", "#8800ff", "#cc00ff", "#ff00ff"]
        basementPalette: ["#ff00ff", "#cc00ff", "#8800ff", "#4400ff"]
    },
    defaultFloorCount: 3,
    campus: {
        geojsonUrl: "./buildings.geojson",
        idProp: "@id",
        nameProp: "name",
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
    bgIdList: [
        "land",
        "poi",
        "road",
        "building"
    ]
};

export function generateFloors(map, info) {
    const bid = info.bid;
    const { floorThickness, floorGap, colorPalette, basementPalette } = CONFIG.buildingDefaults;

    //geojson에 저장된 층수랑 층 배열 길이가 같은지 검사
    if (info.bmLevel + info.flLevel != info.flList.length) {
        console.log(`층수 오류 | 지상:${info.bmLevel} + 지하:${info.flLevel}, 배열 길이${info.flList.length}`);
        return;
    }

    //
    let floorsSpec = []
    info.flList.forEach((flVarNum, i) => {
        let fi = i - info.bmLevel;
        let bi = i + (4 - info.bmLevel);
        const colorJump = parseInt(colorPalette.length / info.flLevel)
        const base = i * (floorThickness + floorGap);
        floorsSpec.push({
            type: "Feature",
            properties: {
                level: i,
                name: `${i + 1}F`,
                base,
                height: base + floorThickness,
                color: i >= info.bmLevel ? colorPalette[fi * colorJump] : basementPalette[bi]
            },
            geometry: { type: "Polygon", coordinates: [info.flVars[flVarNum]] }
        })
    })

    //층 모양(폴리곤이랑 높이 등) source로 저장
    let sourceId = `${bid}-floors`;
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            type: "geojson",
            data: ({
                type: "FeatureCollection",
                features: floorsSpec
            })
        });
    }

    //floorsSpec 각 항목마다 반복
    floorsSpec.forEach(flspec => {
        const properties = flspec.properties;
        const fid = `${bid}-${properties.level}`;
        //층 하나씩 생성
        map.addLayer({
            id: fid,
            type: "fill-extrusion",
            source: sourceId,
            filter: ["==", ["get", "level"], properties.level],
            paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-opacity": 1
            }
        });

        //클릭시 실행할 코드 지정
        // setHandler(map, fid, e => handleFloorClick(bid, fid, properties.level));
    });
}

async function generateBuildingList(map, favorites) {

    const favList = document.getElementById('favorites-list');
    const allList = document.getElementById('all-buildings-list');
    favList.innerHTML = '';
    allList.innerHTML = '';

    const nameKey = CONFIG.campus.nameProp;
    const idKey = CONFIG.campus.idProp;
    for (const bid of CONFIG.bidList) {
        const info = await searchBasicInfoByBid(bid);
        const name = info.name;
        if (!name || !bid) return;

        const isFavorited = favorites.includes(bid);

        const listItem = document.createElement('li');
        listItem.classList.add('building-list-item');

        const favButton = document.createElement('button');
        favButton.classList.add('favorite-btn');
        if (isFavorited) {
            favButton.textContent = '★';
            favButton.classList.add('favorited');
        } else {
            favButton.textContent = '☆';
        }

        // (수정) 클릭 시 DOM 조작 대신 toggleFavorite(bid)만 호출
        favButton.addEventListener('click', (e) => {
            e.stopPropagation();
            // toggleFavorite(bid);
            // rerenderLists(map);
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;

        nameSpan.addEventListener('click', () => {
            // handleBuildingListClick(map, bid);
        });

        listItem.appendChild(favButton);
        listItem.appendChild(nameSpan);

        if (isFavorited) {
            favList.appendChild(listItem);
        } else {
            // geojson 순서대로 추가되므로 순서가 보장됨
            allList.appendChild(listItem);
        }
    };
}

async function fetchBuildingByBid(bid) {
    let f = null;
    await fetch(CONFIG.campus.geojsonUrl)
        .then(response => response.json())
        .then(data => {
            const targetId = bid; // 원하는 @id 값
            const feature = data.features.find(f => f.properties["@id"] === targetId);

            if (feature) {
                f = feature;
            } else {
                console.log("해당 ID를 가진 객체가 없습니다.:", bid);
                f = false;
            }
        })
        .catch(err => { console.error("파일 불러오기 실패:", err); f = false; });
    return f;
}
//bid로 건물 정보 검색
export async function searchBasicInfoByBid(bid) {
    const f = await fetchBuildingByBid(bid);
    if (!f) return;

    return {
        bid: bid,
        properties: f.properties,
        name: f.properties?.["name"],
        coordinates: f.geometry.coordinates[0],
        center: f.properties?.["center"],
        bearing: f.properties?.["bearing"]
    };
}
export async function searchFloorInfoByBid(bid) {
    const f = await fetchBuildingByBid(bid);
    if (!f) return;
    const floors = f.properties?.["floors"];

    return {
        bid: bid,
        flLevel: floors?.["flLevel"],
        bmLevel: floors?.["bmLevel"],
        flList: floors?.["flList"],
        flVars: floors?.["flVars"]
    };
}

export function handleFloorClick(bid, fid, level) {

    console.log(`[${fid}] 층을 클릭했습니다. 모달을 엽니다.`);

    // 1. 모달 요소들을 가져옵니다.
    const modal = document.getElementById('modal-overlay');
    const modalInfo = document.getElementById('modal-floor-info');

    // --- ▼▼▼ 수정된 부분 시작 ▼▼▼ ---

    // 2. 이미지 경로를 설정합니다.
    let imgPath = '';


    //기본 규칙을 따릅니다. (예: main_0.png)
    imgPath = `./img/${bid}_${level}.png`;
    console.log(imgPath);

    // 3. 모달에 표시할 내용을 업데이트합니다.
    modalInfo.innerHTML =
        //<p><strong>건물 ID:</strong> ${bid}</p>
        //<p><strong>층 ID:</strong> ${fid}</p>
        //<p><strong>층 레벨:</strong> ${level}</p>
        `
            <img 
                src="${imgPath}" 
                alt="${bid} ${level}층 평면도" 
                onerror="this.style.display='none'; this.nextSibling.style.display='block';" 
            />
            <p style="display:none; color: #888; text-align: center;">
                (평면도 이미지를 찾을 수 없습니다.)
            </p>
        `;
    // --- ▲▲▲ 수정된 부분 끝 ▲▲▲ ---

    // 4. 모달을 보여줍니다.
    modal.classList.remove('hidden');
}