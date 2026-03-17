import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders, API_BASE_URL } from "../lib/api";

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  params.set("includeArchived", "true");
  const next = params.toString();
  return next ? `?${next}` : "";
}

function formatDateTime(value) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not yet";
  return parsed.toLocaleString();
}

function Card({ children, style }) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: "#dbe3f0",
          borderRadius: 20,
          padding: 18,
          gap: 14,
          backgroundColor: "#ffffff",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function EmptyState({ title, body }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#cbd5e1",
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 24,
        backgroundColor: "#f8fafc",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Text style={{ color: "#0f172a", fontWeight: "700", fontSize: 16, textAlign: "center" }}>{title}</Text>
      <Text style={{ color: "#64748b", lineHeight: 22, textAlign: "center" }}>{body}</Text>
    </View>
  );
}

function AnalysisStat({ label, value, tone = "#0f172a" }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 120,
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 16,
        padding: 12,
        backgroundColor: "#ffffff",
      }}
    >
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "800", color: tone }}>{value}</Text>
    </View>
  );
}

function MetricPill({ label, value, tone = "default" }) {
  const palette =
    tone === "success"
      ? { backgroundColor: "#ecfdf5", color: "#047857" }
      : tone === "danger"
        ? { backgroundColor: "#fff1f2", color: "#b91c1c" }
        : tone === "accent"
          ? { backgroundColor: "#eff6ff", color: "#1d4ed8" }
          : tone === "warning"
            ? { backgroundColor: "#fffbeb", color: "#b45309" }
            : { backgroundColor: "#f1f5f9", color: "#475569" };

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: palette.backgroundColor,
      }}
    >
      <Text style={{ color: palette.color, fontWeight: "700", fontSize: 12 }}>
        {label}: {value}
      </Text>
    </View>
  );
}

function ProgressBar({ label, value, total, color = "#0ea5e9", helper = "" }) {
  const percent = total ? Math.max(Math.round((value / total) * 100), value > 0 ? 4 : 0) : 0;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ color: "#334155", fontWeight: "600", flex: 1 }}>{label}</Text>
        <Text style={{ color: "#64748b" }}>
          {value}
          {helper ? ` | ${helper}` : ""}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
        <View
          style={{
            height: "100%",
            borderRadius: 999,
            backgroundColor: color,
            width: `${percent}%`,
          }}
        />
      </View>
    </View>
  );
}

function getStatusAccent(status) {
  if (status === "completed") return "#10b981";
  if (status === "processing" || status === "queued") return "#f59e0b";
  if (status === "failed") return "#f43f5e";
  return "#94a3b8";
}

function PerformanceBadge({ label, tone = "default" }) {
  const palette =
    tone === "success"
      ? { backgroundColor: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" }
      : tone === "warning"
        ? { backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fcd34d" }
        : tone === "danger"
          ? { backgroundColor: "#fff1f2", color: "#b91c1c", borderColor: "#fda4af" }
          : tone === "accent"
            ? { backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }
            : { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.borderColor,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: palette.backgroundColor,
      }}
    >
      <Text style={{ color: palette.color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function MiniSparkline({ points }) {
  if (!points.length) {
    return <Text style={{ color: "#94a3b8", fontSize: 12 }}>No scan trend yet.</Text>;
  }

  const max = Math.max(...points.map((point) => point.count || 0), 1);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 42 }}>
        {points.map((point, index) => (
          <View
            key={`${point.label}-${index}`}
            style={{
              flex: 1,
              minWidth: 8,
              height: `${Math.max((point.count / max) * 100, point.count > 0 ? 12 : 4)}%`,
              borderRadius: 999,
              backgroundColor: "#0ea5e9",
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: "#94a3b8", fontSize: 11 }}>{points[0]?.label || ""}</Text>
        <Text style={{ color: "#94a3b8", fontSize: 11 }}>{points[points.length - 1]?.label || ""}</Text>
      </View>
    </View>
  );
}

function getThumbnailSource(job) {
  const filePath = job?.artifact?.filePath || "";
  if (!filePath) return "";
  const lowered = String(filePath).toLowerCase();
  if (lowered.startsWith("data:image/")) {
    return filePath;
  }
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(lowered)) {
    const origin = API_BASE_URL.replace(/\/api\/?$/, "");
    return lowered.startsWith("http") ? filePath : `${origin}${filePath}`;
  }
  return "";
}

function getJobTitle(job) {
  return job.jobType === "single" ? job.qrType || "Single QR" : `${job.qrType || "Bulk"} Bulk`;
}

export function DashboardScreen() {
  const { token, navigate, setSingleDraft, setBulkDraft } = useAuth();
  const [filters, setFilters] = useState({ startDate: "", endDate: "", qrType: "all", status: "active" });
  const [jobs, setJobs] = useState([]);
  const [expandedJobId, setExpandedJobId] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState({});
  const [busyAnalysisJobId, setBusyAnalysisJobId] = useState("");
  const [busyJobId, setBusyJobId] = useState("");
  const [analysisTabByJobId, setAnalysisTabByJobId] = useState({});
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const queryString = useMemo(() => buildQuery(filters), [filters.startDate, filters.endDate]);

  async function loadDashboard(activeQuery = queryString) {
    try {
      const headers = createAuthHeaders(token);
      const jobsData = await apiRequest(`/qr/jobs?limit=36${activeQuery ? `&${activeQuery.slice(1)}` : ""}`, { headers });
      setJobs(jobsData.jobs || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to load dashboard");
    }
  }

  useEffect(() => {
    let active = true;

    async function boot() {
      if (active) {
        await loadDashboard();
      }
    }

    boot();
    const poll = setInterval(() => {
      if (active) {
        loadDashboard();
      }
    }, 8000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [token, queryString]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  async function runDelete(job, forceDelete) {
    setBusyJobId(job.id);
    setError("");
    try {
      await apiRequest(`/qr/jobs/${job.id}${forceDelete ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: createAuthHeaders(token),
      });

      if (!forceDelete) {
        setFilters((current) => ({ ...current, status: "archived" }));
      }

      setExpandedJobId((current) => (current === job.id ? "" : current));
      setJobAnalysis((current) => {
        const next = { ...current };
        delete next[job.id];
        return next;
      });
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message || "Unable to update QR job right now.");
    } finally {
      setBusyJobId("");
    }
  }

  function handleDeleteJob(job) {
    const forceDelete = Boolean(job.archivedAt);
    Alert.alert(
      forceDelete ? "Delete Permanently" : "Archive QR Job",
      forceDelete
        ? "This will permanently remove the QR job and its related data from the server. This cannot be undone."
        : "This QR job will move to Archived. You can permanently delete it later from the Archived view.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: forceDelete ? "Delete Permanently" : "Archive",
          style: forceDelete ? "destructive" : "default",
          onPress: () => runDelete(job, forceDelete),
        },
      ]
    );
  }

  async function handleToggleAnalysis(jobId) {
    if (expandedJobId === jobId) {
      setExpandedJobId("");
      return;
    }

    setExpandedJobId(jobId);
    if (jobAnalysis[jobId]) {
      return;
    }

    try {
      setBusyAnalysisJobId(jobId);
      const data = await apiRequest(`/qr/jobs/${jobId}/analysis`, {
        headers: createAuthHeaders(token),
      });
      setJobAnalysis((prev) => ({
        ...prev,
        [jobId]: data.analysis || null,
      }));
    } catch (requestError) {
      setError(requestError.message || "Failed to load job analysis");
    } finally {
      setBusyAnalysisJobId("");
    }
  }

  function getAnalysisTab(jobId) {
    return analysisTabByJobId[jobId] || "overview";
  }

  function setAnalysisTab(jobId, tab) {
    setAnalysisTabByJobId((prev) => ({
      ...prev,
      [jobId]: tab,
    }));
  }

  const qrTypeOptions = useMemo(() => {
    const values = Array.from(new Set(jobs.map((job) => job.qrType).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return ["all", ...values];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.qrType !== "all" && job.qrType !== filters.qrType) {
        return false;
      }

      if (filters.status === "archived") {
        return Boolean(job.archivedAt);
      }

      if (filters.status === "active") {
        return !job.archivedAt;
      }

      if (filters.status !== "all") {
        return !job.archivedAt && job.status === filters.status;
      }

      return true;
    });
  }, [filters.qrType, filters.status, jobs]);

  function handleEditJob(job) {
    if (job.jobType === "single") {
      setSingleDraft({ editJobId: job.id });
      navigate("single-generate");
      return;
    }

    setBulkDraft({ editJobId: job.id });
    navigate("bulk-jobs");
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Analytics Dashboard</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Open analysis on any created QR to inspect generation quality, scan behavior, response depth, and expiry health from mobile.
        </Text>
      </Card>

      <Card style={{ shadowColor: "#cbd5e1", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", letterSpacing: 2 }}>FILTERS</Text>
        <View style={{ gap: 10 }}>
          <TextInput
            value={filters.qrType}
            onChangeText={(value) => setFilters((prev) => ({ ...prev, qrType: value || "all" }))}
            placeholder={`QR type (${qrTypeOptions.slice(1).join(", ") || "all"})`}
            style={{
              borderWidth: 1,
              borderColor: "#dbe3f0",
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 13,
              color: "#0f172a",
              backgroundColor: "#f8fafc",
            }}
          />
          <TextInput
            value={filters.status}
            onChangeText={(value) => setFilters((prev) => ({ ...prev, status: value || "active" }))}
            placeholder="Status (active, all, archived, completed, failed, processing, queued)"
            style={{
              borderWidth: 1,
              borderColor: "#dbe3f0",
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 13,
              color: "#0f172a",
              backgroundColor: "#f8fafc",
            }}
          />
          <TextInput
            value={filters.startDate}
            onChangeText={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
            placeholder="Start date (YYYY-MM-DD)"
            style={{
              borderWidth: 1,
              borderColor: "#dbe3f0",
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 13,
              color: "#0f172a",
              backgroundColor: "#f8fafc",
            }}
          />
          <TextInput
            value={filters.endDate}
            onChangeText={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
            placeholder="End date (YYYY-MM-DD)"
            style={{
              borderWidth: 1,
              borderColor: "#dbe3f0",
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 13,
              color: "#0f172a",
              backgroundColor: "#f8fafc",
            }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={handleRefresh}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#dbe3f0",
                borderRadius: 18,
                paddingVertical: 12,
                backgroundColor: "#f8fafc",
              }}
            >
              <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>
                {refreshing ? "Refreshing..." : "Apply / Refresh"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilters({ startDate: "", endDate: "", qrType: "all", status: "active" })}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#dbe3f0",
                borderRadius: 18,
                paddingVertical: 12,
                backgroundColor: "#ffffff",
              }}
            >
              <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>Clear</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#64748b", fontSize: 12 }}>
            Archived jobs appear when Status is set to Archived or All.
          </Text>
        </View>
      </Card>

      {!!error && (
        <Card>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </Card>
      )}

      <Card>
        {!filteredJobs.length && (
          <EmptyState
            title={filters.status === "archived" ? "No archived QR jobs yet" : "No QR jobs found"}
            body={
              filters.status === "archived"
                ? "Archived jobs will appear here after you archive them from the active dashboard. You can permanently delete them from this view."
                : "Try changing the QR type, status, or date filters. Newly created QR jobs will appear here automatically."
            }
          />
        )}
        {!!filteredJobs.length && (
          <View style={{ gap: 14 }}>
            {filteredJobs.map((job) => {
              const analysis = jobAnalysis[job.id];
              const expanded = expandedJobId === job.id;
              const currentTab = getAnalysisTab(job.id);
              const thumbnailSource = getThumbnailSource(job);
              const jobBusy = busyJobId === job.id;
              const hasTrackedEngagement = Boolean(analysis?.engagement?.trackingEnabled);
              const typeAverageSuccessRate = analysis?.typePerformance
                ? (analysis.typePerformance.successCount || 0) / Math.max(analysis.typePerformance.requestedCount || 1, 1)
                : 0;
              const thisJobSuccessRate = analysis
                ? (analysis.job?.successCount || 0) / Math.max(analysis.job?.totalCount || 1, 1)
                : 0;

              return (
                <View
                  key={job.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 24,
                    padding: 14,
                    gap: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: getStatusAccent(job.status),
                    backgroundColor: "#ffffff",
                    shadowColor: "#cbd5e1",
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#dbe3f0",
                        backgroundColor: "#f8fafc",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        shadowColor: "#e2e8f0",
                        shadowOpacity: 0.7,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                      }}
                    >
                      {thumbnailSource ? (
                        <Image source={{ uri: thumbnailSource }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <Text style={{ color: "#64748b", fontWeight: "700", fontSize: 11, textAlign: "center" }}>
                          {(job.qrType || "QR").slice(0, 6)}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 10 }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <MetricPill label="Status" value={job.status} />
                        <MetricPill label="Mode" value={job.jobType === "single" ? "Single QR" : `${job.qrType} Bulk`} tone="accent" />
                        <PerformanceBadge label={job.trackingMode === "direct" ? "Direct" : "Tracked"} tone={job.trackingMode === "direct" ? "neutral" : "accent"} />
                        {job.archivedAt ? <PerformanceBadge label="Archived" tone="warning" /> : null}
                        {job.status === "completed" && job.successCount > 0 ? <PerformanceBadge label="Ready to share" tone="success" /> : null}
                        {job.failureCount > 0 ? <PerformanceBadge label="Needs review" tone="danger" /> : null}
                        {job.status === "completed" && job.successCount > 0 && !job.failureCount ? <PerformanceBadge label="Clean output" tone="success" /> : null}
                        {analysis && thisJobSuccessRate >= typeAverageSuccessRate && (analysis.engagement?.totalScans || 0) > 0 ? (
                          <PerformanceBadge label="Top Performer" tone="accent" />
                        ) : null}
                      </View>
                      <Text style={{ color: "#0f172a", fontWeight: "700", fontSize: 18 }}>{getJobTitle(job)}</Text>
                      <Text style={{ color: "#64748b" }}>Source: {job.sourceFileName || "Direct single QR"}</Text>
                      <Text style={{ color: "#64748b" }}>
                        {job.successCount}/{job.totalCount} completed
                      </Text>
                      <Text numberOfLines={1} style={{ color: "#94a3b8", fontSize: 12 }}>
                        {job.id}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 2 }}>
                    <TouchableOpacity
                      onPress={() => handleEditJob(job)}
                      style={{
                        alignSelf: "flex-start",
                        borderWidth: 1,
                        borderColor: "#cbd5e1",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Text style={{ color: "#0f172a", fontWeight: "700" }}>
                        {job.jobType === "single" ? "Edit QR" : "Edit Bulk"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleToggleAnalysis(job.id)}
                      style={{
                        alignSelf: "flex-start",
                        borderWidth: 1,
                        borderColor: "#93c5fd",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: "#eff6ff",
                      }}
                    >
                      <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>
                        {expanded ? "Hide Analysis" : busyAnalysisJobId === job.id ? "Loading..." : "Analysis"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteJob(job)}
                      disabled={jobBusy}
                      style={{
                        alignSelf: "flex-start",
                        borderWidth: 1,
                        borderColor: job.archivedAt ? "#fca5a5" : "#fcd34d",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: job.archivedAt ? "#fff1f2" : "#fffbeb",
                      }}
                    >
                      <Text style={{ color: job.archivedAt ? "#b91c1c" : "#b45309", fontWeight: "700" }}>
                        {jobBusy ? "Please wait..." : job.archivedAt ? "Delete Permanently" : "Archive"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {expanded && analysis && (
                    <View style={{ borderRadius: 20, backgroundColor: "#f8fafc", padding: 12, gap: 10, borderWidth: 1, borderColor: "#e2e8f0" }}>
                      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>ANALYSIS FOR THIS JOB</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {[
                          ["overview", "Overview"],
                          ["scans", "Scans"],
                          ["responses", "Responses"],
                          ["expiry", "Expiry"],
                        ].map(([tabValue, tabLabel]) => {
                          const active = currentTab === tabValue;
                          return (
                            <TouchableOpacity
                              key={`${job.id}-${tabValue}`}
                              onPress={() => setAnalysisTab(job.id, tabValue)}
                              style={{
                                borderWidth: 1,
                                borderColor: active ? "#0f172a" : "#dbe3f0",
                                borderRadius: 999,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                backgroundColor: active ? "#0f172a" : "#ffffff",
                                shadowColor: active ? "#0f172a" : "#ffffff",
                                shadowOpacity: active ? 0.15 : 0,
                                shadowRadius: 8,
                                shadowOffset: { width: 0, height: 2 },
                              }}
                            >
                              <Text style={{ color: active ? "#ffffff" : "#0f172a", fontWeight: "700" }}>{tabLabel}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 12, backgroundColor: "#eff6ff", gap: 6 }}>
                        <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>QUICK INSIGHT</Text>
                        <Text style={{ color: "#0f172a", lineHeight: 20 }}>{analysis.insight}</Text>
                      </View>

                      {(currentTab === "overview" || currentTab === "scans") && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Generation Report</Text>
                          <Text style={{ color: "#64748b" }}>Output quality and completion performance for this QR job.</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            <AnalysisStat label="Requested" value={analysis.job?.totalCount || job.totalCount || 0} />
                            <AnalysisStat label="Success" value={analysis.job?.successCount || job.successCount || 0} tone="#047857" />
                            <AnalysisStat label="Failure" value={analysis.job?.failureCount || job.failureCount || 0} tone="#b91c1c" />
                          </View>
                          <ProgressBar label="Successful outputs" value={analysis.job?.successCount || job.successCount || 0} total={Math.max(analysis.job?.totalCount || job.totalCount || 1, 1)} color="#10b981" />
                          <ProgressBar label="Failed outputs" value={analysis.job?.failureCount || job.failureCount || 0} total={Math.max(analysis.job?.totalCount || job.totalCount || 1, 1)} color="#f43f5e" />
                        </View>
                      )}

                      {(currentTab === "overview" || currentTab === "scans" || currentTab === "expiry") && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Usage Report</Text>
                          <Text style={{ color: "#64748b" }}>
                            {hasTrackedEngagement
                              ? "Scan volume, returning visitors, submissions, and expiry health for this QR."
                              : "Tracking is unavailable for this QR right now."}
                          </Text>
                          <View style={{ alignSelf: "flex-start" }}>
                            <PerformanceBadge label={hasTrackedEngagement ? "Tracking active" : "Tracking unavailable"} tone={hasTrackedEngagement ? "success" : "default"} />
                          </View>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            <AnalysisStat label="Scans" value={analysis.engagement?.totalScans || 0} />
                            <AnalysisStat label="Unique" value={analysis.engagement?.uniqueScans || 0} tone="#1d4ed8" />
                            <AnalysisStat label="Repeated" value={analysis.engagement?.repeatedScans || 0} />
                            <AnalysisStat label="Submissions" value={analysis.engagement?.totalSubmissions || 0} tone="#047857" />
                          </View>
                          {(currentTab === "overview" || currentTab === "scans") && (
                            <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#f8fafc", gap: 8 }}>
                              <Text style={{ color: "#0f172a", fontWeight: "700" }}>Scan trend</Text>
                              <Text style={{ color: "#64748b" }}>Recent scan activity for this QR job.</Text>
                              <MiniSparkline points={analysis.scanTrend || []} />
                            </View>
                          )}
                          <ProgressBar label="Unique visitor share" value={analysis.engagement?.uniqueScans || 0} total={Math.max(analysis.engagement?.totalScans || 1, 1)} color="#0ea5e9" />
                          <ProgressBar label="Repeat visitor share" value={analysis.engagement?.repeatedScans || 0} total={Math.max(analysis.engagement?.totalScans || 1, 1)} color="#8b5cf6" />
                          <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Last scan: </Text>{formatDateTime(analysis.engagement?.lastScanAt)}</Text>
                          <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Last submission: </Text>{formatDateTime(analysis.engagement?.lastSubmissionAt)}</Text>
                          <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Expiry date: </Text>{analysis.engagement?.expiryDate ? formatDateTime(analysis.engagement.expiryDate) : "Not set"}</Text>
                          <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Tracking mode: </Text>{analysis.engagement?.trackingMode === "managed-redirect" ? "Managed redirect" : "Direct / device handled"}</Text>
                          <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Engagement type: </Text>{analysis.engagement?.targetKind || job.qrType || "Direct QR"}</Text>
                        </View>
                      )}

                      {currentTab === "overview" && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Actionable Insights</Text>
                          {!hasTrackedEngagement ? <Text style={{ color: "#475569" }}>Tracking is unavailable for this QR right now.</Text> : null}
                          <Text style={{ color: "#475569" }}>{analysis.job?.failureCount > 0 ? `${analysis.job.failureCount} output(s) failed and may need a rerun.` : "Generation quality is clean with no failed outputs recorded."}</Text>
                          <Text style={{ color: "#475569" }}>{(analysis.engagement?.totalScans || 0) > 0 ? `This QR has ${analysis.engagement.uniqueScans || 0} unique scan(s) and ${analysis.engagement.repeatedScans || 0} repeat visit(s).` : "No scan activity yet. Share or print this QR to start collecting engagement."}</Text>
                          <Text style={{ color: "#475569" }}>{analysis.engagement?.expiryDate ? (analysis.engagement?.isExpired ? "Expiry has already been reached." : `Expiry is set for ${formatDateTime(analysis.engagement.expiryDate)}.`) : "No expiry date is set for this QR yet."}</Text>
                          <Text style={{ color: "#475569" }}>{thisJobSuccessRate >= typeAverageSuccessRate && (analysis.engagement?.totalScans || 0) > 0 ? "This job is outperforming the average for its QR type." : "This job is still building enough activity to compare against its QR type average."}</Text>
                        </View>
                      )}

                      {analysis.typePerformance && (currentTab === "overview" || currentTab === "scans") && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>{job.qrType} overall performance</Text>
                          <Text style={{ color: "#64748b" }}>Compare this job against all created QRs of the same type.</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            <AnalysisStat label="Requested" value={analysis.typePerformance.requestedCount} />
                            <AnalysisStat label="Success" value={analysis.typePerformance.successCount} tone="#047857" />
                            <AnalysisStat label="Failure" value={analysis.typePerformance.failureCount} tone="#b91c1c" />
                          </View>
                          <ProgressBar label={`${job.qrType} success rate`} value={analysis.typePerformance.successCount} total={Math.max(analysis.typePerformance.requestedCount || 1, 1)} color="#10b981" />
                        </View>
                      )}

                      {analysis.rating && (currentTab === "overview" || currentTab === "responses") && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Rating response breakdown</Text>
                          {analysis.rating.buckets.map((bucket) => {
                            const max = Math.max(...analysis.rating.buckets.map((entry) => entry.count || 0), 0);
                            return (
                              <View key={bucket.label} style={{ gap: 4 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                  <Text style={{ color: "#334155" }}>{bucket.label}</Text>
                                  <Text style={{ color: "#64748b" }}>{bucket.count}</Text>
                                </View>
                                <View style={{ height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                                  <View style={{ height: "100%", borderRadius: 999, backgroundColor: "#d946ef", width: `${max ? Math.max((bucket.count / max) * 100, 6) : 0}%` }} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {analysis.feedback && (currentTab === "overview" || currentTab === "responses") && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Feedback question summary</Text>
                          {analysis.feedback.questions.map((question) => (
                            <View key={question.label} style={{ borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 6 }}>
                              <Text style={{ color: "#0f172a", fontWeight: "600" }}>{question.label}</Text>
                              <Text style={{ color: "#64748b" }}>{question.responses} responses</Text>
                              {!!question.latestAnswers?.length && (
                                <View style={{ gap: 4 }}>
                                  {question.latestAnswers.map((answer, index) => (
                                    <Text key={`${question.label}-${index}`} style={{ color: "#475569" }}>
                                      - {answer}
                                    </Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      )}

                      {currentTab === "expiry" && (
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Expiry Focus</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            <AnalysisStat label="Expiry State" value={analysis.engagement?.expiryDate ? (analysis.engagement?.isExpired ? "Expired" : "Active") : "Not set"} tone={analysis.engagement?.isExpired ? "#b91c1c" : "#047857"} />
                            <AnalysisStat label="Expiring Soon" value={analysis.engagement?.expiringSoonLinks || 0} tone="#1d4ed8" />
                            <AnalysisStat label="Expired Links" value={analysis.engagement?.expiredLinks || 0} tone="#b91c1c" />
                          </View>
                          <ProgressBar label="Expiring soon share" value={analysis.engagement?.expiringSoonLinks || 0} total={Math.max(analysis.engagement?.managedLinks || 1, 1)} color="#f59e0b" />
                          <ProgressBar label="Expired share" value={analysis.engagement?.expiredLinks || 0} total={Math.max(analysis.engagement?.managedLinks || 1, 1)} color="#f43f5e" />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
