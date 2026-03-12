import { notify } from "./core.js";

function bindMapSearch(input, button, onSearch) {
  if (button) {
    button.addEventListener("click", onSearch);
  }
  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSearch();
      }
    });
  }
}

function createMapController({
  mapElementId,
  latInputId,
  lngInputId,
  searchInputId,
  searchButtonId,
  onNotFound,
  onError,
}) {
  const element = document.getElementById(mapElementId);
  if (!element || typeof L === "undefined") return null;

  const defaultCenter = [12.8797, 121.774];
  const map = L.map(element).setView(defaultCenter, 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  const marker = L.marker(defaultCenter, { draggable: true }).addTo(map);

  function setHidden(latlng) {
    const latInput = document.getElementById(latInputId);
    const lngInput = document.getElementById(lngInputId);
    if (latInput && lngInput) {
      latInput.value = latlng.lat.toFixed(6);
      lngInput.value = latlng.lng.toFixed(6);
    }
  }

  function setLocation(lat, lng, zoom = 14) {
    const position = [lat, lng];
    map.setView(position, zoom);
    marker.setLatLng(position);
    setHidden({ lat, lng });
  }

  async function geocodeAndSet() {
    const input = document.getElementById(searchInputId);
    const query = (input?.value || "").trim();
    if (!query) return;

    try {
      const response = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
          encodeURIComponent(query),
        { headers: { "Accept-Language": "en" } }
      );
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) {
        onNotFound();
        return;
      }
      const { lat, lon } = data[0];
      setLocation(parseFloat(lat), parseFloat(lon));
    } catch {
      onError();
    }
  }

  marker.on("moveend", (event) => setHidden(event.target.getLatLng()));
  map.on("click", (event) => {
    marker.setLatLng(event.latlng);
    setHidden(event.latlng);
  });
  setHidden({ lat: defaultCenter[0], lng: defaultCenter[1] });

  bindMapSearch(
    document.getElementById(searchInputId),
    document.getElementById(searchButtonId),
    geocodeAndSet
  );

  return {
    invalidate() {
      map.invalidateSize();
    },
    setFromInputs() {
      const lat = parseFloat(document.getElementById(latInputId)?.value);
      const lng = parseFloat(document.getElementById(lngInputId)?.value);
      const hasPosition = !Number.isNaN(lat) && !Number.isNaN(lng);
      if (hasPosition) {
        setLocation(lat, lng);
        return;
      }
      map.setView(defaultCenter, 6);
      marker.setLatLng(defaultCenter);
    },
    syncSearchFrom(sourceInputSelector) {
      const source = document.querySelector(sourceInputSelector);
      const search = document.getElementById(searchInputId);
      if (!source || !search) return;
      search.value = source.value || "";
      source.addEventListener("input", () => {
        search.value = source.value;
      });
    },
  };
}

export function initMaps() {
  const createMap = createMapController({
    mapElementId: "mapCreate",
    latInputId: "latCreate",
    lngInputId: "lngCreate",
    searchInputId: "mapCreateSearch",
    searchButtonId: "mapCreateFind",
    onNotFound: () => notify("Location not found"),
    onError: () => notify("Search failed"),
  });

  createMap?.syncSearchFrom('input[name="location"]');

  const editMap = createMapController({
    mapElementId: "mapEdit",
    latInputId: "eLat",
    lngInputId: "eLng",
    searchInputId: "mapEditSearch",
    searchButtonId: "mapEditFind",
    onNotFound: () => alert("Location not found"),
    onError: () => alert("Search failed"),
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      createMap?.invalidate();
      editMap?.invalidate();
    }, 120);
  });

  return {
    showCreate() {
      setTimeout(() => createMap?.invalidate(), 80);
    },
    showEdit() {
      setTimeout(() => {
        editMap?.invalidate();
        editMap?.setFromInputs();
      }, 80);
    },
  };
}
