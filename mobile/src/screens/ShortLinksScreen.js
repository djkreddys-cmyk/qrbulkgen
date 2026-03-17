import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Share, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders } from "../lib/api";

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
    return <Text style={{ color: "#94a3b8", fontSize: 12 }}>No visit trend recorded yet.</Text>;
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

export function ShortLinksScreen() {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [links, setLinks] = useState([]);
  const [createdLink, setCreatedLink] = useState(null);
  const [analysisById, setAnalysisById] = useState({});
  const [expandedLinkId, setExpandedLinkId] = useState("");
  const [analysisLoadingId, setAnalysisLoadingId] = useState("");
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
      setError(requestError.message || "Failed to load short links");
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
      setMessage("Short link created successfully.");
      setTitle("");
      setTargetUrl("");
      setSlug("");
      setExpiresAt("");
      await loadLinks(showArchived);
    } catch (requestError) {
      setError(requestError.message || "Unable to create short link");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleShareLink(url) {
    try {
      await Share.share({ message: url, url });
      setMessage("Short link ready to share.");
      setError("");
    } catch (_error) {
      setError("Unable to open the share sheet right now.");
    }
  }

  async function handleOpenLink(url) {
    try {
      await Linking.openURL(url);
    } catch (_error) {
      setError("Unable to open this short link right now.");
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
      setMessage(forceDelete ? "Short link deleted permanently." : "Short link archived.");
      await loadLinks(showArchived || !forceDelete);
    } catch (requestError) {
      setError(requestError.message || "Unable to update this short link right now.");
    }
  }

  function handleDelete(link) {
    const forceDelete = Boolean(link.archivedAt);
    Alert.alert(
      forceDelete ? "Delete Permanently" : "Archive Short Link",
      forceDelete
        ? "This will permanently remove the short link and its visit data."
        : "This short link will move to Archived. You can permanently delete it later.",
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

  async function handleToggleAnalysis(linkId) {
    if (expandedLinkId === linkId) {
      setExpandedLinkId("");
      return;
    }

    setExpandedLinkId(linkId);
    if (analysisById[linkId]) {
      return;
    }

    try {
      setAnalysisLoadingId(linkId);
      const data = await apiRequest(`/short-links/${linkId}/analysis`, {
        headers: createAuthHeaders(token),
      });
      setAnalysisById((prev) => ({
        ...prev,
        [linkId]: data.analysis || null,
      }));
    } catch (requestError) {
      setError(requestError.message || "Failed to load short link analysis");
    } finally {
      setAnalysisLoadingId("");
    }
  }

  return (
    <View style={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Short Links</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Create clean short links like qrbulkgen.com/a7K9xQ, manage expiry, and review click activity from mobile.
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

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Short link analytics</Text>
        <Text style={{ color: "#64748b", lineHeight: 21 }}>
          Monitor active links, click activity, expiry watch, and top-performing destinations in one dashboard-style view.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <MetricCard label="Total Links" value={analytics.totalLinks} helper="All short links under this account." />
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

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>New short link</Text>
        <Text style={{ color: "#64748b", lineHeight: 21 }}>
          Freshly created links appear first in the saved list below.
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
            {isSubmitting ? "Creating..." : "Create Short Link"}
          </Text>
        </TouchableOpacity>
        {createdLink ? (
          <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 12, backgroundColor: "#eff6ff", gap: 4 }}>
            <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>LATEST SHORT LINK</Text>
            <Text style={{ color: "#0f172a", fontWeight: "700" }}>{createdLink.url}</Text>
            <Text style={{ color: "#475569" }}>Target: {createdLink.targetUrl}</Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Saved short links</Text>
            <Text style={{ marginTop: 4, color: "#64748b", lineHeight: 21 }}>
              Track click counts and manage active or archived links separately.
            </Text>
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "700" }}>ARCHIVED</Text>
            <Switch value={showArchived} onValueChange={setShowArchived} />
          </View>
        </View>

        {isLoading ? <Text style={{ color: "#64748b" }}>Loading short links...</Text> : null}

        {!isLoading && !visibleLinks.length ? (
          <EmptyState
            title={showArchived ? "No archived short links yet" : "No short links yet"}
            body={
              showArchived
                ? "Archived links will appear here after you archive them from the active list."
                : "Create your first short link above and it will appear here at the top of the list."
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
                    padding: 14,
                    gap: 10,
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
                        paddingHorizontal: 12,
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
                        paddingHorizontal: 12,
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
                        paddingHorizontal: 12,
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
                      <View style={{ borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 12, backgroundColor: "#eff6ff", gap: 6 }}>
                        <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "700" }}>QUICK INSIGHT</Text>
                        <Text style={{ color: "#0f172a", lineHeight: 20 }}>{analysis.quickInsight}</Text>
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
                        <ProgressBar label="Unique visitors" value={analysis.uniqueVisits} total={Math.max(analysis.totalVisits, 1)} color="#0ea5e9" />
                        <ProgressBar label="Repeat visits" value={analysis.repeatVisits} total={Math.max(analysis.totalVisits, 1)} color="#10b981" />
                      </Card>

                      <Card style={{ padding: 14, gap: 10 }}>
                        <Text style={{ color: "#0f172a", fontWeight: "700" }}>7-day trend</Text>
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
                          <Text style={{ color: "#64748b" }}>No visitor log has been recorded yet for this short link.</Text>
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
    </View>
  );
}
