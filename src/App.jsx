import {useState} from 'react';
import Map from './Map.jsx';
// import SideBar from './SideBar.jsx';
// import './App.css';

export function App() {
	const [map, setMap] = useState(null);

	return (
		<>
			<Map onMapInit={setMap} />
			{/* <SideBar map={map} /> */}
		</>
	);
}