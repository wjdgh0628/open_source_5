import { useEffect, useState } from 'react';
import { setApiUrl } from '@shared/rules.js';
import { fetchBuildingsInfo } from '@shared/fetchData.js';

import './App.css';
// import Map from './Map.jsx';
import SideBar from './sidebar/SideBar.jsx';

export function App() {
	const [map, setMap] = useState(null);
	const [buildingsInfo, setBuildingsInfo] = useState(null);
	const [urls, setUrls] = useState(setApiUrl(__API_BASE__));
	const [current, setCurrent] = useState({
		mapInstance: null,
		mode: 0,
		bid: null,
		lvI: null
	});

	useEffect(() => {
		(async () => {
			const bInfo = await fetchBuildingsInfo(urls.buildingsUrl, urls.roomsUrl);
			setBuildingsInfo(bInfo);
		})();
	}, []);

	return (
		<>
			{/* <Map onMapInit={setMap} /> */}
			<SideBar map={map} urls={urls} buildingsInfo={buildingsInfo} />
		</>
	);
}