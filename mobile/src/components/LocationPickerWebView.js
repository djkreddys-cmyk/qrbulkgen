import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";

function buildOsmUrl(latitude, longitude) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

function buildHtml(initialValue) {
  const initialState = JSON.stringify(initialValue || {});
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body { margin: 0; padding: 0; background: #f8fafc; font-family: Arial, sans-serif; }
        #shell { padding: 12px; }
        #search { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; }
        #results { margin-top: 8px; border: 1px solid #dbe3f0; border-radius: 12px; overflow: hidden; background: #fff; max-height: 160px; overflow-y: auto; display: none; }
        .result { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 0; border-bottom: 1px solid #eef2f7; text-align: left; background: #fff; font-size: 13px; color: #334155; }
        #map { width: 100%; height: 280px; border: 1px solid #dbe3f0; border-radius: 16px; overflow: hidden; margin-top: 12px; }
        #note { font-size: 12px; color: #64748b; margin-top: 10px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div id="shell">
        <input id="search" placeholder="Search places" />
        <div id="results"></div>
        <div id="map"></div>
        <div id="note">Search a place or tap the map to auto-fill the location QR fields.</div>
      </div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const initialValue = ${initialState};
        const DEFAULT_CENTER = [17.385, 78.4867];
        const searchInput = document.getElementById("search");
        const resultsEl = document.getElementById("results");
        let searchTimeout = null;
        let map;
        let marker;

        function buildOsmUrl(latitude, longitude) {
          return "${buildOsmUrl("__LAT__", "__LON__")}".replace("__LAT__", latitude).replace("__LON__", longitude);
        }

        function sendSelection(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function renderResults(items) {
          if (!items.length) {
            resultsEl.style.display = "none";
            resultsEl.innerHTML = "";
            return;
          }

          resultsEl.innerHTML = items.map((item, index) =>
            '<button class="result" data-index="' + index + '">' + item.display_name + '</button>'
          ).join("");
          resultsEl.style.display = "block";

          Array.from(resultsEl.querySelectorAll(".result")).forEach((node) => {
            node.addEventListener("click", () => {
              const item = items[Number(node.dataset.index)];
              const latitude = Number(item.lat).toFixed(6);
              const longitude = Number(item.lon).toFixed(6);
              marker.setLatLng([latitude, longitude]).setOpacity(1);
              map.setView([latitude, longitude], 16);
              searchInput.value = item.display_name || "";
              renderResults([]);
              sendSelection({
                locationName: item.name || (item.display_name || "").split(",")[0] || "Selected place",
                locationAddress: item.display_name || "",
                mapsUrl: buildOsmUrl(latitude, longitude),
                latitude: String(latitude),
                longitude: String(longitude),
              });
            });
          });
        }

        async function searchPlaces(query) {
          const response = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=" + encodeURIComponent(query), {
            headers: { Accept: "application/json" }
          });
          if (!response.ok) throw new Error("Search failed");
          return response.json();
        }

        async function reverseLookup(latitude, longitude) {
          const response = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + encodeURIComponent(latitude) + "&lon=" + encodeURIComponent(longitude), {
            headers: { Accept: "application/json" }
          });
          if (!response.ok) throw new Error("Reverse lookup failed");
          return response.json();
        }

        function initMap() {
          const lat = Number(initialValue.latitude) || DEFAULT_CENTER[0];
          const lng = Number(initialValue.longitude) || DEFAULT_CENTER[1];
          map = L.map("map").setView([lat, lng], initialValue.latitude && initialValue.longitude ? 15 : 11);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map);

          marker = L.marker([lat, lng], {
            opacity: initialValue.latitude && initialValue.longitude ? 1 : 0,
          }).addTo(map);

          map.on("click", async (event) => {
            const latitude = Number(event.latlng.lat).toFixed(6);
            const longitude = Number(event.latlng.lng).toFixed(6);
            marker.setLatLng([latitude, longitude]).setOpacity(1);
            map.setView([latitude, longitude], 16);

            try {
              const result = await reverseLookup(latitude, longitude);
              sendSelection({
                locationName: result.name || (result.address && (result.address.amenity || result.address.building || result.address.road)) || "Pinned location",
                locationAddress: result.display_name || "",
                mapsUrl: buildOsmUrl(latitude, longitude),
                latitude: String(latitude),
                longitude: String(longitude),
              });
            } catch (_error) {
              sendSelection({
                locationName: initialValue.locationName || "Pinned location",
                locationAddress: initialValue.locationAddress || "",
                mapsUrl: buildOsmUrl(latitude, longitude),
                latitude: String(latitude),
                longitude: String(longitude),
              });
            }
          });
        }

        searchInput.value = initialValue.locationName || initialValue.locationAddress || "";
        searchInput.addEventListener("input", () => {
          const query = searchInput.value.trim();
          if (searchTimeout) clearTimeout(searchTimeout);
          if (query.length < 3) {
            renderResults([]);
            return;
          }
          searchTimeout = setTimeout(async () => {
            try {
              const items = await searchPlaces(query);
              renderResults(Array.isArray(items) ? items : []);
            } catch (_error) {
              renderResults([]);
            }
          }, 350);
        });

        initMap();
      </script>
    </body>
  </html>`;
}

export default function LocationPickerWebView({ value, onSelect }) {
  const source = useMemo(() => ({ html: buildHtml(value) }), [value]);

  return (
    <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 18, overflow: "hidden" }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Interactive Location Picker</Text>
        <Text style={{ color: "#64748b", marginTop: 6, fontSize: 12, lineHeight: 18 }}>
          Search a place or tap the map to auto-fill the location QR fields.
        </Text>
      </View>
      <WebView
        source={source}
        style={{ height: 360 }}
        originWhitelist={["*"]}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data || "{}");
            onSelect?.(payload);
          } catch (_error) {
            // ignore malformed events from the webview
          }
        }}
      />
    </View>
  );
}
