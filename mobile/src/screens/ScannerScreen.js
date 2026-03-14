import React, { useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { useAuth } from "../context/AuthContext";
import { looksLikeUrl } from "../lib/qr";

function Card({ children }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 20,
        backgroundColor: "#ffffff",
        padding: 18,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}

export function ScannerScreen() {
  const { navigate, setSingleDraft } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState("");
  const [lastScanAt, setLastScanAt] = useState(0);

  async function handleOpen() {
    if (!looksLikeUrl(scannedValue)) return;
    await Linking.openURL(scannedValue);
  }

  function handleUseInGenerator() {
    if (!scannedValue) return;
    setSingleDraft({
      qrType: looksLikeUrl(scannedValue) ? "URL" : "Text",
      content: scannedValue,
    });
    navigate("single-generate");
  }

  if (!permission) {
    return (
      <Card>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>QR Scanner</Text>
        <Text style={{ color: "#64748b" }}>Preparing camera permissions...</Text>
      </Card>
    );
  }

  if (!permission.granted) {
    return (
      <Card>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>QR Scanner</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Allow camera access to scan any QR code from another screen, paper print, or live scanner.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ backgroundColor: "#0f172a", paddingVertical: 14, borderRadius: 16 }}
        >
          <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "700" }}>
            Allow Camera Access
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <View style={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>QR Scanner</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Scan any QR code and web links will open immediately. You can also move the scanned content
          into the single generator to restyle or regenerate it.
        </Text>
      </Card>

      <Card>
        <View style={{ overflow: "hidden", borderRadius: 20 }}>
          <CameraView
            style={{ height: 320 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              const now = Date.now();
              if (now - lastScanAt < 1800) {
                return;
              }
              setLastScanAt(now);
              setScannedValue(data || "");
              if (looksLikeUrl(data)) {
                Linking.openURL(data).catch(() => {});
              }
            }}
          />
        </View>
        <TouchableOpacity
          onPress={() => {
            setScannedValue("");
            setLastScanAt(0);
          }}
          style={{ backgroundColor: "#e2e8f0", paddingVertical: 14, borderRadius: 16 }}
        >
          <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>
            Scan Another QR
          </Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Scanned Result</Text>
        <Text style={{ color: scannedValue ? "#0f172a" : "#64748b", lineHeight: 22 }}>
          {scannedValue || "Scan a QR code to see its content here."}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={handleUseInGenerator}
            disabled={!scannedValue}
            style={{
              flex: 1,
              backgroundColor: scannedValue ? "#0f172a" : "#cbd5e1",
              paddingVertical: 14,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "700" }}>
              Use In Single QR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpen}
            disabled={!looksLikeUrl(scannedValue)}
            style={{
              flex: 1,
              backgroundColor: looksLikeUrl(scannedValue) ? "#e2e8f0" : "#f1f5f9",
              paddingVertical: 14,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>
              Open Link
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}
