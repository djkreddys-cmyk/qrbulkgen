import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";

export function ForgotPasswordScreen() {
  const { forgotPassword, navigate, error, isSubmitting } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleForgotPassword() {
    try {
      const data = await forgotPassword(email);
      setMessage(data?.message || "If the email is registered, a reset link has been sent.");
    } catch (_error) {
      setMessage("");
    }
  }

  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Forgot Password</Text>
      <Text style={{ color: "#64748b", lineHeight: 20 }}>
        Enter your registered email. We’ll send a reset password link with a token to that email address.
      </Text>
      <TextInput
        placeholder="Registered email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      {!!message && <Text style={{ color: "#047857" }}>{message}</Text>}
      <TouchableOpacity
        onPress={handleForgotPassword}
        disabled={isSubmitting}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate("login")} style={{ paddingVertical: 4 }}>
        <Text style={{ textAlign: "center", color: "#1d4ed8", fontWeight: "600" }}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
