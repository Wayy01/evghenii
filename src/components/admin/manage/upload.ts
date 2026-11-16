/** Browser-side helpers for sending a file to /api/admin/upload and reading what it is. */

export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MEDIA_ACCEPT = [...VIDEO_TYPES, ...IMAGE_TYPES].join(",");
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

export type UploadError = "unsupported" | "tooLarge" | "failed";

/** Streams the raw file body with progress (fetch cannot report upload progress). */
export function uploadFile(file: Blob, onProgress?: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        // A proxy error page is not JSON; it is reported as a plain failure below.
      }
      if (xhr.status === 200 && body.url) resolve(body.url);
      else reject(new Error(body.error ?? "failed"));
    };
    xhr.onerror = () => reject(new Error("failed"));
    xhr.send(file);
  });
}

export type VideoInfo = { width: number; height: number; duration: number; poster: Blob | null };

/** Reads a video's size and length and grabs one frame for its cover, all in the browser. */
export function inspectVideo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (poster: Blob | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(giveUp);
      const info = { width: video.videoWidth, height: video.videoHeight, duration: video.duration || 0, poster };
      URL.revokeObjectURL(url);
      if (info.width && info.height) resolve(info);
      else reject(new Error("unsupported"));
    };
    // Some phones never fire `seeked` for an off-screen video; the upload goes on without a cover.
    const giveUp = setTimeout(() => finish(null), 8000);

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(giveUp);
      URL.revokeObjectURL(url);
      reject(new Error("unsupported"));
    };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 3);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      // A 720px-wide cover is plenty for a tile and keeps the upload small.
      const scale = Math.min(1, 720 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) return finish(null);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.85);
    };
    video.src = url;
  });
}

export function inspectImage(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unsupported"));
    };
    image.src = url;
  });
}

export const toUploadError = (error: unknown): UploadError => {
  const code = error instanceof Error ? error.message : "";
  return code === "unsupported" || code === "tooLarge" ? code : "failed";
};
