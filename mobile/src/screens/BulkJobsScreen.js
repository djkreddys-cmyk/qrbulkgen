import React from "react";
import { Text, View } from "react-native";

export function BulkJobsScreen() {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Bulk Jobs</Text>
      <Text style={{ color: "#666" }}>
        Protected mobile route is now available. Bulk history/detail implementation is scheduled next.
      </Text>
    </View>
  );
}
