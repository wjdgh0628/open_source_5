import {useState} from 'react';

import './App.css';

import Map from './Map.jsx';
import SideBar from './sidebar/SideBar.jsx';

export function App() {
	const [map, setMap] = useState(null);

	return (
		<>
			<Map onMapInit={setMap} />
			<SideBar map={map} />
		</>
	);
}