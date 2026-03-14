import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders } from "../lib/api";

export function DashboardScreen() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const headers = createAuthHeaders(token);
        const [summaryData, jobsData] = await Promise.all([
          apiRequest("/qr/jobs/summary", { headers }),
          apiRequest("/qr/jobs?limit=5", { headers }),
        ]);
        if (!mounted) return;
        setSummary(summaryData.summary || null);
        setJobs(jobsData.jobs || []);
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || "Failed to load dashboard");
        }
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <ScrollView
      contentContainerStyle={{
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 20,
        padding: 18,
        gap: 14,
        backgroundColor: "#ffffff",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Dashboard</Text>
      <Text style={{ color: "#64748b" }}>
        Keep an eye on personal generation activity, recent bulk runs, and output quality from the mobile app.
      </Text>
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      {summary ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>TOTAL JOBS</Text>
              <Text style={{ marginTop: 4, fontSize: 26, fontWeight: "800", color: "#0f172a" }}>{summary.totalJobs}</Text>
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>REQUESTED</Text>
              <Text style={{ marginTop: 4, fontSize: 26, fontWeight: "800", color: "#0f172a" }}>{summary.totalRequested}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>SINGLE</Text>
              <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "800", color: "#0f172a" }}>{summary.singleJobs}</Text>
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>BULK</Text>
              <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "800", color: "#0f172a" }}>{summary.bulkJobs}</Text>
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>SUCCESS</Text>
              <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "800", color: "#047857" }}>{summary.totalSuccess}</Text>
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>FAILURE</Text>
              <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "800", color: "#b91c1c" }}>{summary.totalFailure}</Text>
            </View>
          </View>
        </View>
      ) : (
        <Text style={{ color: "#666" }}>Loading summary...</Text>
      )}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "700", color: "#0f172a" }}>Recent Jobs</Text>
        {jobs.map((job) => (
          <View key={job.id} style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 }}>
            <Text style={{ fontWeight: "700", color: "#0f172a" }}>{job.qrType}</Text>
            <Text style={{ color: "#475569" }}>{job.jobType} | {job.status}</Text>
            <Text style={{ color: "#64748b" }}>
              {job.successCount}/{job.totalCount} completed
            </Text>
            <Text numberOfLines={1} style={{ color: "#94a3b8", fontSize: 12 }}>{job.id}</Text>
          </View>
        ))}
        {!jobs.length && <Text style={{ color: "#666" }}>No jobs yet.</Text>}
      </View>
    </ScrollView>
  );
}
