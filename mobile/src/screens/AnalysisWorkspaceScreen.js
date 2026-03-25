import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { DashboardScreen } from "./DashboardScreen";
import { ShortLinksScreen } from "./ShortLinksScreen";

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

export function AnalysisWorkspaceScreen() {
  const [type, setType] = useState("qr");
  const [mode, setMode] = useState("single");

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", letterSpacing: 2 }}>CONTROL CENTER</Text>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Analysis Workspace</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Choose a type and mode here, just like Generate. Single analysis and Bulk analysis stay inside the same mobile Analysis workspace.
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

      {type === "qr" ? <DashboardScreen mode={mode} hideWorkspaceTabs /> : null}
      {type === "short-url" ? <ShortLinksScreen variant="dashboard" mode={mode} /> : null}
      {type === "barcode" ? (
        <EmptyState
          title={`${mode === "single" ? "Single" : "Bulk"} barcode analysis is not connected yet`}
          body="Mobile now follows the same Analysis structure as web, but barcode generation is not yet saving analysis data into mobile dashboard records."
        />
      ) : null}
      {type === "label" ? (
        <EmptyState
          title={`${mode === "single" ? "Single" : "Bulk"} label analysis is not connected yet`}
          body="Mobile now follows the same Analysis structure as web, but label generation is not yet saving analysis data into mobile dashboard records."
        />
      ) : null}
    </ScrollView>
  );
}
