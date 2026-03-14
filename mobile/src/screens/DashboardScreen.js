import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

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
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Dashboard</Text>
      {!!error && <Text style={{ color: "#b00020" }}>{error}</Text>}
      {summary ? (
        <View style={{ gap: 6 }}>
          <Text>Total Jobs: {summary.totalJobs}</Text>
          <Text>Single Jobs: {summary.singleJobs}</Text>
          <Text>Bulk Jobs: {summary.bulkJobs}</Text>
          <Text>Requested: {summary.totalRequested}</Text>
          <Text>Success: {summary.totalSuccess}</Text>
          <Text>Failure: {summary.totalFailure}</Text>
        </View>
      ) : (
        <Text style={{ color: "#666" }}>Loading summary...</Text>
      )}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600" }}>Recent Jobs</Text>
        {jobs.map((job) => (
          <View key={job.id} style={{ borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 }}>
            <Text numberOfLines={1}>{job.id}</Text>
            <Text>{job.jobType} | {job.qrType} | {job.status}</Text>
          </View>
        ))}
        {!jobs.length && <Text style={{ color: "#666" }}>No jobs yet.</Text>}
      </View>
    </View>
  );
}
