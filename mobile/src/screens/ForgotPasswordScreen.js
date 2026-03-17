import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";

export function ForgotPasswordScreen() {
  const { forgotPassword, navigate, error, isSubmitting } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [message, setMessage] = useState("");
  const isPhoneIdentifier = identifier.trim() && !identifier.includes("@");

  async function handleForgotPassword() {
    try {
      setMessage("");

      const data = await forgotPassword({ identifier, recoveryEmail });
      setMessage(
        data?.message ||
          "If the account exists, password reset instructions have been sent.",
      );
    } catch (requestError) {
      setMessage("");
      if (requestError?.message && requestError.message !== error) {
        // error state is already set in context; keep this branch quiet.
      }
    }
  }

  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Forgot Password</Text>
      <Text style={{ color: "#64748b", lineHeight: 20 }}>
        Enter your registered email or mobile number. Email accounts receive a reset link directly. If you use a mobile number, add a valid email address and we&apos;ll send the reset link there.
      </Text>
      <TextInput
        placeholder="Email / Mobile Number"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="default"
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      {isPhoneIdentifier ? (
        <TextInput
          placeholder="Recovery Email"
          value={recoveryEmail}
          onChangeText={setRecoveryEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
        />
      ) : null}
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      {!!message && <Text style={{ color: "#047857" }}>{message}</Text>}
      <TouchableOpacity
        onPress={handleForgotPassword}
        disabled={isSubmitting}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          {isSubmitting ? "Sending..." : "Continue"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate("login")} style={{ paddingVertical: 4 }}>
        <Text style={{ textAlign: "center", color: "#1d4ed8", fontWeight: "600" }}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
