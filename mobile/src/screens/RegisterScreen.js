import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";

export function RegisterScreen() {
  const { register, error, isSubmitting } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister() {
    await register({ name, email, phone, password });
  }

  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Register</Text>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Mobile Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
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
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      <TouchableOpacity
        onPress={handleRegister}
        disabled={isSubmitting}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          {isSubmitting ? "Creating account..." : "Register"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
