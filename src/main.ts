import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 3;
const CELL_SPAWN_PROBABILITY = 0.1;
const MOVE_DEGREES = TILE_DEGREES;

let playerLat = CLASSROOM_LATLNG.lat;
let playerLng = CLASSROOM_LATLNG.lng;

interface SpawnDecision {
  key: string;
  willSpawn: boolean;
}

interface SpawnedCell {
  key: string;
  rect: leaflet.Rectangle;
}

const spawnDecisions: SpawnDecision[] = [];
const spawnedCells: SpawnedCell[] = [];

const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(CLASSROOM_LATLNG);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

let playerValue = 0;
statusPanelDiv.innerHTML = `Your token value: ${playerValue}`;

function spawnCellAtIndex(latIndex: number, lngIndex: number) {
  const bounds = leaflet.latLngBounds([
    [latIndex * TILE_DEGREES, lngIndex * TILE_DEGREES],
    [(latIndex + 1) * TILE_DEGREES, (lngIndex + 1) * TILE_DEGREES],
  ]);

  const key = `${latIndex},${lngIndex}`;
  let cellValue = 2;
  if (Math.floor(luck(`${key}:initialValue`) * 100) % 4 == 0) cellValue = 4;

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  spawnedCells.push({ key, rect });

  rect.bindPopup(() => {
    let combine = cellValue == playerValue && cellValue > 0;

    const popupDiv = document.createElement("div");
    popupDiv.innerHTML =
      `<div>This cell is carrying a token of <span id="value">${cellValue}</span> value.</div><button id="poke">swap</button>`;

    if (cellValue == 0) {
      popupDiv.querySelector<HTMLButtonElement>("#poke")!.innerHTML = "offer";
    }
    if (playerValue == 0) {
      popupDiv.querySelector<HTMLButtonElement>("#poke")!.innerHTML = "get";
    }
    if (combine) {
      popupDiv.querySelector<HTMLButtonElement>("#poke")!.innerHTML = "combine";
    }

    popupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        if (combine) {
          playerValue += cellValue;
          cellValue = 0;
          combine = false;
        } else {
          const temp = playerValue;
          playerValue = cellValue;
          cellValue = temp;
        }

        statusPanelDiv.innerHTML = `Your token value: ${playerValue}`;
        if (cellValue == 0) {
          popupDiv.querySelector<HTMLButtonElement>("#poke")!.innerHTML =
            "offer";
        }
        if (playerValue == 0) {
          popupDiv.querySelector<HTMLButtonElement>("#poke")!.innerHTML = "get";
        }
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cellValue
          .toString();
      });

    return popupDiv;
  });
}

function generateCells() {
  const centerX = Math.floor(playerLat / TILE_DEGREES);
  const centerY = Math.floor(playerLng / TILE_DEGREES);

  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      const key = `${centerX + i},${centerY + j}`;

      if (!spawnDecisions.some((d) => d.key === key)) {
        const willSpawn = luck(key) < CELL_SPAWN_PROBABILITY;
        spawnDecisions.push({ key, willSpawn });
      }

      const decision = spawnDecisions.find((d) => d.key === key);
      if (decision?.willSpawn && !spawnedCells.some((s) => s.key === key)) {
        spawnCellAtIndex(centerX + i, centerY + j);
      }
    }
  }

  for (let i = spawnedCells.length - 1; i >= 0; i--) {
    const entry = spawnedCells[i];
    const [xStr, yStr] = entry.key.split(",");

    if (
      Math.abs(Number(xStr) - centerX) >= NEIGHBORHOOD_SIZE ||
      Math.abs(Number(yStr) - centerY) >= NEIGHBORHOOD_SIZE
    ) {
      entry.rect.remove();
      spawnedCells.splice(i, 1);
    }
  }
}

function updatePlayerMarker() {
  const latlng = leaflet.latLng(playerLat, playerLng);
  playerMarker.setLatLng(latlng);
  map.panTo(latlng);
  generateCells();
}

globalThis.addEventListener("keydown", (e: KeyboardEvent) => {
  let handled = true;
  switch (e.key) {
    case "ArrowUp":
      playerLat += MOVE_DEGREES;
      break;
    case "ArrowDown":
      playerLat -= MOVE_DEGREES;
      break;
    case "ArrowLeft":
      playerLng -= MOVE_DEGREES;
      break;
    case "ArrowRight":
      playerLng += MOVE_DEGREES;
      break;
    default:
      handled = false;
  }

  if (handled) {
    e.preventDefault();
    updatePlayerMarker();
  }
});
updatePlayerMarker();
