import React, { useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { buildQrContent, looksLikeUrl, parseScannedQrDraft } from "../lib/qr";

function getManagedLinkId(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const pathMatch = parsed.pathname.match(/^\/q\/([0-9a-f-]+)/i);
    if (!pathMatch) return "";
    if (!host.includes("qrbulkgen")) return "";
    return pathMatch[1] || "";
  } catch (_error) {
    return "";
  }
}

function getHostedPublicLink(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("qrbulkgen")) return null;

    const pdfMatch = parsed.pathname.match(/^\/pdf\/([0-9a-f-]+)/i);
    if (pdfMatch) {
      return { type: "pdf", id: pdfMatch[1] || "" };
    }

    const galleryMatch = parsed.pathname.match(/^\/gallery\/([0-9a-f-]+)/i);
    if (galleryMatch) {
      return { type: "gallery", id: galleryMatch[1] || "" };
    }

    return null;
  } catch (_error) {
    return null;
  }
}

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

function normalizeOpenTarget(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^upi:/i.test(raw)) return raw;
  if (/^mailto:/i.test(raw)) return raw;
  if (/^tel:/i.test(raw)) return raw;
  if (/^sms:/i.test(raw)) return raw;
  if (/^SMSTO:/i.test(raw)) {
    const parts = raw.replace(/^SMSTO:/i, "").split(":");
    const phone = parts.shift() || "";
    const body = parts.join(":");
    return `sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ""}`;
  }
  return "";
}

export function ScannerScreen() {
  const { navigate, setSingleDraft } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedValue, setScannedValue] = useState("");
  const [lastScanAt, setLastScanAt] = useState(0);
  const [fileScanMessage, setFileScanMessage] = useState("");

  async function resolveScannedValue(rawValue) {
    const managedLinkId = getManagedLinkId(rawValue);
    if (managedLinkId) {
      try {
        const data = await apiRequest(`/public/qr-links/${managedLinkId}`);
        return String(data?.link?.content || rawValue || "");
      } catch (_error) {
        return String(rawValue || "");
      }
    }

    const hostedPublicLink = getHostedPublicLink(rawValue);
    if (hostedPublicLink?.id) {
      try {
        const data = await apiRequest(`/public/links/${hostedPublicLink.id}`);
        if (hostedPublicLink.type === "pdf") {
          return String(data?.link?.payload?.url || rawValue || "");
        }
        if (hostedPublicLink.type === "gallery") {
          return String(data?.link?.payload?.images?.[0]?.url || rawValue || "");
        }
      } catch (_error) {
        return String(rawValue || "");
      }
    }

    return String(rawValue || "");
  }

  function resolveOpenTarget(value) {
    const direct = normalizeOpenTarget(value);
    if (direct) return direct;

    const draft = parseScannedQrDraft(value);
    const rebuilt = buildQrContent(draft.qrType, draft.fields || {}, {
      appOrigin: "https://www.qrbulkgen.com",
      socialLinks: draft.socialLinks || [],
      ids: draft.ids || {},
      modes: draft.modes || {},
      expiryDate: draft.expiryDate || "",
    });
    return normalizeOpenTarget(rebuilt);
  }

  async function handleOpen() {
    const target = resolveOpenTarget(scannedValue);
    if (!target) return;
    await Linking.openURL(target);
  }

  function handleUseInGenerator() {
    if (!scannedValue) return;
    const draft = parseScannedQrDraft(scannedValue);
    setSingleDraft(draft);
    navigate("single-generate");
  }

  async function handlePickSavedQr() {
    try {
      setFileScanMessage("");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      const uri = asset?.uri;
      if (!uri) {
        setFileScanMessage("Could not read the selected image.");
        return;
      }

      const scans = await Camera.scanFromURLAsync(uri, ["qr"]);
      const first = scans?.[0]?.data ? String(scans[0].data) : "";
      if (!first) {
        setFileScanMessage("No QR code was found in that image.");
        return;
      }

      const resolved = await resolveScannedValue(first);
      setScannedValue(resolved);
      setLastScanAt(Date.now());
      setFileScanMessage("Saved QR opened successfully.");

      const target = resolveOpenTarget(resolved);
      if (target) {
        Linking.openURL(target).catch(() => {});
      }
    } catch (_error) {
      setFileScanMessage("Unable to scan that image right now.");
    }
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
        <TouchableOpacity
          onPress={handlePickSavedQr}
          style={{ backgroundColor: "#e2e8f0", paddingVertical: 14, borderRadius: 16 }}
        >
          <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>
            Open Saved QR
          </Text>
        </TouchableOpacity>
        {!!fileScanMessage && <Text style={{ color: "#475569", lineHeight: 20 }}>{fileScanMessage}</Text>}
      </Card>

      <Card>
        <View style={{ overflow: "hidden", borderRadius: 20 }}>
          <CameraView
            style={{ height: 320 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={async ({ data }) => {
              const now = Date.now();
              if (now - lastScanAt < 1800) {
                return;
              }
              setLastScanAt(now);
              const resolved = await resolveScannedValue(data || "");
              setScannedValue(resolved);
              const target = resolveOpenTarget(resolved);
              if (target) {
                Linking.openURL(target).catch(() => {});
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
            disabled={!resolveOpenTarget(scannedValue)}
            style={{
              flex: 1,
              backgroundColor: resolveOpenTarget(scannedValue) ? "#e2e8f0" : "#f1f5f9",
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
