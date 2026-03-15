import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders } from "../lib/api";

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  const next = params.toString();
  return next ? `?${next}` : "";
}

function formatDateTime(value) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not yet";
  return parsed.toLocaleString();
}

function Card({ children }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 20,
        padding: 18,
        gap: 14,
        backgroundColor: "#ffffff",
      }}
    >
      {children}
    </View>
  );
}

function StatCard({ label, value, tone = "#0f172a" }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 16,
        padding: 12,
        backgroundColor: "#ffffff",
      }}
    >
      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 24, fontWeight: "800", color: tone }}>{value}</Text>
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

function BarChart({ title, rows, color = "#0ea5e9", emptyMessage }) {
  const max = Math.max(...rows.map((row) => row.count || 0), 0);

  return (
    <Card>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>{title}</Text>
      {!rows.length && <Text style={{ color: "#64748b" }}>{emptyMessage}</Text>}
      {!!rows.length && (
        <View style={{ gap: 12 }}>
          {rows.map((row) => (
            <View key={row.label} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: "#334155", fontWeight: "600", flex: 1 }}>{row.label}</Text>
                <Text style={{ color: "#64748b" }}>{row.count}</Text>
              </View>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: color,
                    width: `${max ? Math.max((row.count / max) * 100, 6) : 0}%`,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function DashboardScreen() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [overviewReport, setOverviewReport] = useState(null);
  const [engagementReport, setEngagementReport] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState({});
  const [busyAnalysisJobId, setBusyAnalysisJobId] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const queryString = useMemo(() => buildQuery(filters), [filters]);

  async function loadDashboard(activeQuery = queryString) {
    try {
      const headers = createAuthHeaders(token);
      const [summaryData, jobsData, overviewData, engagementData] = await Promise.all([
        apiRequest(`/qr/jobs/summary${activeQuery}`, { headers }),
        apiRequest(`/qr/jobs?limit=12${activeQuery ? `&${activeQuery.slice(1)}` : ""}`, { headers }),
        apiRequest(`/qr/reports/overview${activeQuery}`, { headers }),
        apiRequest(`/qr/reports/public-engagement${activeQuery}`, { headers }),
      ]);
      setSummary(summaryData.summary || null);
      setJobs(jobsData.jobs || []);
      setOverviewReport(overviewData.report || null);
      setEngagementReport(engagementData.report || null);
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

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Dashboard</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          This dashboard reads the same shared backend data as web, including QR type reports, rating
          insights, feedback summaries, and per-job analysis.
        </Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>Date Filters</Text>
        <View style={{ gap: 10 }}>
          <TextInput
            value={filters.startDate}
            onChangeText={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
            placeholder="Start date (YYYY-MM-DD)"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: "#0f172a",
            }}
          />
          <TextInput
            value={filters.endDate}
            onChangeText={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
            placeholder="End date (YYYY-MM-DD)"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: "#0f172a",
            }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={handleRefresh}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingVertical: 12,
                backgroundColor: "#f8fafc",
              }}
            >
              <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>
                {refreshing ? "Refreshing..." : "Apply / Refresh"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilters({ startDate: "", endDate: "" })}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingVertical: 12,
                backgroundColor: "#ffffff",
              }}
            >
              <Text style={{ color: "#0f172a", textAlign: "center", fontWeight: "700" }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {!!error && (
        <Card>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </Card>
      )}

      {summary ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="TOTAL JOBS" value={summary.totalJobs} />
            <StatCard label="REQUESTED" value={summary.totalRequested} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="SINGLE" value={summary.singleJobs} tone="#1d4ed8" />
            <StatCard label="BULK" value={summary.bulkJobs} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="SUCCESS" value={summary.totalSuccess} tone="#047857" />
            <StatCard label="FAILURE" value={summary.totalFailure} tone="#b91c1c" />
          </View>
        </View>
      ) : (
        <Card>
          <Text style={{ color: "#64748b" }}>Loading summary...</Text>
        </Card>
      )}

      <BarChart
        title="Created QR Types"
        rows={overviewReport?.jobsByQrType || []}
        color="#0ea5e9"
        emptyMessage="No QR type data available yet."
      />
      <BarChart
        title="Job Status Overview"
        rows={overviewReport?.jobsByStatus || []}
        color="#10b981"
        emptyMessage="No status data available yet."
      />
      <BarChart
        title="Daily Job Volume"
        rows={overviewReport?.dailyJobs || []}
        color="#f59e0b"
        emptyMessage="No daily activity available yet."
      />

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>QR Type Analysis</Text>
        {!overviewReport?.qrTypePerformance?.length && (
          <Text style={{ color: "#64748b" }}>No QR type analysis available yet.</Text>
        )}
        {!!overviewReport?.qrTypePerformance?.length && (
          <View style={{ gap: 12 }}>
            {overviewReport.qrTypePerformance.map((item) => (
              <View key={item.label} style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <Text style={{ color: "#0f172a", fontWeight: "700", flex: 1 }}>{item.label}</Text>
                  <Text style={{ color: "#64748b" }}>
                    {item.requestedCount ? `${Math.round((item.successCount / item.requestedCount) * 100)}%` : "0%"}
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                  <View
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      backgroundColor: "#2563eb",
                      width: `${item.requestedCount ? Math.max((item.successCount / item.requestedCount) * 100, 0) : 0}%`,
                    }}
                  />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <MetricPill label="Jobs" value={item.jobsCount} />
                  <MetricPill label="Requested" value={item.requestedCount} />
                  <MetricPill label="Success" value={item.successCount} tone="success" />
                  <MetricPill label="Failure" value={item.failureCount} tone="danger" />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Rating Analytics</Text>
        {!engagementReport?.ratings?.length && (
          <Text style={{ color: "#64748b" }}>No rating submissions yet.</Text>
        )}
        {!!engagementReport?.ratings?.length && (
          <View style={{ gap: 14 }}>
            {engagementReport.ratings.map((item) => (
              <View key={item.title} style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, gap: 8 }}>
                <Text style={{ color: "#0f172a", fontWeight: "700" }}>{item.title}</Text>
                <Text style={{ color: "#64748b" }}>
                  {item.style === "stars" ? "5 Star Rating" : `Number Rating 1-${item.scale}`}
                </Text>
                {item.buckets.map((bucket) => {
                  const max = Math.max(...item.buckets.map((entry) => entry.count || 0), 0);
                  return (
                    <View key={`${item.title}-${bucket.label}`} style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ color: "#334155" }}>{bucket.label}</Text>
                        <Text style={{ color: "#64748b" }}>{bucket.count}</Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                        <View
                          style={{
                            height: "100%",
                            borderRadius: 999,
                            backgroundColor: "#d946ef",
                            width: `${max ? Math.max((bucket.count / max) * 100, 6) : 0}%`,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Feedback Analysis</Text>
        {!engagementReport?.feedback?.length && (
          <Text style={{ color: "#64748b" }}>No feedback submissions yet.</Text>
        )}
        {!!engagementReport?.feedback?.length && (
          <View style={{ gap: 14 }}>
            {engagementReport.feedback.map((group) => (
              <View key={group.title} style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, gap: 8 }}>
                <Text style={{ color: "#0f172a", fontWeight: "700" }}>{group.title}</Text>
                {group.questions.map((question) => (
                  <View key={`${group.title}-${question.label}`} style={{ borderRadius: 16, backgroundColor: "#f8fafc", padding: 12, gap: 6 }}>
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
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Recent Jobs</Text>
        {!jobs.length && <Text style={{ color: "#64748b" }}>No jobs yet.</Text>}
        {!!jobs.length && (
          <View style={{ gap: 12 }}>
            {jobs.map((job) => {
              const analysis = jobAnalysis[job.id];
              const expanded = expandedJobId === job.id;
              return (
                <View key={job.id} style={{ borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, gap: 8 }}>
                  <Text style={{ color: "#0f172a", fontWeight: "700" }}>{job.qrType}</Text>
                  <Text style={{ color: "#475569" }}>
                    {job.jobType} | {job.status}
                  </Text>
                  <Text style={{ color: "#64748b" }}>Source: {job.sourceFileName || "Direct single QR"}</Text>
                  <Text style={{ color: "#64748b" }}>
                    {job.successCount}/{job.totalCount} completed
                  </Text>
                  <Text numberOfLines={1} style={{ color: "#94a3b8", fontSize: 12 }}>
                    {job.id}
                  </Text>
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

                  {expanded && analysis && (
                    <View style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 12, gap: 10 }}>
                      <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>ANALYSIS FOR THIS JOB</Text>
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: "#bfdbfe",
                          borderRadius: 16,
                          padding: 12,
                          backgroundColor: "#eff6ff",
                          gap: 6,
                        }}
                      >
                        <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>QUICK INSIGHT</Text>
                        <Text style={{ color: "#0f172a", lineHeight: 20 }}>{analysis.insight}</Text>
                      </View>

                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: "#dbe3f0",
                          borderRadius: 16,
                          padding: 12,
                          backgroundColor: "#ffffff",
                          gap: 8,
                        }}
                      >
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Generation Report</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          <MetricPill label="Requested" value={analysis.job.totalCount} />
                          <MetricPill label="Success" value={analysis.job.successCount} tone="success" />
                          <MetricPill label="Failure" value={analysis.job.failureCount} tone="danger" />
                          <MetricPill
                            label="Success Rate"
                            value={
                              analysis.job.totalCount
                                ? `${Math.round((analysis.job.successCount / analysis.job.totalCount) * 100)}%`
                                : "0%"
                            }
                            tone="accent"
                          />
                        </View>
                      </View>

                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: "#dbe3f0",
                          borderRadius: 16,
                          padding: 12,
                          backgroundColor: "#ffffff",
                          gap: 8,
                        }}
                      >
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Usage Report</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          <MetricPill label="Scans" value={analysis.engagement?.totalScans || 0} />
                          <MetricPill
                            label="Submissions"
                            value={analysis.engagement?.totalSubmissions || 0}
                            tone="accent"
                          />
                          <MetricPill
                            label="Expiry"
                            value={
                              analysis.engagement?.expiryDate
                                ? analysis.engagement?.isExpired
                                  ? "Expired"
                                  : "Active"
                                : "Not set"
                            }
                            tone={analysis.engagement?.isExpired ? "danger" : "success"}
                          />
                        </View>
                        <View style={{ gap: 4 }}>
                          <Text style={{ color: "#475569" }}>
                            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Last scan: </Text>
                            {formatDateTime(analysis.engagement?.lastScanAt)}
                          </Text>
                          <Text style={{ color: "#475569" }}>
                            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Last submission: </Text>
                            {formatDateTime(analysis.engagement?.lastSubmissionAt)}
                          </Text>
                          <Text style={{ color: "#475569" }}>
                            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Expiry date: </Text>
                            {analysis.engagement?.expiryDate
                              ? formatDateTime(analysis.engagement.expiryDate)
                              : "Not set"}
                          </Text>
                          <Text style={{ color: "#475569" }}>
                            <Text style={{ fontWeight: "700", color: "#0f172a" }}>Engagement type: </Text>
                            {analysis.engagement?.targetKind || "Direct QR / not tracked"}
                          </Text>
                        </View>
                      </View>

                      {analysis.typePerformance && (
                        <View style={{ gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>
                            {analysis.typePerformance.label} overall performance
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            <MetricPill label="Jobs" value={analysis.typePerformance.jobsCount} />
                            <MetricPill label="Requested" value={analysis.typePerformance.requestedCount} />
                            <MetricPill label="Success" value={analysis.typePerformance.successCount} tone="success" />
                            <MetricPill label="Failure" value={analysis.typePerformance.failureCount} tone="danger" />
                          </View>
                        </View>
                      )}

                      {analysis.rating && (
                        <View style={{ gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Rating response breakdown</Text>
                          {analysis.rating.buckets.map((bucket) => {
                            const max = Math.max(...analysis.rating.buckets.map((entry) => entry.count || 0), 0);
                            return (
                              <View key={`${analysis.rating.title}-${bucket.label}`} style={{ gap: 4 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                  <Text style={{ color: "#334155" }}>{bucket.label}</Text>
                                  <Text style={{ color: "#64748b" }}>{bucket.count}</Text>
                                </View>
                                <View style={{ height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
                                  <View
                                    style={{
                                      height: "100%",
                                      borderRadius: 999,
                                      backgroundColor: "#d946ef",
                                      width: `${max ? Math.max((bucket.count / max) * 100, 6) : 0}%`,
                                    }}
                                  />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {analysis.feedback && (
                        <View style={{ gap: 8 }}>
                          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Feedback question summary</Text>
                          {analysis.feedback.questions.map((question) => (
                            <View key={`${analysis.feedback.title}-${question.label}`} style={{ borderRadius: 16, backgroundColor: "#ffffff", padding: 12, gap: 6 }}>
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
