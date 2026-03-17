import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";

export function ForgotPasswordScreen() {
  const { forgotPassword, resetPasswordWithOtp, navigate, error, isSubmitting } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const isOtpMode = method === "phone";

  async function handleForgotPassword() {
    try {
      setMessage("");
      setOtpPreview("");

      if (isOtpMode) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const data = await resetPasswordWithOtp({ identifier, code: otp, password });
        setMessage(data?.message || "Password reset successful.");
        setTimeout(() => {
          navigate("login");
        }, 900);
        return;
      }

      const data = await forgotPassword(identifier);
      setMethod(data?.method || "");
      setOtpPreview(data?.otpPreview || "");
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
        Enter your registered email or mobile number. Email accounts receive a reset link. Mobile-only accounts can reset with an OTP.
      </Text>
      <TextInput
        placeholder="Email / Mobile Number"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="default"
        editable={!isOtpMode}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
      />
      {isOtpMode ? (
        <>
          <TextInput
            placeholder="OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 8 }}
          />
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
        </>
      ) : null}
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      {!!message && <Text style={{ color: "#047857" }}>{message}</Text>}
      {!!otpPreview && (
        <Text style={{ color: "#92400e", backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fcd34d", padding: 10, borderRadius: 8 }}>
          Dev OTP preview: {otpPreview}
        </Text>
      )}
      <TouchableOpacity
        onPress={handleForgotPassword}
        disabled={isSubmitting}
        style={{ backgroundColor: "#000", padding: 14, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          {isSubmitting ? (isOtpMode ? "Resetting..." : "Sending...") : isOtpMode ? "Verify OTP & Reset Password" : "Continue"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigate("login")} style={{ paddingVertical: 4 }}>
        <Text style={{ textAlign: "center", color: "#1d4ed8", fontWeight: "600" }}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
