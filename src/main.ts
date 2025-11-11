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
const NEIGHBORHOOD_SIZE = 4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MOVE_DEGREES = TILE_DEGREES;

interface Pair {
  i: number;
  j: number;
}

const player: Pair = {
  i: CLASSROOM_LATLNG.lat,
  j: CLASSROOM_LATLNG.lng,
};

//const cells: Pair[];

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

function spawnCache(i: number, j: number) {
  const origin = CLASSROOM_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  let cellValue =
    Math.floor(luck([i, j, "initialValue"].toString()) * 100) % 10 + 1;

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    let combine = (cellValue == playerValue) && (cellValue > 0);

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

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

function updatePlayerMarker() {
  const latlng = leaflet.latLng(player.i, player.j);
  playerMarker.setLatLng(latlng);
  map.panTo(latlng);
}

globalThis.addEventListener("keydown", (e: KeyboardEvent) => {
  let handled = true;
  switch (e.key) {
    case "ArrowUp":
      player.i += MOVE_DEGREES;
      break;
    case "ArrowDown":
      player.i -= MOVE_DEGREES;
      break;
    case "ArrowLeft":
    case "a":
      player.j -= MOVE_DEGREES;
      break;
    case "ArrowRight":
      player.j += MOVE_DEGREES;
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
