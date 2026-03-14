import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders } from "../lib/api";
import { shareDataUrlFile } from "../lib/files";

const FORMATS = ["png", "svg"];
const EC_LEVELS = ["L", "M", "Q", "H"];

function FieldLabel({ children }) {
  return <Text style={{ fontSize: 12, fontWeight: "700", color: "#475569", letterSpacing: 0.4 }}>{children}</Text>;
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

function SelectRow({ label, value, options, onChange }) {
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {options.map((option) => {
            const active = option === value;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => onChange(option)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#0f172a" : "#cbd5e1",
                  backgroundColor: active ? "#0f172a" : "#ffffff",
                }}
              >
                <Text style={{ color: active ? "#ffffff" : "#0f172a", fontWeight: "600" }}>
                  {option.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function SingleGenerateScreen() {
  const { token } = useAuth();
  const [content, setContent] = useState("https://www.qrbulkgen.com");
  const [filenamePrefix, setFilenamePrefix] = useState("mobile-qr");
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [size, setSize] = useState("512");
  const [margin, setMargin] = useState("2");
  const [format, setFormat] = useState("png");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M");
  const [artifact, setArtifact] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const previewSource = useMemo(() => {
    if (!artifact?.dataUrl) return null;
    if (artifact.mimeType === "image/png" || artifact.mimeType === "image/svg+xml") {
      return { uri: artifact.dataUrl };
    }
    return null;
  }, [artifact]);

  async function handleGenerate() {
    setBusy(true);
    setError("");
    setShareMessage("");
    try {
      const data = await apiRequest("/qr/single", {
        method: "POST",
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          content,
          filenamePrefix,
          foregroundColor,
          backgroundColor,
          size: Number(size || 512),
          margin: Number(margin || 2),
          format,
          errorCorrectionLevel,
        }),
      });

      setArtifact(data.artifact || null);
      setJob(data.job || null);
    } catch (requestError) {
      setError(requestError.message || "Failed to generate QR");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!artifact?.dataUrl) return;
    try {
      const sharedPath = await shareDataUrlFile({
        dataUrl: artifact.dataUrl,
        fileName: artifact.fileName,
      });
      setShareMessage(`Shared ${sharedPath.split(/[\\/]/).pop()}`);
    } catch (shareError) {
      setError(shareError.message || "Failed to share QR file");
    }
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Single QR Generator</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Generate one QR instantly from your phone, preview it, then share the file to a teammate,
          customer, or another app.
        </Text>
      </Card>

      <Card>
        <View style={{ gap: 6 }}>
          <FieldLabel>CONTENT</FieldLabel>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Enter URL, text, phone, WiFi payload, or any QR-ready content"
            multiline
            style={{
              minHeight: 96,
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              padding: 14,
              textAlignVertical: "top",
              color: "#0f172a",
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <FieldLabel>FILE NAME</FieldLabel>
            <TextInput
              value={filenamePrefix}
              onChangeText={setFilenamePrefix}
              placeholder="mobile-qr"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
          <View style={{ width: 96, gap: 6 }}>
            <FieldLabel>SIZE</FieldLabel>
            <TextInput
              value={size}
              onChangeText={setSize}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
          <View style={{ width: 96, gap: 6 }}>
            <FieldLabel>MARGIN</FieldLabel>
            <TextInput
              value={margin}
              onChangeText={setMargin}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <FieldLabel>FOREGROUND</FieldLabel>
            <TextInput
              value={foregroundColor}
              onChangeText={setForegroundColor}
              autoCapitalize="characters"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <FieldLabel>BACKGROUND</FieldLabel>
            <TextInput
              value={backgroundColor}
              onChangeText={setBackgroundColor}
              autoCapitalize="characters"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
        </View>

        <SelectRow label="FORMAT" value={format} options={FORMATS} onChange={setFormat} />
        <SelectRow
          label="ERROR CORRECTION"
          value={errorCorrectionLevel}
          options={EC_LEVELS}
          onChange={setErrorCorrectionLevel}
        />

        {!!error && <Text style={{ color: "#b91c1c" }}>{error}</Text>}
        {!!shareMessage && <Text style={{ color: "#047857" }}>{shareMessage}</Text>}

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={busy}
          style={{
            backgroundColor: "#0f172a",
            paddingVertical: 14,
            borderRadius: 16,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "700" }}>
            {busy ? "Generating..." : "Generate QR"}
          </Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Preview & Share</Text>
        {job ? (
          <Text style={{ color: "#64748b" }}>
            Latest job: {job.id} | {job.status}
          </Text>
        ) : (
          <Text style={{ color: "#64748b" }}>Generate a QR to see preview and sharing options.</Text>
        )}

        {previewSource ? (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Image
              source={previewSource}
              style={{ width: 240, height: 240, borderRadius: 16, backgroundColor: "#ffffff" }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderStyle: "dashed",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <Text style={{ color: "#64748b" }}>
              PNG previews appear here. SVG files can still be generated and shared after creation.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleShare}
          disabled={!artifact?.dataUrl}
          style={{
            backgroundColor: artifact?.dataUrl ? "#e2e8f0" : "#f1f5f9",
            paddingVertical: 14,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>
            Share / Download File
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
