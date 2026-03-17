import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";

export function LoginScreen() {
  const { login, navigate, error, isSubmitting, resetNotice, setResetNotice, setError } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    await login({ identifier, password });
  }

  function handleSocialPress(provider) {
    setError(`${provider} login needs OAuth app credentials before it can be enabled.`);
  }

  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Login</Text>
      <TextInput
        placeholder="Email or Mobile Number"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      <View style={{ position: "relative" }}>
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, paddingRight: 72, borderRadius: 8 }}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((value) => !value)}
          style={{ position: "absolute", right: 12, top: 12 }}
        >
          <Text style={{ color: "#475569", fontWeight: "600" }}>{showPassword ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>
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
      <TouchableOpacity
        onPress={() => handleSocialPress("Google")}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 14, borderRadius: 10 }}
      >
        <Text style={{ textAlign: "center", fontWeight: "600", color: "#0f172a" }}>Continue with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleSocialPress("Microsoft")}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 14, borderRadius: 10 }}
      >
        <Text style={{ textAlign: "center", fontWeight: "600", color: "#0f172a" }}>Continue with Microsoft</Text>
      </TouchableOpacity>
      <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
        Google and Microsoft login need OAuth app credentials before they can be enabled.
      </Text>
      {!!resetNotice && (
        <TouchableOpacity onPress={() => setResetNotice("")} style={{ paddingVertical: 4 }}>
          <Text style={{ textAlign: "center", color: "#64748b" }}>Dismiss message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
