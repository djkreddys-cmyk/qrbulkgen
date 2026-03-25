import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Share, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { useAuth } from "../context/AuthContext";
import { API_BASE_URL, apiRequest, createAuthHeaders } from "../lib/api";
import { downloadRemoteFile } from "../lib/files";

function Card({ children, style }) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: "#dbe3f0",
          borderRadius: 20,
          backgroundColor: "#ffffff",
          padding: 18,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function MetricCard({ label, value, tone = "#0f172a", helper = "" }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 16,
        padding: 12,
        backgroundColor: "#ffffff",
      }}
    >
      <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700" }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "800", color: tone }}>{value}</Text>
      {!!helper && <Text style={{ marginTop: 6, color: "#64748b", fontSize: 12, lineHeight: 18 }}>{helper}</Text>}
    </View>
  );
}

function ProgressBar({ label, value, total, color = "#0ea5e9" }) {
  const percent = total ? Math.max(Math.round((value / total) * 100), value > 0 ? 4 : 0) : 0;

  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ color: "#334155", fontWeight: "600", flex: 1 }}>{label}</Text>
        <Text style={{ color: "#64748b" }}>{value}</Text>
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

function Sparkline({ points }) {
  if (!points?.length) {
    return <Text style={{ color: "#94a3b8", fontSize: 12 }}>No data</Text>;
  }

  const max = Math.max(...points.map((point) => point.count || 0), 1);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6, height: 62 }}>
        {points.map((point, index) => (
          <View key={`${point.label}-${index}`} style={{ flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center" }}>
            <View style={{ height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700" }}>{point.count}</Text>
              <View
                style={{
                  width: points.length === 1 ? 32 : 18,
                  maxWidth: "100%",
                  height: `${Math.max((point.count / max) * 100, point.count > 0 ? 12 : 4)}%`,
                  borderRadius: 999,
                  backgroundColor: point.count > 0 ? "#0ea5e9" : "#dbeafe",
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: "#94a3b8", fontSize: 11 }}>{points[0]?.label || ""}</Text>
        <Text style={{ color: "#94a3b8", fontSize: 11 }}>{points[points.length - 1]?.label || ""}</Text>
      </View>
    </View>
  );
}

function CategoryBarChart({ items }) {
  if (!items?.length) {
    return <Text style={{ color: "#94a3b8", fontSize: 12 }}>No data</Text>;
  }

  const max = Math.max(...items.map((item) => item.value || 0), 1);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8, height: 132, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 12 }}>
        {items.map((item, index) => (
          <View key={`${item.label}-${index}`} style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}>
            <View style={{ height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "700" }}>{item.value}</Text>
              <View
                style={{
                  width: items.length <= 3 ? 56 : 24,
                  maxWidth: "100%",
                  alignSelf: "center",
                  height: `${Math.max(((item.value || 0) / max) * 100, item.value > 0 ? 14 : 4)}%`,
                  borderRadius: 999,
                  backgroundColor: item.color || "#0ea5e9",
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
        {items.map((item, index) => (
          <View key={`${item.label}-meta-${index}`} style={{ flex: 1, flexDirection: "row", justifyContent: "center", borderRadius: 12, backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: item.color || "#0ea5e9" }} />
              <Text style={{ color: "#334155", fontWeight: "600", textAlign: "center" }}>{item.label}</Text>
            </View>
          </View>
        ))}
        </View>
      </View>
    </View>
  );
}

function BreakdownBars({ items }) {
  if (!items?.length) {
    return <Text style={{ color: "#94a3b8", fontSize: 12 }}>No data</Text>;
  }

  const max = Math.max(...items.map((item) => item.value || 0), 1);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 36, borderRadius: 16, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingVertical: 16 }}>
        {items.map((item, index) => (
          <View key={`${item.label}-${index}`} style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>{item.value}</Text>
            <View
              style={{
                width: 28,
                height: Math.max(((item.value || 0) / max) * 120, item.value > 0 ? 42 : 10),
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                backgroundColor: item.color || "#10b981",
              }}
            />
            <Text style={{ color: "#334155", fontWeight: "600" }}>{item.label}</Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>{item.helper || "0%"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatDateTime(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleString();
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

function SectionEyebrow({ children }) {
  return <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", letterSpacing: 2 }}>{children}</Text>;
}

function createTrendFilterState(overrides = {}) {
  return {
    preset: "overall",
    startDate: "",
    endDate: "",
    ...overrides,
  };
}

const ANALYSIS_RANGE_OPTIONS = [
  { value: "overall", label: "Overall" },
  { value: "7d", label: "7 days" },
  { value: "15d", label: "15 days" },
  { value: "30d", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

function getTrendRangeLabel(preset) {
  return ANALYSIS_RANGE_OPTIONS.find((option) => option.value === preset)?.label || "Overall";
}

function buildTrendQuery(filter = {}) {
  const params = new URLSearchParams();
  if (filter?.preset) params.set("trendRange", filter.preset);
  if (filter?.startDate) params.set("startDate", filter.startDate);
  if (filter?.endDate) params.set("endDate", filter.endDate);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function ShortLinksScreen({ variant = "create", mode = "single" }) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [links, setLinks] = useState([]);
  const [createdLink, setCreatedLink] = useState(null);
  const [analysisById, setAnalysisById] = useState({});
  const [trendFiltersById, setTrendFiltersById] = useState({});
  const [expandedLinkId, setExpandedLinkId] = useState("");
  const [analysisLoadingId, setAnalysisLoadingId] = useState("");
  const [downloadingReportId, setDownloadingReportId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function loadLinks(nextShowArchived = showArchived) {
    try {
      const data = await apiRequest(`/short-links?includeArchived=${nextShowArchived ? "true" : "false"}`, {
        headers: createAuthHeaders(token),
      });
      setLinks(data.links || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to load short URLs");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLinks(showArchived);
  }, [showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleLinks = useMemo(() => {
    return showArchived ? links : links.filter((link) => !link.archivedAt);
  }, [links, showArchived]);

  const analytics = useMemo(() => {
    const totalLinks = links.length;
    const archivedLinks = links.filter((link) => Boolean(link.archivedAt)).length;
    const activeLinks = links.filter((link) => !link.archivedAt).length;
    const totalClicks = links.reduce((sum, link) => sum + Number(link.clickCount || 0), 0);
    const clickedLinks = links.filter((link) => Number(link.clickCount || 0) > 0).length;
    const topLink = [...links].sort((a, b) => Number(b.clickCount || 0) - Number(a.clickCount || 0))[0] || null;
    const latestVisit = [...links]
      .filter((link) => link.lastVisitedAt)
      .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime())[0] || null;
    const expiredLinks = links.filter((link) => {
      if (!link.expiresAt) return false;
      const parsed = new Date(link.expiresAt);
      return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
    }).length;
    const expiringSoonLinks = links.filter((link) => {
      if (!link.expiresAt) return false;
      const parsed = new Date(link.expiresAt);
      if (Number.isNaN(parsed.getTime())) return false;
      const diff = parsed.getTime() - Date.now();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
    }).length;

    return {
      totalLinks,
      archivedLinks,
      activeLinks,
      totalClicks,
      clickedLinks,
      topLink,
      latestVisit,
      expiredLinks,
      expiringSoonLinks,
    };
  }, [links]);

  async function handleCreate() {
    setIsSubmitting(true);
    setError("");
    setMessage("");
    setCreatedLink(null);

    try {
      const data = await apiRequest("/short-links", {
        method: "POST",
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          title,
          targetUrl,
          slug,
          expiresAt,
        }),
      });

      setCreatedLink(data.link || null);
      setMessage("Short URL created successfully.");
      setTitle("");
      setTargetUrl("");
      setSlug("");
      setExpiresAt("");
      await loadLinks(showArchived);
    } catch (requestError) {
      setError(requestError.message || "Unable to create short URL");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleShareLink(url) {
    try {
      await Share.share({ message: url, url });
      setMessage("Short URL ready to share.");
      setError("");
    } catch (_error) {
      setError("Unable to open the share sheet right now.");
    }
  }

  async function handleOpenLink(url) {
    try {
      await Linking.openURL(url);
    } catch (_error) {
      setError("Unable to open this short URL right now.");
    }
  }

  async function runDelete(link, forceDelete) {
    try {
      await apiRequest(`/short-links/${link.id}${forceDelete ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: createAuthHeaders(token),
      });
      setExpandedLinkId((current) => (current === link.id ? "" : current));
      setAnalysisById((current) => {
        const next = { ...current };
        delete next[link.id];
        return next;
      });
      setMessage(forceDelete ? "Short URL deleted permanently." : "Short URL archived.");
      await loadLinks(showArchived || !forceDelete);
    } catch (requestError) {
      setError(requestError.message || "Unable to update this short URL right now.");
    }
  }

  function handleDelete(link) {
    const forceDelete = Boolean(link.archivedAt);
    Alert.alert(
      forceDelete ? "Delete Permanently" : "Archive Short URL",
      forceDelete
        ? "This will permanently remove the short URL and its visit data."
        : "This short URL will move to Archived. You can permanently delete it later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: forceDelete ? "Delete Permanently" : "Archive",
          style: forceDelete ? "destructive" : "default",
          onPress: () => runDelete(link, forceDelete),
        },
      ],
    );
  }

  async function loadAnalysis(linkId, filter = createTrendFilterState()) {
    try {
      setAnalysisLoadingId(linkId);
      const data = await apiRequest(`/short-links/${linkId}/analysis${buildTrendQuery(filter)}`, {
        headers: createAuthHeaders(token),
      });
      setAnalysisById((prev) => ({
        ...prev,
        [linkId]: data.analysis || null,
      }));
    } catch (requestError) {
      setError(requestError.message || "Failed to load short URL analysis");
    } finally {
      setAnalysisLoadingId("");
    }
  }

  async function handleToggleAnalysis(linkId) {
    if (expandedLinkId === linkId) {
      setExpandedLinkId("");
      return;
    }

    setExpandedLinkId(linkId);
    const filter = trendFiltersById[linkId] || createTrendFilterState();
    if (!trendFiltersById[linkId]) {
      setTrendFiltersById((prev) => ({ ...prev, [linkId]: filter }));
    }
    if (analysisById[linkId]) {
      return;
    }
    await loadAnalysis(linkId, filter);
  }

  useEffect(() => {
    if (!expandedLinkId) {
      return;
    }

    const timer = setInterval(() => {
      const filter = trendFiltersById[expandedLinkId] || createTrendFilterState();
      loadAnalysis(expandedLinkId, filter);
    }, 30000);

    return () => clearInterval(timer);
  }, [expandedLinkId, trendFiltersById]);

  async function handleDownloadAnalysisReport(link) {
    try {
      setDownloadingReportId(link.id);
      const safeName = String(link.title || link.slug || "short-link").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const savedPath = await downloadRemoteFile({
        url: `${API_BASE_URL}/short-links/${link.id}/analysis-report.csv`,
        fileName: `${safeName || "short-link"}-analysis-report-${link.id}.csv`,
        headers: createAuthHeaders(token),
      });
      setMessage(`Excel saved: ${savedPath}`);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to download short URL analysis report");
    } finally {
      setDownloadingReportId("");
    }
  }

  const isDashboardVariant = variant === "dashboard";

  return (
    <View style={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <SectionEyebrow>CONTROL CENTER</SectionEyebrow>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>{isDashboardVariant ? `${mode === "bulk" ? "Bulk" : "Single"} Short URL Analysis` : "Short URL"}</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          {isDashboardVariant
            ? `Open ${mode} short URL analysis here. Saved short URLs are not yet tagged separately by creation mode, so this mobile view currently shows the same saved link dataset under both tabs.`
            : "Create clean short URLs like qrbulkgen.com/a7K9xQ, manage expiry, and then review analytics from the dashboard workspace."}
        </Text>
      </Card>

      {!!message && (
        <Card>
          <Text style={{ color: "#047857" }}>{message}</Text>
        </Card>
      )}

      {!!error && (
        <Card>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </Card>
      )}

      {isDashboardVariant ? (
      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Short URL analytics</Text>
        <Text style={{ color: "#64748b", lineHeight: 21 }}>
          Monitor active links, click activity, expiry watch, and top-performing destinations in one dashboard-style view.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <MetricCard label="Total URLs" value={analytics.totalLinks} helper="All short URLs under this account." />
          <MetricCard label="Active Links" value={analytics.activeLinks} tone="#047857" helper="Available for sharing now." />
          <MetricCard label="Total Clicks" value={analytics.totalClicks} tone="#1d4ed8" helper="Combined visits across your links." />
          <MetricCard label="Archived" value={analytics.archivedLinks} tone="#b91c1c" helper="Reviewable or deletable later." />
        </View>
        <View style={{ gap: 10 }}>
          <ProgressBar label="Links with visits" value={analytics.clickedLinks} total={Math.max(analytics.totalLinks, 1)} color="#0ea5e9" />
          <ProgressBar label="Expiring in 7 days" value={analytics.expiringSoonLinks} total={Math.max(analytics.totalLinks, 1)} color="#f59e0b" />
          <ProgressBar label="Expired links" value={analytics.expiredLinks} total={Math.max(analytics.totalLinks, 1)} color="#f43f5e" />
        </View>
        {analytics.topLink ? (
          <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 12, backgroundColor: "#eff6ff", gap: 6 }}>
            <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>TOP PERFORMER</Text>
            <Text style={{ color: "#0f172a", fontWeight: "700" }}>{analytics.topLink.title || analytics.topLink.slug}</Text>
            <Text style={{ color: "#475569" }}>{analytics.topLink.clickCount} clicks</Text>
          </View>
        ) : null}
        {analytics.latestVisit ? (
          <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#f8fafc", gap: 4 }}>
            <Text style={{ color: "#0f172a", fontWeight: "700" }}>Latest activity</Text>
            <Text style={{ color: "#475569" }}>{analytics.latestVisit.title || analytics.latestVisit.slug}</Text>
            <Text style={{ color: "#64748b" }}>Visited: {formatDateTime(analytics.latestVisit.lastVisitedAt)}</Text>
          </View>
        ) : null}
      </Card>
      ) : null}

      {!isDashboardVariant ? (
      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>{isDashboardVariant ? "Create short URL" : "New short URL"}</Text>
        <Text style={{ color: "#64748b", lineHeight: 21 }}>
          {isDashboardVariant
            ? "Create a short URL here, then review saved short URLs and analysis below."
            : "Open the dashboard workspace to review saved short URLs and analysis."}
        </Text>
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>TITLE</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Campaign landing page"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: "#0f172a",
            }}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>TARGET URL</Text>
          <TextInput
            value={targetUrl}
            onChangeText={setTargetUrl}
            placeholder="https://example.com"
            autoCapitalize="none"
            keyboardType="url"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: "#0f172a",
            }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>CUSTOM SLUG</Text>
            <TextInput
              value={slug}
              onChangeText={setSlug}
              placeholder="event2026"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>EXPIRY</Text>
            <TextInput
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="DD-MM-YYYY"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: "#0f172a",
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isSubmitting}
          style={{
            backgroundColor: "#0f172a",
            paddingVertical: 14,
            borderRadius: 16,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#ffffff", textAlign: "center", fontWeight: "700" }}>
            {isSubmitting ? "Creating..." : "Create Short URL"}
          </Text>
        </TouchableOpacity>
        {createdLink ? (
          <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 12, backgroundColor: "#eff6ff", gap: 4 }}>
            <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>LATEST SHORT URL</Text>
            <Text style={{ color: "#0f172a", fontWeight: "700" }}>{createdLink.url}</Text>
            <Text style={{ color: "#475569" }}>Target: {createdLink.targetUrl}</Text>
          </View>
        ) : null}
      </Card>
      ) : null}

      {isDashboardVariant ? (
      <Card>
        <SectionEyebrow>ANALYTICS</SectionEyebrow>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Saved short URLs</Text>
            <Text style={{ marginTop: 4, color: "#64748b", lineHeight: 21 }}>
              Track click counts and manage active or archived links separately.
            </Text>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>ARCHIVED</Text>
            <Switch value={showArchived} onValueChange={setShowArchived} />
          </View>
        </View>

        {isLoading ? <Text style={{ color: "#64748b" }}>Loading short URLs...</Text> : null}

        {!isLoading && !visibleLinks.length ? (
          <EmptyState
            title={showArchived ? "No archived short URLs yet" : "No short URLs yet"}
            body={
              showArchived
                ? "Archived URLs will appear here after you archive them from the active list."
                : "Create your first short URL above and it will appear here at the top of the list."
            }
          />
        ) : null}

        {!!visibleLinks.length && (
          <View style={{ gap: 14 }}>
            {visibleLinks.map((link) => {
              const analysis = analysisById[link.id];
              const expanded = expandedLinkId === link.id;
              const loading = analysisLoadingId === link.id;

              return (
                <View
                  key={link.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 20,
                    padding: Number(link.clickCount || 0) > 0 || expanded ? 14 : 12,
                    gap: Number(link.clickCount || 0) > 0 || expanded ? 10 : 8,
                    backgroundColor: "#ffffff",
                  }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: link.archivedAt ? "#fffbeb" : "#f1f5f9" }}>
                      <Text style={{ color: link.archivedAt ? "#b45309" : "#475569", fontWeight: "700", fontSize: 12 }}>
                        {link.archivedAt ? "ARCHIVED" : "ACTIVE"}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#eff6ff" }}>
                      <Text style={{ color: "#1d4ed8", fontWeight: "700", fontSize: 12 }}>Clicks: {link.clickCount}</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#0f172a", fontWeight: "700", fontSize: 18 }}>{link.title || link.slug}</Text>
                  <Text style={{ color: "#0f172a" }}>{link.url}</Text>
                  <Text style={{ color: "#64748b" }}>Target: {link.targetUrl}</Text>
                  <Text style={{ color: "#64748b" }}>Created: {formatDateTime(link.createdAt)}</Text>
                  <Text style={{ color: "#64748b" }}>Last visit: {formatDateTime(link.lastVisitedAt)}</Text>
                  <Text style={{ color: "#64748b" }}>Expiry: {formatDateTime(link.expiresAt)}</Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => handleShareLink(link.url)}
                      style={{
                        borderWidth: 1,
                        borderColor: "#cbd5e1",
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Text style={{ color: "#0f172a", fontWeight: "700" }}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleOpenLink(link.url)}
                      style={{
                        borderWidth: 1,
                        borderColor: "#93c5fd",
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        backgroundColor: "#eff6ff",
                      }}
                    >
                      <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleToggleAnalysis(link.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: "#93c5fd",
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        backgroundColor: expanded ? "#dbeafe" : "#eff6ff",
                      }}
                    >
                      <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>
                        {expanded ? "Hide Analysis" : loading ? "Loading..." : "Analysis"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(link)}
                      style={{
                        borderWidth: 1,
                        borderColor: link.archivedAt ? "#fda4af" : "#fcd34d",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: link.archivedAt ? "#fff1f2" : "#fffbeb",
                      }}
                    >
                      <Text style={{ color: link.archivedAt ? "#b91c1c" : "#b45309", fontWeight: "700" }}>
                        {link.archivedAt ? "Delete Permanently" : "Archive"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {expanded && analysis ? (
                    <View style={{ borderRadius: 18, backgroundColor: "#f8fafc", padding: 12, gap: 10, borderWidth: 1, borderColor: "#e2e8f0" }}>
                      <TouchableOpacity
                        onPress={() => handleDownloadAnalysisReport(link)}
                        disabled={downloadingReportId === link.id}
                        style={{
                          alignSelf: "flex-start",
                          borderWidth: 1,
                          borderColor: "#cbd5e1",
                          borderRadius: 14,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          backgroundColor: "#0f172a",
                          opacity: downloadingReportId === link.id ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                          {downloadingReportId === link.id ? "Preparing Excel..." : "Download Excel"}
                        </Text>
                      </TouchableOpacity>

                      <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#ffffff", gap: 8 }}>
                        <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>ANALYSIS FILTER</Text>
                        <Text style={{ color: "#475569", lineHeight: 20 }}>Overall report is shown first. Choose a range to refresh only the filtered trend below.</Text>
                        <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 12, backgroundColor: "#ffffff", overflow: "hidden" }}>
                          <Picker
                            selectedValue={(trendFiltersById[link.id] || createTrendFilterState()).preset}
                            onValueChange={(value) => {
                              const currentFilter = trendFiltersById[link.id] || createTrendFilterState();
                              const next = {
                                ...currentFilter,
                                preset: value,
                                startDate: value === "overall" ? "" : currentFilter.startDate,
                                endDate: value === "overall" ? "" : currentFilter.endDate,
                              };
                              setTrendFiltersById((prev) => ({ ...prev, [link.id]: next }));
                              if (value !== "custom") {
                                loadAnalysis(link.id, next);
                              }
                            }}
                          >
                            {ANALYSIS_RANGE_OPTIONS.map((option) => (
                              <Picker.Item key={`m-short-filter-${link.id}-${option.value}`} label={option.label} value={option.value} />
                            ))}
                          </Picker>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        <MetricCard label="Total Visits" value={analysis.totalVisits} tone="#1d4ed8" />
                        <MetricCard label="Unique Visits" value={analysis.uniqueVisits} tone="#047857" />
                        <MetricCard label="Repeat Visits" value={analysis.repeatVisits} />
                        <MetricCard
                          label="Expiry State"
                          value={analysis.isExpired ? "Expired" : analysis.expiresAt ? "Scheduled" : "Open"}
                          tone={analysis.isExpired ? "#b91c1c" : "#0f172a"}
                        />
                      </View>

                      <Card style={{ padding: 14, gap: 10 }}>
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Visit breakdown</Text>
                        <BreakdownBars
                          items={[
                            {
                              label: "Unique scans",
                              value: (trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.uniqueVisits : analysis.filteredUniqueVisits,
                              helper: ((trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.totalVisits : analysis.filteredTotalVisits)
                                ? `${Math.round((((trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.uniqueVisits : analysis.filteredUniqueVisits) / Math.max(((trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.totalVisits : analysis.filteredTotalVisits), 1)) * 100)}%`
                                : "0%",
                              color: "#10b981",
                            },
                            {
                              label: "Repeated users",
                              value: (trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.repeatVisits : analysis.filteredRepeatVisits,
                              helper: ((trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.totalVisits : analysis.filteredTotalVisits)
                                ? `${Math.round((((trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.repeatVisits : analysis.filteredRepeatVisits) / Math.max(((trendFiltersById[link.id] || createTrendFilterState()).preset === "overall" ? analysis.totalVisits : analysis.filteredTotalVisits), 1)) * 100)}%`
                                : "0%",
                              color: "#ef4444",
                            },
                          ]}
                        />
                      </Card>

                      <Card style={{ padding: 14, gap: 10 }}>
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Trend</Text>
                        <View style={{ alignSelf: "flex-start" }}>
                          <View style={{ borderRadius: 999, backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>
                              Range: {getTrendRangeLabel((trendFiltersById[link.id] || createTrendFilterState()).preset)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TextInput
                            value={(trendFiltersById[link.id] || createTrendFilterState()).startDate}
                            onChangeText={(value) => setTrendFiltersById((prev) => ({ ...prev, [link.id]: { ...(prev[link.id] || createTrendFilterState()), preset: "custom", startDate: value } }))}
                            placeholder="Start YYYY-MM-DD"
                            placeholderTextColor="#94a3b8"
                            style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#0f172a" }}
                          />
                          <TextInput
                            value={(trendFiltersById[link.id] || createTrendFilterState()).endDate}
                            onChangeText={(value) => setTrendFiltersById((prev) => ({ ...prev, [link.id]: { ...(prev[link.id] || createTrendFilterState()), preset: "custom", endDate: value } }))}
                            placeholder="End YYYY-MM-DD"
                            placeholderTextColor="#94a3b8"
                            style={{ flex: 1, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#ffffff", color: "#0f172a" }}
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => loadAnalysis(link.id, { ...(trendFiltersById[link.id] || createTrendFilterState()), preset: "custom" })}
                          style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#0f172a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#0f172a" }}
                        >
                          <Text style={{ color: "#ffffff", fontWeight: "700" }}>Apply custom range</Text>
                        </TouchableOpacity>
                        <Sparkline points={analysis.trend || []} />
                      </Card>

                      <Card style={{ padding: 14, gap: 8 }}>
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Link details</Text>
                        <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Short URL: </Text>{link.url}</Text>
                        <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Target: </Text>{analysis.targetUrl}</Text>
                        <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Created: </Text>{formatDateTime(analysis.createdAt)}</Text>
                        <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Last visit: </Text>{formatDateTime(analysis.lastVisitedAt)}</Text>
                        <Text style={{ color: "#475569" }}><Text style={{ fontWeight: "700", color: "#0f172a" }}>Expiry: </Text>{formatDateTime(analysis.expiresAt)}</Text>
                      </Card>

                      <Card style={{ padding: 14, gap: 8 }}>
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Recent visitors</Text>
                        {(analysis.latestVisitors || []).length ? (
                          (analysis.latestVisitors || []).map((visitor, index) => (
                            <View
                              key={`${visitor.visitedAt}-${index}`}
                              style={{
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: "#dbe3f0",
                                backgroundColor: "#ffffff",
                                padding: 12,
                                gap: 4,
                              }}
                            >
                              <Text style={{ color: "#0f172a", fontWeight: "700" }}>{formatDateTime(visitor.visitedAt)}</Text>
                              <Text style={{ color: "#475569" }}>{visitor.userAgent || "Unknown browser"}</Text>
                              <Text style={{ color: "#94a3b8", fontSize: 12 }}>{visitor.ipAddress || "IP unavailable"}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={{ color: "#64748b" }}>No visitor log has been recorded yet for this short URL.</Text>
                        )}
                      </Card>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>
      ) : null}
    </View>
  );
}
