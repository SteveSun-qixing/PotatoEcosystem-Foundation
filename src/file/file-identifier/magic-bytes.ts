/**
 * Magic Bytes 魔数定义
 * @module @chips/foundation/file/file-identifier/magic-bytes
 */

/**
 * 文件类型签名定义
 */
export interface FileSignature {
  /** MIME 类型 */
  mime: string;
  /** 扩展名 */
  extension: string;
  /** 魔数字节 */
  magicBytes: number[];
  /** 偏移量（默认0） */
  offset?: number;
  /** 文件类型描述 */
  description: string;
}

/**
 * 常见文件类型魔数
 */
export const FILE_SIGNATURES: FileSignature[] = [
  // 压缩文件
  {
    mime: 'application/zip',
    extension: 'zip',
    magicBytes: [0x50, 0x4b, 0x03, 0x04],
    description: 'ZIP archive',
  },
  {
    mime: 'application/gzip',
    extension: 'gz',
    magicBytes: [0x1f, 0x8b],
    description: 'GZIP archive',
  },
  {
    mime: 'application/x-rar-compressed',
    extension: 'rar',
    magicBytes: [0x52, 0x61, 0x72, 0x21],
    description: 'RAR archive',
  },
  {
    mime: 'application/x-7z-compressed',
    extension: '7z',
    magicBytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
    description: '7-Zip archive',
  },

  // 图片
  {
    mime: 'image/jpeg',
    extension: 'jpg',
    magicBytes: [0xff, 0xd8, 0xff],
    description: 'JPEG image',
  },
  {
    mime: 'image/png',
    extension: 'png',
    magicBytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    description: 'PNG image',
  },
  {
    mime: 'image/gif',
    extension: 'gif',
    magicBytes: [0x47, 0x49, 0x46, 0x38],
    description: 'GIF image',
  },
  {
    mime: 'image/webp',
    extension: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    description: 'WebP image',
  },
  {
    mime: 'image/bmp',
    extension: 'bmp',
    magicBytes: [0x42, 0x4d],
    description: 'BMP image',
  },
  {
    mime: 'image/svg+xml',
    extension: 'svg',
    magicBytes: [0x3c, 0x73, 0x76, 0x67],
    description: 'SVG image',
  },

  // 视频
  {
    mime: 'video/mp4',
    extension: 'mp4',
    magicBytes: [0x00, 0x00, 0x00],
    offset: 0,
    description: 'MP4 video',
  },
  {
    mime: 'video/webm',
    extension: 'webm',
    magicBytes: [0x1a, 0x45, 0xdf, 0xa3],
    description: 'WebM video',
  },
  {
    mime: 'video/x-msvideo',
    extension: 'avi',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    description: 'AVI video',
  },

  // 音频
  {
    mime: 'audio/mpeg',
    extension: 'mp3',
    magicBytes: [0xff, 0xfb],
    description: 'MP3 audio',
  },
  {
    mime: 'audio/wav',
    extension: 'wav',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    description: 'WAV audio',
  },
  {
    mime: 'audio/ogg',
    extension: 'ogg',
    magicBytes: [0x4f, 0x67, 0x67, 0x53],
    description: 'OGG audio',
  },
  {
    mime: 'audio/flac',
    extension: 'flac',
    magicBytes: [0x66, 0x4c, 0x61, 0x43],
    description: 'FLAC audio',
  },

  // 文档
  {
    mime: 'application/pdf',
    extension: 'pdf',
    magicBytes: [0x25, 0x50, 0x44, 0x46],
    description: 'PDF document',
  },

  // 3D模型
  {
    mime: 'model/gltf-binary',
    extension: 'glb',
    magicBytes: [0x67, 0x6c, 0x54, 0x46],
    description: 'glTF binary',
  },
];

/**
 * 扩展名到MIME类型映射
 */
export const EXTENSION_MIME_MAP: Record<string, string> = {
  // Chips 特殊格式
  card: 'application/x-chips-card',
  box: 'application/x-chips-box',

  // 压缩
  zip: 'application/zip',
  gz: 'application/gzip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',

  // 图片
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',

  // 视频
  mp4: 'video/mp4',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',

  // 音频
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',

  // 文档
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // 文本
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  xml: 'application/xml',
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml',
  md: 'text/markdown',

  // 3D模型
  gltf: 'model/gltf+json',
  glb: 'model/gltf-binary',
  obj: 'model/obj',
  fbx: 'application/octet-stream',
  stl: 'model/stl',

  // 字体
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
};
