import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { BulkJobsScreen } from "./BulkJobsScreen";
import { ShortLinksScreen } from "./ShortLinksScreen";
import { SingleGenerateScreen } from "./SingleGenerateScreen";

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

function EmptyState({ title, body }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#cbd5e1",
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 24,
        backgroundColor: "#f8fafc",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Text style={{ color: "#0f172a", fontWeight: "700", fontSize: 16, textAlign: "center" }}>{title}</Text>
      <Text style={{ color: "#64748b", lineHeight: 22, textAlign: "center" }}>{body}</Text>
    </View>
  );
}

function ModeButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#0f172a",
        borderRadius: 14,
        paddingVertical: 10,
        backgroundColor: active ? "#0f172a" : "#ffffff",
      }}
    >
      <Text style={{ textAlign: "center", color: active ? "#ffffff" : "#0f172a", fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function GenerateWorkspaceScreen() {
  const [type, setType] = useState("qr");
  const [mode, setMode] = useState("single");

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", letterSpacing: 2 }}>CONTROL CENTER</Text>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Generate Workspace</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Choose a type and mode here, just like the web app. Single and Bulk stay inside the same mobile Generate workspace.
        </Text>
        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 14, overflow: "hidden", backgroundColor: "#ffffff" }}>
          <Picker selectedValue={type} onValueChange={(value) => { setType(value); setMode("single"); }}>
            <Picker.Item label="QR Code" value="qr" />
            <Picker.Item label="Short URL" value="short-url" />
            <Picker.Item label="Barcode" value="barcode" />
            <Picker.Item label="Label" value="label" />
          </Picker>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ModeButton label="Single" active={mode === "single"} onPress={() => setMode("single")} />
          <ModeButton label="Bulk" active={mode === "bulk"} onPress={() => setMode("bulk")} />
        </View>
      </Card>

      {type === "qr" && mode === "single" ? <SingleGenerateScreen /> : null}
      {type === "qr" && mode === "bulk" ? <BulkJobsScreen /> : null}
      {type === "short-url" && mode === "single" ? <ShortLinksScreen variant="create" /> : null}
      {type === "short-url" && mode === "bulk" ? (
        <EmptyState
          title="Bulk Short URL mobile flow is not connected yet"
          body="Use the web app for bulk short URL CSV creation right now. The mobile screen will support the same flow once bulk upload is wired on mobile."
        />
      ) : null}
      {type === "barcode" ? (
        <EmptyState
          title={`${mode === "single" ? "Single" : "Bulk"} barcode mobile flow is not connected yet`}
          body="Barcode generation is available on the web. The mobile app now matches the same Generate structure and can plug into a dedicated barcode screen next."
        />
      ) : null}
      {type === "label" ? (
        <EmptyState
          title={`${mode === "single" ? "Single" : "Bulk"} label mobile flow is not connected yet`}
          body="Label generation is available on the web. The mobile app now follows the same Generate structure and can plug into a dedicated label screen next."
        />
      ) : null}
    </ScrollView>
  );
}
