import React from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";

function MobileShell() {
  const { screen, setScreen, user, logout } = useAuth();

  if (user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>QRBulkGen Mobile</Text>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            Logged in as {user.name || user.email}
          </Text>
          <TouchableOpacity
            onPress={logout}
            style={{ backgroundColor: "#000", padding: 14, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>QRBulkGen Mobile</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => setScreen("login")}
            style={{
              backgroundColor: screen === "login" ? "#000" : "#fff",
              borderWidth: 1,
              borderColor: "#000",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: screen === "login" ? "#fff" : "#000", fontWeight: "600" }}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScreen("register")}
            style={{
              backgroundColor: screen === "register" ? "#000" : "#fff",
              borderWidth: 1,
              borderColor: "#000",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: screen === "register" ? "#fff" : "#000", fontWeight: "600" }}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
        {screen === "login" ? <LoginScreen /> : <RegisterScreen />}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MobileShell />
    </AuthProvider>
  );
}
