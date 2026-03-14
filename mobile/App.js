import React from "react";
import { SafeAreaView, Text, View } from "react-native";

import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 24, gap: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>QRBulkGen Mobile</Text>
        <Text style={{ color: "#555" }}>
          Week 1 scaffold for mobile auth flow. Replace this temporary screen wiring with a
          real navigation stack during Week 2 mobile implementation.
        </Text>
        <LoginScreen />
        <RegisterScreen />
      </View>
    </SafeAreaView>
  );
}
