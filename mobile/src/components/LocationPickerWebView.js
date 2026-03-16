import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function buildHtml(initialValue) {
  const initialState = JSON.stringify(initialValue || {});
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <style>
        html, body { margin: 0; padding: 0; background: #f8fafc; font-family: Arial, sans-serif; }
        #shell { padding: 12px; }
        #search { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 12px; margin-bottom: 12px; font-size: 14px; }
        #map { width: 100%; height: 280px; border: 1px solid #dbe3f0; border-radius: 16px; overflow: hidden; }
        #note { font-size: 12px; color: #64748b; margin-top: 10px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div id="shell">
        <input id="search" placeholder="Search places" />
        <div id="map"></div>
        <div id="note">Search a place or tap the map to auto-fill the location QR fields.</div>
      </div>
      <script>
        const initialValue = ${initialState};
        let map;
        let marker;
        let autocomplete;
        let geocoder;

        function sendSelection(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function setMarker(position, zoom) {
          marker.setPosition(position);
          marker.setVisible(true);
          map.panTo(position);
          if (zoom) map.setZoom(zoom);
        }

        function initMap() {
          const lat = Number(initialValue.latitude) || 17.385;
          const lng = Number(initialValue.longitude) || 78.4867;
          geocoder = new google.maps.Geocoder();
          map = new google.maps.Map(document.getElementById("map"), {
            center: { lat, lng },
            zoom: initialValue.latitude && initialValue.longitude ? 15 : 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          marker = new google.maps.Marker({
            map,
            position: { lat, lng },
            visible: Boolean(initialValue.latitude && initialValue.longitude),
          });

          autocomplete = new google.maps.places.Autocomplete(document.getElementById("search"), {
            fields: ["formatted_address", "geometry", "name"],
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const location = place && place.geometry && place.geometry.location;
            if (!location) return;

            setMarker(location, 16);
            sendSelection({
              locationName: place.name || "",
              locationAddress: place.formatted_address || "",
              mapsUrl: "https://www.google.com/maps?q=" + location.lat() + "," + location.lng(),
              latitude: String(location.lat().toFixed(6)),
              longitude: String(location.lng().toFixed(6)),
            });
          });

          map.addListener("click", (event) => {
            const latValue = event.latLng.lat();
            const lngValue = event.latLng.lng();
            setMarker(event.latLng, 16);

            geocoder.geocode({ location: { lat: latValue, lng: lngValue } }, (results) => {
              const first = results && results[0];
              sendSelection({
                locationName: first && first.address_components && first.address_components[0] ? first.address_components[0].long_name : "Pinned location",
                locationAddress: first ? first.formatted_address : "",
                mapsUrl: "https://www.google.com/maps?q=" + latValue + "," + lngValue,
                latitude: String(latValue.toFixed(6)),
                longitude: String(lngValue.toFixed(6)),
              });
            });
          });
        }
      </script>
      <script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap"></script>
    </body>
  </html>`;
}

export default function LocationPickerWebView({ value, onSelect }) {
  const source = useMemo(() => ({ html: buildHtml(value) }), [value]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 14, backgroundColor: "#f8fafc" }}>
        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Interactive location picker unavailable</Text>
        <Text style={{ color: "#64748b", marginTop: 8, lineHeight: 20 }}>
          Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable place search and pin selection inside mobile.
        </Text>
      </View>
    );
  }

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
