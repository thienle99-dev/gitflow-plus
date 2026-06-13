const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp",
  "bmp", "ico", "svg", "avif", "tiff", "tif",
]);

const BINARY_EXTENSIONS = new Set([
  // Archives / compressed
  "zip", "tar", "gz", "gzip", "bz2", "xz", "zst", "rar", "7z", "z",
  // Executables / libraries
  "exe", "dll", "so", "dylib", "wasm", "o", "obj", "lib", "a",
  "class", "jar", "pyc", "pyd", "whl",
  // Installers / packages
  "deb", "rpm", "apk", "aab", "dmg", "pkg", "msi",
  // Documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
  // Media (non-image)
  "mp3", "mp4", "avi", "mov", "wav", "flac", "ogg", "mkv", "wmv",
  "m4a", "aac", "opus", "webm", "flv", "mpeg", "mpg",
  // Fonts
  "ttf", "otf", "woff", "woff2", "eot",
  // Design
  "psd", "ai", "eps", "sketch", "fig", "xd",
  // Database / data
  "db", "sqlite", "sqlite3", "dbf", "mdb",
  // Firmware / binary blobs
  "bin", "dat", "rom", "eep", "hex",
  // Misc
  "iso", "img", "vhd", "vmdk", "cminst", "cache", "lock",
]);

export function isImageFile(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

export function isBinaryFile(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if a git diff output indicates a binary file.
 * Git outputs "Binary files a/... and b/... differ" for binary files.
 */
export function diffIsBinary(diff: string): boolean {
  return diff.includes("Binary files ") && diff.includes(" differ");
}
