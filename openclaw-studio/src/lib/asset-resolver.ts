const FILE_RAW = "/api/workspace/file-raw?path=";

function fileRawUrl(relativePath: string): string {
  return `${FILE_RAW}${encodeURIComponent(relativePath)}`;
}

/**
 * Resolve an image source: prefer local path, fallback to remote URL.
 * @param project - project name
 * @param imageUrl - remote URL (may expire)
 * @param imagePath - local relative path
 * @param pathPrefix - prefix relative to project, e.g. "shots/" for shot images
 */
export function resolveImageSrc(
  project: string,
  imageUrl?: string,
  imagePath?: string,
  pathPrefix = "",
): string | undefined {
  if (imagePath) {
    const full = pathPrefix
      ? `${project}/${pathPrefix}${imagePath}`
      : `${project}/${imagePath}`;
    return fileRawUrl(full);
  }
  return imageUrl || undefined;
}

/**
 * Resolve an audio source: prefer local path, fallback to remote URL.
 */
export function resolveAudioSrc(
  project: string,
  audioUrl?: string,
  audioPath?: string,
): string | undefined {
  if (audioPath) {
    return fileRawUrl(`${project}/${audioPath}`);
  }
  return audioUrl || undefined;
}
