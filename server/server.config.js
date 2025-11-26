import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SC = {
    rooms:  __dirname + "/data/rooms.json",
    buildings:  __dirname + "/data/buildings.geojson"
}
export default SC;