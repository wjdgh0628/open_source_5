import { useEffect, useState, useRef } from 'react';
import { setApiUrl } from '@shared/rules.js';
import { setInfos } from '@shared/cache.js';
import { fetchBuildingsInfo } from '@shared/fetchData.js';

import './App.css';
import Map from './map/Map.jsx';
import SideBar from './sidebar/SideBar.jsx';
const API_BASE = import.meta.env.VITE_API_BASE;
export function App() {
	const [urls, setUrls] = useState(setApiUrl(API_BASE));
	const [stInfo, setStInfo] = useState(null);

	useEffect(() => {
		(async () => {
			const bInfo = await fetchBuildingsInfo(urls.buildingsUrl, urls.roomsUrl);
			setInfos(bInfo);
			setStInfo(bInfo);
			console.log("건물 정보 로드 완료", bInfo);
		})();
	}, [urls]);

	return (
		<>
			<Map urls={urls} />
			<SideBar infos={stInfo} />
		</>
	);
}