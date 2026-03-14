import React from "react";
import { Text, View } from "react-native";

export function SingleGenerateScreen() {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Single QR</Text>
      <Text style={{ color: "#666" }}>
        Navigation and protection are now in place. Single QR generation UI is the next mobile task.
      </Text>
    </View>
  );
}
