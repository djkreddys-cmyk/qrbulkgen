import React from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { BulkJobsScreen } from "./src/screens/BulkJobsScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { SingleGenerateScreen } from "./src/screens/SingleGenerateScreen";

function TabButton({ label, route, activeRoute, navigate }) {
  const active = activeRoute === route;
  return (
    <TouchableOpacity
      onPress={() => navigate(route)}
      style={{
        flex: 1,
        backgroundColor: active ? "#000" : "#fff",
        borderWidth: 1,
        borderColor: "#000",
        paddingVertical: 10,
        borderRadius: 10,
      }}
    >
      <Text style={{ color: active ? "#fff" : "#000", textAlign: "center", fontWeight: "600" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MobileShell() {
  const { screen, activeRoute, isBootstrapping, navigate, user, logout } = useAuth();

  if (isBootstrapping) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>QRBulkGen Mobile</Text>
          <Text style={{ marginTop: 16, color: "#555" }}>Restoring session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (user) {
    let screenContent = <DashboardScreen />;

    if (activeRoute === "single-generate") {
      screenContent = <SingleGenerateScreen />;
    } else if (activeRoute === "bulk-jobs") {
      screenContent = <BulkJobsScreen />;
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>QRBulkGen Mobile</Text>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            Logged in as {user.name || user.email}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TabButton label="Dashboard" route="dashboard" activeRoute={activeRoute} navigate={navigate} />
            <TabButton
              label="Single QR"
              route="single-generate"
              activeRoute={activeRoute}
              navigate={navigate}
            />
            <TabButton label="Bulk Jobs" route="bulk-jobs" activeRoute={activeRoute} navigate={navigate} />
          </View>
          {screenContent}
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
            onPress={() => navigate("login")}
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
            onPress={() => navigate("register")}
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
