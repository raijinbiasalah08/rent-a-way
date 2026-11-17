import { CRS } from "leaflet";
import { Pane, Polygon, TileLayer } from "react-leaflet";
import boundary from "../utils/roxasBoundary.json";
import { ROXAS_BOUNDS } from "../utils/roxasLocation";

// Cover the surrounding map, including search-radius overlays, up to the pins.
const outline = boundary.coordinates[0].map(([lng, lat]) => [lat, lng]);
const mask = [
  [[5, 115], [20, 115], [20, 130], [5, 130]],
  outline,
];

// Clip each tile before display so a fast drag cannot expose a neighboring
// municipality while Leaflet redraws the vector mask.
const tileEvents = {
  tileloadstart({ tile, coords, target }) {
    const size = target.getTileSize();
    const points = outline.map((latlng) => {
      const point = CRS.EPSG3857.latLngToPoint({ lat: latlng[0], lng: latlng[1] }, coords.z);
      return `${point.x - coords.x * size.x}px ${point.y - coords.y * size.y}px`;
    });
    tile.style.clipPath = `polygon(${points.join(",")})`;
  },
};

export default function RoxasBasemap() {
  return (
    <>
      <TileLayer
        eventHandlers={tileEvents}
        bounds={ROXAS_BOUNDS}
        noWrap
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundary: NAMRIA/PSA via <a href="https://github.com/faeldon/philippines-json-maps">Philippine JSON Maps</a>'
      />
      <Pane name="roxas-boundary-mask" style={{ zIndex: 450, pointerEvents: "none" }}>
        <Polygon
          positions={mask}
          smoothFactor={0}
          interactive={false}
          pathOptions={{ stroke: false, fillColor: "#f1f5f9", fillOpacity: 1, fillRule: "evenodd" }}
        />
      </Pane>
    </>
  );
}
