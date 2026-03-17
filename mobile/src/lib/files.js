import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function splitDataUrl(dataUrl) {
  const [meta, encoded] = String(dataUrl || "").split(",", 2);
  if (!meta || !encoded || !meta.includes(";base64")) {
    throw new Error("Unsupported file payload");
  }

  const mimeType = meta.replace("data:", "").replace(";base64", "");
  return {
    mimeType,
    base64: encoded,
  };
}

function fileExtensionFromMimeType(mimeType, fallback = "bin") {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "application/zip") return "zip";
  return fallback;
}

export async function shareDataUrlFile({ dataUrl, fileName }) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Native sharing is not available on this device");
  }

  const { mimeType, base64 } = splitDataUrl(dataUrl);
  const extension = fileExtensionFromMimeType(mimeType, "bin");
  const safeFileName = fileName || `qrbulkgen-${Date.now()}.${extension}`;
  const targetPath = `${FileSystem.cacheDirectory}${safeFileName}`;

  await FileSystem.writeAsStringAsync(targetPath, base64, {
    encoding: "base64",
  });

  await Sharing.shareAsync(targetPath, {
    dialogTitle: "Share QR file",
    mimeType,
    UTI: mimeType,
  });

  return targetPath;
}

export async function saveDataUrlFile({ dataUrl, fileName }) {
  const { mimeType, base64 } = splitDataUrl(dataUrl);
  const extension = fileExtensionFromMimeType(mimeType, "bin");
  const safeFileName = fileName || `qrbulkgen-${Date.now()}.${extension}`;
  const targetPath = `${FileSystem.documentDirectory}${safeFileName}`;

  await FileSystem.writeAsStringAsync(targetPath, base64, {
    encoding: "base64",
  });

  return targetPath;
}
