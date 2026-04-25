import { z } from 'zod';
export const ALLOWED_MEDIA_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'audio/mp3',
    'audio/mpeg',
    'audio/amr',
    'video/mp4',
];
export const FILE_SIZE_LIMITS = {
    image: 2 * 1024 * 1024,
    voice: 2 * 1024 * 1024,
    video: 10 * 1024 * 1024,
    thumb: 64 * 1024,
};
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
const DANGEROUS_HTML_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gis,
    /<iframe[^>]*>.*?<\/iframe>/gis,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>.*?<\/object>/gis,
];
export function sanitizeHtmlContent(content) {
    let sanitized = content;
    DANGEROUS_HTML_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });
    return sanitized;
}
export function isValidUrl(url) {
    if (!url || url.trim() === '') {
        return false;
    }
    return URL_REGEX.test(url);
}
export function isValidMediaType(mimeType) {
    return ALLOWED_MEDIA_TYPES.includes(mimeType);
}
export function isValidFileSize(size, type) {
    return size <= FILE_SIZE_LIMITS[type];
}
export const articleTitleSchema = z.string()
    .min(1, '标题不能为空')
    .max(64, '标题不能超过64个字符')
    .transform(val => val.trim());
export const articleContentSchema = z.string()
    .min(1, '内容不能为空')
    .max(200000, '内容不能超过200000字符')
    .transform(val => sanitizeHtmlContent(val));
export const urlSchema = z.string()
    .optional()
    .refine(val => !val || isValidUrl(val), 'URL格式不正确');
export const mediaIdSchema = z.string()
    .min(1, 'Media ID不能为空')
    .max(128, 'Media ID长度不正确');
export const draftArticleSchema = z.object({
    title: articleTitleSchema,
    author: z.string().max(32, '作者名不能超过32个字符').optional(),
    digest: z.string().max(256, '摘要不能超过256个字符').optional(),
    content: articleContentSchema,
    contentSourceUrl: urlSchema,
    thumbMediaId: mediaIdSchema,
    showCoverPic: z.number().int().min(0).max(1).optional(),
    needOpenComment: z.number().int().min(0).max(1).optional(),
    onlyFansCanComment: z.number().int().min(0).max(1).optional(),
});
export const fileUploadSchema = z.object({
    type: z.enum(['image', 'voice', 'video', 'thumb']),
    fileType: z.string().refine(val => isValidMediaType(val), '不支持的文件类型'),
    fileSize: z.number().positive('文件大小必须大于0'),
});
export const appIdSchema = z.string()
    .min(1, 'App ID不能为空')
    .max(32, 'App ID长度不正确')
    .regex(/^wx[a-z0-9]{16}$/i, 'App ID格式不正确,应为wx开头的18位字符');
export const appSecretSchema = z.string()
    .min(1, 'App Secret不能为空')
    .max(64, 'App Secret长度不正确')
    .regex(/^[a-f0-9]{32}$/i, 'App Secret格式不正确,应为32位十六进制字符');
