import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";

import { useAuth } from "../context/AuthContext";
import { apiRequest, createAuthHeaders } from "../lib/api";
import { shareDataUrlFile } from "../lib/files";
import {
  addMonths,
  addSocialLinkRow,
  buildQrContent,
  formatExpiryDateForInput,
  getManagedTitleForQrType,
  getAvailableSocialPlatforms,
  getQrPlaceholder,
  hasRequiredFields,
  INITIAL_QR_FIELDS,
  QR_FIELD_DEFINITIONS,
  QR_TYPES,
  SOCIAL_PLATFORM_OPTIONS,
  parseExpiryDate,
  supportsExpiry,
} from "../lib/qr";

const FORMATS = ["png", "svg"];
const EC_LEVELS = ["L", "M", "Q", "H"];
const APP_ORIGIN = "https://www.qrbulkgen.com";

function FieldLabel({ children }) {
  return <Text style={{ fontSize: 12, fontWeight: "700", color: "#475569", letterSpacing: 0.4 }}>{children}</Text>;
}

function Card({ children }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#dbe3f0",
        borderRadius: 20,
        backgroundColor: "#ffffff",
        padding: 18,
        gap: 14,
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

function InputField({ label, value, onChangeText, placeholder, multiline = false, keyboardType = "default", editable = true }) {
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        editable={editable}
        keyboardType={keyboardType}
        style={{
          minHeight: multiline ? 96 : undefined,
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          textAlignVertical: multiline ? "top" : "center",
          color: editable ? "#0f172a" : "#64748b",
          backgroundColor: editable ? "#ffffff" : "#f8fafc",
        }}
      />
    </View>
  );
}

function PickerField({ label, value, options, onChange }) {
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 16, overflow: "hidden" }}>
        <Picker selectedValue={value} onValueChange={onChange}>
          {options.map((option) => (
            <Picker.Item key={option.value || option} label={option.label || option} value={option.value || option} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

function ToggleTabs({ value, options, onChange }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: active ? "#0f172a" : "#cbd5e1",
              borderRadius: 14,
              paddingVertical: 10,
              backgroundColor: active ? "#0f172a" : "#ffffff",
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "700", color: active ? "#ffffff" : "#0f172a" }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ActionButton({ title, onPress, disabled = false, tone = "dark" }) {
  const styles =
    tone === "light"
      ? { backgroundColor: "#e2e8f0", color: "#0f172a" }
      : { backgroundColor: "#0f172a", color: "#ffffff" };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: styles.backgroundColor,
        paddingVertical: 14,
        borderRadius: 16,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ color: styles.color, textAlign: "center", fontWeight: "700" }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SingleGenerateScreen() {
  const { token, singleDraft, setSingleDraft } = useAuth();
  const skipQrTypeResetRef = useRef(false);
  const [qrType, setQrType] = useState("URL");
  const [fields, setFields] = useState(INITIAL_QR_FIELDS);
  const [socialLinks, setSocialLinks] = useState([{ platform: "Instagram", customPlatform: "", url: "" }]);
  const [filenamePrefix, setFilenamePrefix] = useState("mobile-qr");
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [format, setFormat] = useState("png");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M");
  const [expiryDate, setExpiryDate] = useState("");
  const [galleryMode, setGalleryMode] = useState("url");
  const [pdfMode, setPdfMode] = useState("url");
  const [galleryAssets, setGalleryAssets] = useState([]);
  const [pdfAsset, setPdfAsset] = useState(null);
  const [galleryLinkId, setGalleryLinkId] = useState("");
  const [pdfLinkId, setPdfLinkId] = useState("");
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [artifact, setArtifact] = useState(null);
  const [job, setJob] = useState(null);
  const [editingJobId, setEditingJobId] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const isEditing = Boolean(editingJobId);
  const lockContent = isEditing && qrType !== "Feedback";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const generatedContent = useMemo(
    () =>
      hasRequiredFields(
        qrType,
        fields,
        { galleryLinkId, pdfLinkId },
        { galleryMode, pdfMode },
        socialLinks,
      )
        ? buildQrContent(qrType, fields, {
            appOrigin: APP_ORIGIN,
            socialLinks,
            ids: { galleryLinkId, pdfLinkId },
            modes: { galleryMode, pdfMode },
            expiryDate,
          })
        : "",
    [qrType, fields, galleryLinkId, pdfLinkId, galleryMode, pdfMode, socialLinks, expiryDate],
  );

  const previewSource = useMemo(() => {
    if (!artifact?.dataUrl) return null;
    if ((artifact.mimeType || "").startsWith("image/") || String(artifact.dataUrl).startsWith("data:image/")) {
      return { uri: artifact.dataUrl };
    }
    return null;
  }, [artifact]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function updateLocationField(name, value) {
    setFields((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "mapsUrl") {
        const match = String(value || "").match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
        if (match) {
          next.latitude = match[1];
          next.longitude = match[2];
        }
      }
      if ((name === "latitude" || name === "longitude") && next.latitude && next.longitude && !next.mapsUrl) {
        next.mapsUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(next.latitude)}&mlon=${encodeURIComponent(next.longitude)}#map=16/${encodeURIComponent(next.latitude)}/${encodeURIComponent(next.longitude)}`;
      }
      return next;
    });
  }

  function handleLocationSelect(nextLocation) {
    setFields((prev) => ({
      ...prev,
      locationName: nextLocation.locationName || prev.locationName,
      locationAddress: nextLocation.locationAddress || prev.locationAddress,
      mapsUrl: nextLocation.mapsUrl || prev.mapsUrl,
      latitude: nextLocation.latitude || prev.latitude,
      longitude: nextLocation.longitude || prev.longitude,
    }));
  }

  function buildGoogleMapsPreviewUrl() {
    const mapsUrl = String(fields.mapsUrl || "").trim();
    if (mapsUrl) {
      return `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(mapsUrl)}`;
    }

    const latitude = String(fields.latitude || "").trim();
    const longitude = String(fields.longitude || "").trim();
    if (latitude && longitude) {
      return `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(`${latitude},${longitude}`)}`;
    }

    const query = String(fields.locationAddress || fields.locationName || "").trim();
    if (query) {
      return `https://maps.google.com/maps?output=embed&q=${encodeURIComponent(query)}`;
    }

    return "";
  }

  function renderLockedContentSummary() {
    const entries = (QR_FIELD_DEFINITIONS[qrType] || [])
      .filter((field) => field.key !== "feedbackQuestions" && field.key !== "socialLinks")
      .map((field) => [field.label, fields[field.key]])
      .filter(([, value]) => {
        if (typeof value === "boolean") return value;
        return String(value || "").trim();
      });

    return (
      <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12, backgroundColor: "#f8fafc", gap: 8 }}>
        <Text style={{ color: "#0f172a", fontWeight: "700" }}>Content is locked for this QR</Text>
        <Text style={{ color: "#64748b", lineHeight: 20 }}>
          You can update expiry and styling, then save a fresh version. QR type and core content stay unchanged.
        </Text>
        {entries.map(([label, value]) => (
          <View key={label} style={{ flexDirection: "row", gap: 10 }}>
            <Text style={{ width: 120, color: "#64748b", fontWeight: "700" }}>{label}</Text>
            <Text style={{ flex: 1, color: "#475569" }}>{String(value)}</Text>
          </View>
        ))}
      </View>
    );
  }

  useEffect(() => {
    if (!singleDraft) return;

    skipQrTypeResetRef.current = true;
    async function loadDraft() {
      if (singleDraft.editJobId) {
        try {
          const payloadData = await apiRequest(`/qr/jobs/${singleDraft.editJobId}/edit-payload`, {
            headers: createAuthHeaders(token),
          });
          const nextJob = payloadData?.job;
          if (nextJob?.jobType === "single") {
            const targetPayload = nextJob.targetPayload || {};
            setEditingJobId(nextJob.id || singleDraft.editJobId);
            setQrType(targetPayload.qrType || nextJob.qrType || "URL");
            setFields((prev) => ({ ...prev, ...(targetPayload.fields || {}) }));
            setSocialLinks(
              Array.isArray(targetPayload.socialLinks) && targetPayload.socialLinks.length
                ? targetPayload.socialLinks
                : [{ platform: "Instagram", customPlatform: "", url: "" }],
            );
            setGalleryMode(targetPayload.galleryMode || "url");
            setPdfMode(targetPayload.pdfMode || "url");
            setGalleryLinkId(targetPayload.uploadIds?.galleryLinkId || "");
            setPdfLinkId(targetPayload.uploadIds?.pdfLinkId || "");
            setForegroundColor(nextJob.foregroundColor || "#000000");
            setBackgroundColor(nextJob.backgroundColor || "#ffffff");
            setFilenamePrefix(nextJob.filenamePrefix || "mobile-qr");
            setErrorCorrectionLevel(nextJob.errorCorrectionLevel || "M");
            setExpiryDate(formatExpiryDateForInput(targetPayload.expiresAt || nextJob.expiresAt || ""));
            setAnalysisLoading(true);
            const analysisData = await apiRequest(`/qr/jobs/${singleDraft.editJobId}/analysis`, {
              headers: createAuthHeaders(token),
            });
            setAnalysis(analysisData.analysis || null);
          }
        } catch (requestError) {
          setError(requestError.message || "Failed to load QR for editing");
        } finally {
          setAnalysisLoading(false);
          setSingleDraft(null);
        }
        return;
      }

      if (singleDraft.qrType) {
        setQrType(singleDraft.qrType);
        setFields((prev) => ({ ...prev, ...(singleDraft.fields || {}) }));
      }
      setSingleDraft(null);
    }

    loadDraft();
  }, [singleDraft, setSingleDraft]);

  useEffect(() => {
    if (skipQrTypeResetRef.current) {
      skipQrTypeResetRef.current = false;
      setArtifact(null);
      setJob(null);
      setError("");
      setShareMessage("");
      return;
    }

    setFields(INITIAL_QR_FIELDS);
    setSocialLinks([{ platform: "Instagram", customPlatform: "", url: "" }]);
    setGalleryMode("url");
    setPdfMode("url");
    setGalleryAssets([]);
    setPdfAsset(null);
    setGalleryLinkId("");
    setPdfLinkId("");
    setUploadMessage("");
    setArtifact(null);
    setJob(null);
    setAnalysis(null);
    setEditingJobId("");
    setError("");
    setShareMessage("");
    setExpiryDate("");
  }, [qrType]);

  async function handlePickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", ".pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setPdfAsset(asset);
    setPdfLinkId("");
    setUploadMessage("");
    setError("");
  }

  async function handlePickGallery() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const assets = result.assets || [];
    setGalleryAssets(assets.slice(0, 10));
    setGalleryLinkId("");
    setUploadMessage("");
    setError("");
  }

  async function uploadPdf() {
    if (!pdfAsset?.uri) {
      setError("Please choose a PDF file first.");
      return;
    }
    try {
      setUploadingPdf(true);
      setError("");
      setUploadMessage("");
      const formData = new FormData();
      formData.append("pdf", {
        uri: pdfAsset.uri,
        name: pdfAsset.name || `document-${Date.now()}.pdf`,
        type: pdfAsset.mimeType || "application/pdf",
      });
      formData.append("title", pdfAsset.name || "PDF Document");
      const data = await apiRequest("/public/upload/pdf", {
        method: "POST",
        headers: createAuthHeaders(token),
        body: formData,
      });
      setPdfLinkId(data?.link?.id || "");
      setUploadMessage("PDF uploaded successfully.");
    } catch (requestError) {
      setError(requestError.message || "Failed to upload PDF");
    } finally {
      setUploadingPdf(false);
    }
  }

  async function uploadGallery() {
    if (!galleryAssets.length) {
      setError("Please choose image files first.");
      return;
    }
    try {
      setUploadingGallery(true);
      setError("");
      setUploadMessage("");
      const formData = new FormData();
      galleryAssets.forEach((asset, index) => {
        formData.append("images", {
          uri: asset.uri,
          name: asset.name || `image-${index + 1}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      });
      formData.append("title", "Image Gallery");
      const data = await apiRequest("/public/upload/gallery", {
        method: "POST",
        headers: createAuthHeaders(token),
        body: formData,
      });
      setGalleryLinkId(data?.link?.id || "");
      setUploadMessage("Gallery uploaded successfully.");
    } catch (requestError) {
      setError(requestError.message || "Failed to upload gallery");
    } finally {
      setUploadingGallery(false);
    }
  }

  async function handleGenerate() {
    if (!generatedContent) {
      setError("Please fill the required fields for this QR type.");
      return;
    }

    setBusy(true);
    setError("");
    setShareMessage("");
    try {
      const data = await apiRequest(editingJobId ? `/qr/jobs/${editingJobId}/single` : "/qr/single", {
        method: editingJobId ? "PUT" : "POST",
        headers: createAuthHeaders(token),
        body: JSON.stringify({
          content: generatedContent,
          qrType,
          fields,
          socialLinks,
          galleryMode,
          pdfMode,
          galleryLinkId,
          pdfLinkId,
          managedTitle: getManagedTitleForQrType(qrType, fields),
          expiresAt: (parseExpiryDate(expiryDate) || addMonths(new Date(), 6)).toISOString(),
          filenamePrefix,
          foregroundColor,
          backgroundColor,
          size: 512,
          margin: 2,
          format,
          errorCorrectionLevel,
        }),
      });

      setArtifact(data.artifact || null);
      setJob(data.job || null);
      if (editingJobId) {
        const analysisData = await apiRequest(`/qr/jobs/${editingJobId}/analysis`, {
          headers: createAuthHeaders(token),
        });
        setAnalysis(analysisData.analysis || null);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to generate QR");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!artifact?.dataUrl) return;
    try {
      const sharedPath = await shareDataUrlFile({
        dataUrl: artifact.dataUrl,
        fileName: artifact.fileName,
      });
      setShareMessage(`Shared ${sharedPath.split(/[\\/]/).pop()}`);
    } catch (shareError) {
      setError(shareError.message || "Failed to share QR file");
    }
  }

  function renderTypeFields() {
    if (lockContent) {
      return renderLockedContentSummary();
    }
    if (qrType === "URL") {
      return <InputField label="URL" value={fields.url} onChangeText={(value) => setField("url", value)} placeholder="https://example.com" />;
    }
    if (qrType === "Text") {
      return <InputField label="Text" value={fields.text} onChangeText={(value) => setField("text", value)} placeholder="Enter text" multiline />;
    }
    if (qrType === "Email") {
      return (
        <>
          <InputField label="Email" value={fields.email} onChangeText={(value) => setField("email", value)} placeholder="hello@example.com" keyboardType="email-address" />
          <InputField label="Subject (optional)" value={fields.subject} onChangeText={(value) => setField("subject", value)} placeholder="Subject" />
          <InputField label="Body (optional)" value={fields.body} onChangeText={(value) => setField("body", value)} placeholder="Message body" multiline />
        </>
      );
    }
    if (qrType === "Phone") {
      return <InputField label="Phone" value={fields.phone} onChangeText={(value) => setField("phone", value)} placeholder="+919999999999" keyboardType="phone-pad" />;
    }
    if (qrType === "SMS") {
      return (
        <>
          <InputField label="SMS Phone" value={fields.smsPhone} onChangeText={(value) => setField("smsPhone", value)} placeholder="+919999999999" keyboardType="phone-pad" />
          <InputField label="SMS Message" value={fields.smsMessage} onChangeText={(value) => setField("smsMessage", value)} placeholder="Type your message" multiline />
        </>
      );
    }
    if (qrType === "WhatsApp") {
      return (
        <>
          <InputField label="WhatsApp Number" value={fields.whatsappPhone} onChangeText={(value) => setField("whatsappPhone", value)} placeholder="+919999999999" keyboardType="phone-pad" />
          <InputField label="WhatsApp Message" value={fields.whatsappMessage} onChangeText={(value) => setField("whatsappMessage", value)} placeholder="Message (optional)" multiline />
        </>
      );
    }
    if (qrType === "vCard") {
      return (
        <>
          <InputField label="First Name" value={fields.firstName} onChangeText={(value) => setField("firstName", value)} placeholder="John" />
          <InputField label="Last Name" value={fields.lastName} onChangeText={(value) => setField("lastName", value)} placeholder="Doe" />
          <InputField label="Organization" value={fields.organization} onChangeText={(value) => setField("organization", value)} placeholder="QRBulkGen" />
          <InputField label="Job Title" value={fields.jobTitle} onChangeText={(value) => setField("jobTitle", value)} placeholder="Manager" />
          <InputField label="Phone" value={fields.vcardPhone} onChangeText={(value) => setField("vcardPhone", value)} placeholder="+919999999999" keyboardType="phone-pad" />
          <InputField label="Email" value={fields.vcardEmail} onChangeText={(value) => setField("vcardEmail", value)} placeholder="john@example.com" keyboardType="email-address" />
          <InputField label="Website URL" value={fields.vcardUrl} onChangeText={(value) => setField("vcardUrl", value)} placeholder="https://example.com" />
          <InputField label="Address" value={fields.address} onChangeText={(value) => setField("address", value)} placeholder="Address" multiline />
        </>
      );
    }
    if (qrType === "Location") {
      return (
        <>
          <InputField label="Place name" value={fields.locationName} onChangeText={(value) => updateLocationField("locationName", value)} placeholder="Office, store, event venue" />
          <InputField label="Address" value={fields.locationAddress} onChangeText={(value) => updateLocationField("locationAddress", value)} placeholder="Street, area, city" multiline />
          <InputField label="Map Link" value={fields.mapsUrl} onChangeText={(value) => updateLocationField("mapsUrl", value)} placeholder="Paste a map share link" />
          <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
            Fill a place, address, map link, or current location. The live map preview below updates as you type.
          </Text>
          <InputField label="Latitude (advanced)" value={fields.latitude} onChangeText={(value) => updateLocationField("latitude", value)} placeholder="17.385" keyboardType="decimal-pad" />
          <InputField label="Longitude (advanced)" value={fields.longitude} onChangeText={(value) => updateLocationField("longitude", value)} placeholder="78.4867" keyboardType="decimal-pad" />
        </>
      );
    }
    if (qrType === "Youtube") {
      return <InputField label="YouTube URL" value={fields.youtubeUrl} onChangeText={(value) => setField("youtubeUrl", value)} placeholder="https://youtube.com/..." />;
    }
    if (qrType === "WIFI") {
      return (
        <>
          <InputField label="SSID" value={fields.wifiSsid} onChangeText={(value) => setField("wifiSsid", value)} placeholder="OfficeWiFi" />
          <InputField label="Password" value={fields.wifiPassword} onChangeText={(value) => setField("wifiPassword", value)} placeholder="password123" />
          <PickerField
            label="Security Type"
            value={fields.wifiType}
            options={[
              { label: "WPA/WPA2", value: "WPA" },
              { label: "WEP", value: "WEP" },
              { label: "Open", value: "nopass" },
            ]}
            onChange={(value) => setField("wifiType", value)}
          />
        </>
      );
    }
    if (qrType === "Event") {
      return (
        <>
          <InputField label="Event Title" value={fields.eventTitle} onChangeText={(value) => setField("eventTitle", value)} placeholder="Launch Event" />
          <InputField label="Start" value={fields.eventStart} onChangeText={(value) => setField("eventStart", value)} placeholder="YYYY-MM-DDTHH:mm" />
          <InputField label="End" value={fields.eventEnd} onChangeText={(value) => setField("eventEnd", value)} placeholder="YYYY-MM-DDTHH:mm" />
          <InputField label="Location" value={fields.eventLocation} onChangeText={(value) => setField("eventLocation", value)} placeholder="Venue / city" />
          <InputField label="Description" value={fields.eventDescription} onChangeText={(value) => setField("eventDescription", value)} placeholder="Event description" multiline />
        </>
      );
    }
    if (qrType === "PDF") {
      return (
        <View style={{ gap: 10 }}>
          <ToggleTabs value={pdfMode} onChange={setPdfMode} options={[{ label: "URL", value: "url" }, { label: "Upload PDF", value: "upload" }]} />
          {pdfMode === "url" ? (
            <InputField label="PDF URL" value={fields.pdfUrl} onChangeText={(value) => setField("pdfUrl", value)} placeholder="https://example.com/file.pdf" />
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ color: "#64748b" }}>{pdfAsset?.name || "No PDF selected"}</Text>
              <ActionButton title="Choose PDF" onPress={handlePickPdf} tone="light" />
              <ActionButton title={uploadingPdf ? "Uploading..." : "Upload PDF"} onPress={uploadPdf} disabled={uploadingPdf || !pdfAsset} />
            </View>
          )}
        </View>
      );
    }
    if (qrType === "Social Media") {
      return (
        <View style={{ gap: 10 }}>
          {socialLinks.map((item, index) => (
            <View key={`${item.platform}-${index}`} style={{ gap: 8, borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 16, padding: 12 }}>
              <PickerField
                label="Platform"
                value={item.platform}
                options={getAvailableSocialPlatforms(socialLinks, index)}
                onChange={(value) =>
                  setSocialLinks((prev) =>
                    prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, platform: value } : entry)),
                  )
                }
              />
              {item.platform === "Custom" && (
                <InputField
                  label="Custom Platform"
                  value={item.customPlatform}
                  onChangeText={(value) =>
                    setSocialLinks((prev) =>
                      prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, customPlatform: value } : entry)),
                    )
                  }
                  placeholder="Platform name"
                />
              )}
              <InputField
                label="URL"
                value={item.url}
                onChangeText={(value) =>
                  setSocialLinks((prev) =>
                    prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, url: value } : entry)),
                  )
                }
                placeholder="https://..."
              />
              <ActionButton
                title="Remove Link"
                onPress={() => setSocialLinks((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
                disabled={socialLinks.length === 1}
                tone="light"
              />
            </View>
          ))}
          <ActionButton title="Add Social Link" onPress={() => setSocialLinks((prev) => addSocialLinkRow(prev))} tone="light" />
        </View>
      );
    }
    if (qrType === "App Store") {
      return <InputField label="App Store URL" value={fields.appStoreUrl} onChangeText={(value) => setField("appStoreUrl", value)} placeholder="https://apps.apple.com/app/id..." />;
    }
    if (qrType === "Image Gallery") {
      return (
        <View style={{ gap: 10 }}>
          <ToggleTabs value={galleryMode} onChange={setGalleryMode} options={[{ label: "URL", value: "url" }, { label: "Upload Images", value: "upload" }]} />
          {galleryMode === "url" ? (
            <InputField label="Gallery URL" value={fields.galleryUrl} onChangeText={(value) => setField("galleryUrl", value)} placeholder="https://example.com/gallery" />
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ color: "#64748b" }}>
                {galleryAssets.length ? `${galleryAssets.length} image(s) selected` : "No images selected"}
              </Text>
              <ActionButton title="Choose Images" onPress={handlePickGallery} tone="light" />
              <ActionButton title={uploadingGallery ? "Uploading..." : "Upload Gallery"} onPress={uploadGallery} disabled={uploadingGallery || !galleryAssets.length} />
            </View>
          )}
        </View>
      );
    }
    if (qrType === "Rating") {
      return (
        <>
          <InputField label="Rating Page Title" value={fields.ratingTitle} onChangeText={(value) => setField("ratingTitle", value)} placeholder="Rate your experience" />
          <PickerField
            label="Rating Style"
            value={fields.ratingStyle}
            options={[
              { label: "5 Star Rating", value: "stars" },
              { label: "Number Rating", value: "numbers" },
            ]}
            onChange={(value) => setField("ratingStyle", value)}
          />
          {fields.ratingStyle === "numbers" ? (
            <PickerField
              label="Number Rating Scale"
              value={fields.ratingScale}
              options={[
                { label: "1-5", value: "5" },
                { label: "1-10", value: "10" },
              ]}
              onChange={(value) => setField("ratingScale", value)}
            />
          ) : (
            <InputField label="Number Rating Scale" value="1-5 (stars)" onChangeText={() => {}} editable={false} />
          )}
        </>
      );
    }
    if (qrType === "Feedback") {
      return (
        <View style={{ gap: 10 }}>
          <InputField label="Feedback Form Title" value={fields.feedbackTitle} onChangeText={(value) => setField("feedbackTitle", value)} placeholder="Share your feedback" editable={!isEditing} />
          {fields.feedbackQuestions.map((question, index) => (
            <View key={`feedback-${index}`} style={{ gap: 8 }}>
              <InputField
                label={`Question ${index + 1}`}
                value={question}
                onChangeText={(value) =>
                  setFields((prev) => {
                    const nextQuestions = [...prev.feedbackQuestions];
                    nextQuestions[index] = value;
                    return { ...prev, feedbackQuestions: nextQuestions };
                  })
                }
                placeholder={`Question ${index + 1}`}
              />
              {fields.feedbackQuestions.length > 1 && !isEditing && (
                <ActionButton
                  title="Remove Question"
                  onPress={() =>
                    setFields((prev) => ({
                      ...prev,
                      feedbackQuestions: prev.feedbackQuestions.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  tone="light"
                />
              )}
            </View>
          ))}
          <ActionButton
            title="Add Question"
            onPress={() =>
              setFields((prev) => ({
                ...prev,
                feedbackQuestions: [...prev.feedbackQuestions, ""],
              }))
            }
            tone="light"
          />
        </View>
      );
    }

    return (
      <InputField
        label="Content"
        value={fields.text}
        onChangeText={(value) => setField("text", value)}
        placeholder={getQrPlaceholder(qrType)}
        multiline
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 36 }}>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#0f172a" }}>Single QR Generator</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Mobile now follows the web QR type flow more closely, with dedicated fields per QR type instead of one generic content box.
        </Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>QR Data</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Enter the QR type and content details here. Styling and expiry are grouped in the next card.
        </Text>
        {isEditing ? (
          <InputField label="QR TYPE" value={qrType} onChangeText={() => {}} editable={false} />
        ) : (
          <PickerField label="QR TYPE" value={qrType} options={QR_TYPES} onChange={setQrType} />
        )}

        {renderTypeFields()}

        {!!uploadMessage && <Text style={{ color: "#047857" }}>{uploadMessage}</Text>}
        {!!error && <Text style={{ color: "#b91c1c" }}>{error}</Text>}
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Customization</Text>
        <Text style={{ color: "#64748b", lineHeight: 22 }}>
          Adjust validity, colors, format, and QR styling without mixing them into the content form.
        </Text>
        <InputField
          label="LAST SCAN DATE / EXPIRY"
          value={expiryDate}
          onChangeText={setExpiryDate}
          placeholder="DD-MM-YYYY"
        />
        <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>
          Leave blank to default validity to 6 months from creation. Use DD-MM-YYYY only.{" "}
          {!supportsExpiry(qrType, generatedContent)
            ? "Direct QR content types store the date here, while hosted experiences enforce expiry after scan."
            : "This QR type enforces expiry through the hosted experience."}
        </Text>

        <InputField
          label="FILE NAME"
          value={filenamePrefix}
          onChangeText={setFilenamePrefix}
          placeholder="mobile-qr"
        />

          <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <InputField
              label="FOREGROUND"
              value={foregroundColor}
              onChangeText={setForegroundColor}
              placeholder="#000000"
            />
          </View>

          {qrType === "Location" && generatedContent ? (
            <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 18, overflow: "hidden", marginTop: 8 }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
                <Text style={{ color: "#0f172a", fontWeight: "700" }}>Google Maps Preview</Text>
              </View>
              {buildGoogleMapsPreviewUrl() ? (
                <WebView source={{ uri: buildGoogleMapsPreviewUrl() }} style={{ height: 220 }} />
              ) : null}
              <View style={{ padding: 14 }}>
                <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>{generatedContent}</Text>
              </View>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <InputField
              label="BACKGROUND"
              value={backgroundColor}
              onChangeText={setBackgroundColor}
              placeholder="#ffffff"
            />
          </View>
        </View>

        <PickerField label="FORMAT" value={format} options={FORMATS} onChange={setFormat} />
        <PickerField label="ERROR CORRECTION" value={errorCorrectionLevel} options={EC_LEVELS} onChange={setErrorCorrectionLevel} />

        <ActionButton title={busy ? (editingJobId ? "Updating..." : "Generating...") : (editingJobId ? "Update QR" : "Generate QR")} onPress={handleGenerate} disabled={busy} />
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Preview & Share</Text>
        {job ? (
          <Text style={{ color: "#64748b" }}>
            Latest job: {job.id} | {job.status}
          </Text>
        ) : (
          <Text style={{ color: "#64748b" }}>Generate a QR to see preview and sharing options.</Text>
        )}

        {previewSource ? (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Image
              source={previewSource}
              style={{ width: 240, height: 240, borderRadius: 16, backgroundColor: "#ffffff" }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderStyle: "dashed",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <Text style={{ color: "#64748b" }}>
              Preview will appear here after generation. PNG shows inline, while SVG can still be shared after creation.
            </Text>
          </View>
        )}

        {qrType === "Location" && buildGoogleMapsPreviewUrl() ? (
          <View style={{ borderWidth: 1, borderColor: "#dbe3f0", borderRadius: 18, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
              <Text style={{ color: "#0f172a", fontWeight: "700" }}>Google Maps Preview</Text>
            </View>
            <WebView source={{ uri: buildGoogleMapsPreviewUrl() }} style={{ height: 220 }} />
            <View style={{ padding: 14 }}>
              <Text style={{ color: "#64748b", fontSize: 12, lineHeight: 18 }}>{generatedContent || buildQrContent("Location", fields, { appOrigin: APP_ORIGIN, socialLinks, ids: { galleryLinkId, pdfLinkId }, modes: { galleryMode, pdfMode }, expiryDate })}</Text>
            </View>
          </View>
        ) : null}

        {!!shareMessage && <Text style={{ color: "#047857" }}>{shareMessage}</Text>}

        <ActionButton title="Share / Download File" onPress={handleShare} disabled={!artifact?.dataUrl} tone="light" />
      </Card>

      {analysisLoading ? (
        <Card>
          <Text style={{ color: "#64748b" }}>Loading analysis...</Text>
        </Card>
      ) : analysis ? (
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>Analysis for this QR job</Text>
          <Text style={{ color: "#64748b" }}>{analysis.insight}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatPill label="Requested" value={analysis.job?.totalCount || 0} />
            <StatPill label="Success" value={analysis.job?.successCount || 0} tone="#047857" />
            <StatPill label="Failure" value={analysis.job?.failureCount || 0} tone="#b91c1c" />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatPill label="Scans" value={analysis.engagement?.totalScans || 0} />
            <StatPill label="Submissions" value={analysis.engagement?.totalSubmissions || 0} tone="#047857" />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}
