import React from "react";
import { Text, TextInput, View } from "react-native";

export function RegisterScreen() {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Register</Text>
      <TextInput placeholder="Name" style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }} />
      <TextInput placeholder="Email" style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }} />
      <TextInput placeholder="Password" secureTextEntry style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }} />
      <Text style={{ color: "#666" }}>
        Placeholder mobile registration screen. Hook this into the backend auth API in the next mobile phase.
      </Text>
    </View>
  );
}
