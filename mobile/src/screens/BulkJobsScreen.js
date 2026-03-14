import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders } from "../lib/api";
import { shareDataUrlFile } from "../lib/files";
import { QR_TYPES } from "../lib/qr";

function Card({ children }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 20,
        backgroundColor: "#ffffff",
        padding: 18,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

function StatPill({ label, value, tone }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 16,
        padding: 12,
        backgroundColor: "#f8fafc",
      }}
    >
      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 20, fontWeight: "800", color: tone || "#0f172a" }}>{value}</Text>
    </View>
  );
}

export function BulkJobsScreen() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [qrTypeFilter, setQrTypeFilter] = useState("All");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadJobs() {
      try {
        const data = await apiRequest("/qr/jobs?jobType=bulk&limit=12", {
          headers: createAuthHeaders(token),
        });
        if (!mounted) return;
        const nextJobs = data.jobs || [];
        setJobs(nextJobs);
        if (nextJobs.length && !selectedJobId) {
          setSelectedJobId(nextJobs[0].id);
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || "Failed to load bulk jobs");
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    loadJobs();
    const poll = setInterval(loadJobs, 8000);
    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [token, selectedJobId]);

  const filteredJobs = useMemo(() => {
    if (qrTypeFilter === "All") {
      return jobs;
    }
    return jobs.filter((job) => job.qrType === qrTypeFilter);
  }, [jobs, qrTypeFilter]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId("");
      return;
    }

    const exists = filteredJobs.some((job) => job.id === selectedJobId);
    if (!exists) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  useEffect(() => {
    let mounted = true;
    if (!selectedJobId) {
      setSelectedJob(null);
      setItems([]);
      return;
    }

    async function loadDetails() {
      setDetailBusy(true);
      try {
        const headers = createAuthHeaders(token);
        const [jobData, itemData] = await Promise.all([
          apiRequest(`/qr/jobs/${selectedJobId}`, { headers }),
          apiRequest(`/qr/jobs/${selectedJobId}/items`, { headers }),
        ]);
        if (!mounted) return;
        setSelectedJob(jobData.job || null);
        setItems(itemData.items || []);
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || "Failed to load job details");
        }
      } finally {
        if (mounted) {
          setDetailBusy(false);
        }
      }
    }

    loadDetails();
    return () => {
      mounted = false;
    };
  }, [selectedJobId, token]);

  const recentFailures = useMemo(() => items.filter((item) => item.status === "failed").slice(0, 5), [items]);

  async function handleDownloadArtifact() {
    if (!selectedJob?.artifact?.filePath?.startsWith("data:")) {
      return;
    }

    try {
      const path = await shareDataUrlFile({
        dataUrl: selectedJob.artifact.filePath,
        fileName: selectedJob.artifact.fileName,
      });
      setShareMessage(`Shared ${path.split(/[\\/]/).pop()}`);
    } catch (shareError) {
      setError(shareError.message || "Failed to share ZIP file");
    }
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Bulk QR</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Choose the same QR type set as web, then monitor matching bulk jobs here. CSV upload stays on
          web, while mobile focuses on tracking status and sharing completed ZIP files.
        </Text>
      </Card>

      {!!error && (
        <Card>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </Card>
      )}
      {!!shareMessage && (
        <Card>
          <Text style={{ color: "#047857" }}>{shareMessage}</Text>
        </Card>
      )}

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>QR Type</Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: "#cbd5e1",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <Picker selectedValue={qrTypeFilter} onValueChange={setQrTypeFilter}>
            <Picker.Item label="All QR Types" value="All" />
            {QR_TYPES.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>
        </View>
        <Text style={{ color: "#64748b" }}>
          {qrTypeFilter === "All"
            ? "Showing every bulk job in your account."
            : `Showing ${qrTypeFilter} bulk jobs only.`}
        </Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Recent Bulk Jobs</Text>
        {busy ? (
          <Text style={{ color: "#64748b" }}>Loading jobs...</Text>
        ) : filteredJobs.length ? (
          filteredJobs.map((job) => {
            const active = selectedJobId === job.id;
            return (
              <TouchableOpacity
                key={job.id}
                onPress={() => setSelectedJobId(job.id)}
                style={{
                  borderWidth: 1,
                  borderColor: active ? "#0f172a" : "#dbe3f0",
                  borderRadius: 18,
                  padding: 14,
                  backgroundColor: active ? "#eff6ff" : "#ffffff",
                  gap: 4,
                }}
              >
                <Text style={{ fontWeight: "700", color: "#0f172a" }}>{job.qrType}</Text>
                <Text style={{ color: "#475569" }}>{job.status.toUpperCase()}</Text>
                <Text style={{ color: "#64748b" }}>
                  {job.successCount}/{job.totalCount} complete
                </Text>
                <Text numberOfLines={1} style={{ color: "#94a3b8", fontSize: 12 }}>
                  {job.id}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={{ color: "#64748b" }}>
            {qrTypeFilter === "All" ? "No bulk jobs yet." : `No ${qrTypeFilter} bulk jobs yet.`}
          </Text>
        )}
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Job Details</Text>
        {detailBusy ? (
          <Text style={{ color: "#64748b" }}>Loading selected job...</Text>
        ) : selectedJob ? (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatPill label="Status" value={selectedJob.status.toUpperCase()} />
              <StatPill label="QR Type" value={selectedJob.qrType} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatPill label="Requested" value={selectedJob.totalCount} />
              <StatPill label="Success" value={selectedJob.successCount} tone="#047857" />
              <StatPill label="Failure" value={selectedJob.failureCount} tone="#b91c1c" />
            </View>
            <Text style={{ color: "#64748b" }}>Source file: {selectedJob.sourceFileName}</Text>
            {selectedJob.errorMessage ? (
              <Text style={{ color: "#b91c1c" }}>{selectedJob.errorMessage}</Text>
            ) : null}
            <TouchableOpacity
              onPress={handleDownloadArtifact}
              disabled={!selectedJob.artifact?.filePath?.startsWith("data:")}
              style={{
                backgroundColor: selectedJob.artifact?.filePath?.startsWith("data:") ? "#0f172a" : "#cbd5e1",
                paddingVertical: 14,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "700" }}>
                {selectedJob.artifact?.filePath?.startsWith("data:") ? "Share ZIP File" : "ZIP Not Ready"}
              </Text>
            </TouchableOpacity>

            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700", color: "#0f172a" }}>Recent failed rows</Text>
              {recentFailures.length ? (
                recentFailures.map((item) => (
                  <View
                    key={`${item.rowIndex}-${item.content}`}
                    style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 }}
                  >
                    <Text style={{ color: "#0f172a" }}>Row {item.rowIndex}</Text>
                    <Text style={{ color: "#64748b" }}>{item.content || "No content captured"}</Text>
                    <Text style={{ color: "#b91c1c" }}>{item.errorMessage || "Generation failed"}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#64748b" }}>No row-level failures recorded for this job.</Text>
              )}
            </View>
          </>
        ) : (
          <Text style={{ color: "#64748b" }}>Select a job to view details.</Text>
        )}
      </Card>
    </ScrollView>
  );
}
