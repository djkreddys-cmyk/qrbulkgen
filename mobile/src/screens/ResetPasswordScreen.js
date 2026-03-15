import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

export function ResetPasswordScreen() {
  const {
    completePasswordReset,
    error,
    isSubmitting,
    navigate,
    resetPasswordToken,
    setError,
  } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleResetPassword() {
    setMessage("");
    setError("");

    if (!resetPasswordToken) {
      setError("Reset token is missing. Please open the reset link again from your email.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const data = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: resetPasswordToken,
          password,
        }),
      });

      setMessage(data?.message || "Password reset successful.");
      setTimeout(() => {
        completePasswordReset();
      }, 900);
    } catch (requestError) {
      setError(requestError.message || "Unable to reset password.");
    }
  }

  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Reset Password</Text>
      <Text style={{ color: "#64748b", lineHeight: 20 }}>
        Enter your new password below. After reset, you&apos;ll be taken back to login.
      </Text>
      <TextInput
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      <TextInput
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      {!!message && <Text style={{ color: "#047857" }}>{message}</Text>}
      <TouchableOpacity
        onPress={handleResetPassword}
        disabled={isSubmitting}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate("login")} style={{ paddingVertical: 4 }}>
        <Text style={{ textAlign: "center", color: "#1d4ed8", fontWeight: "600" }}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
