// Attachment upload constraints
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Allowed file extensions by category
export const ALLOWED_EXTENSIONS = {
  // Images
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'heif'],
  // Videos
  videos: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'],
  // Audio
  audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'],
  // Documents
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf'],
  // Text & Code
  code: ['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv', 'log',
         'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'less',
         'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb',
         'php', 'swift', 'kt', 'scala', 'sql', 'sh', 'bash', 'zsh',
         'vue', 'svelte', 'astro'],
  // Archives
  archives: ['zip', 'tar', 'gz', 'rar', '7z'],
};

// Flatten all allowed extensions
export const ALL_ALLOWED_EXTENSIONS = Object.values(ALLOWED_EXTENSIONS).flat();

// Build accept string for file input
export const FILE_INPUT_ACCEPT = ALL_ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',');

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
    };
  }

  // Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALL_ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type .${ext || 'unknown'} is not supported`,
    };
  }

  return { valid: true };
}
