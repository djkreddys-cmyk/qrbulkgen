import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";

export function LoginScreen() {
  const { login, navigate, error, isSubmitting, resetNotice, setResetNotice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    await login({ email, password });
  }

  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      {!!resetNotice && (
        <Text style={{ color: "#047857" }}>
          {resetNotice}
        </Text>
      )}
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      <TouchableOpacity onPress={() => navigate("forgot-password")} style={{ alignSelf: "flex-end" }}>
        <Text style={{ color: "#1d4ed8", fontWeight: "600" }}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleLogin}
        disabled={isSubmitting}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          {isSubmitting ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>
      {!!resetNotice && (
        <TouchableOpacity onPress={() => setResetNotice("")} style={{ paddingVertical: 4 }}>
          <Text style={{ textAlign: "center", color: "#64748b" }}>Dismiss message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
