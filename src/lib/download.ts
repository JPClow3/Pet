export function downloadText(
  text: string,
  filename: string,
  mimeType = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
