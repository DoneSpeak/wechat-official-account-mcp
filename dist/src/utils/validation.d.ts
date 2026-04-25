import { z } from 'zod';
export declare const ALLOWED_MEDIA_TYPES: readonly ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "audio/mp3", "audio/mpeg", "audio/amr", "video/mp4"];
export declare const FILE_SIZE_LIMITS: {
    readonly image: number;
    readonly voice: number;
    readonly video: number;
    readonly thumb: number;
};
export declare function sanitizeHtmlContent(content: string): string;
export declare function isValidUrl(url: string): boolean;
export declare function isValidMediaType(mimeType: string): boolean;
export declare function isValidFileSize(size: number, type: 'image' | 'voice' | 'video' | 'thumb'): boolean;
export declare const articleTitleSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const articleContentSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const urlSchema: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
export declare const mediaIdSchema: z.ZodString;
export declare const draftArticleSchema: z.ZodObject<{
    title: z.ZodEffects<z.ZodString, string, string>;
    author: z.ZodOptional<z.ZodString>;
    digest: z.ZodOptional<z.ZodString>;
    content: z.ZodEffects<z.ZodString, string, string>;
    contentSourceUrl: z.ZodEffects<z.ZodOptional<z.ZodString>, string, string>;
    thumbMediaId: z.ZodString;
    showCoverPic: z.ZodOptional<z.ZodNumber>;
    needOpenComment: z.ZodOptional<z.ZodNumber>;
    onlyFansCanComment: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content?: string;
    title?: string;
    author?: string;
    digest?: string;
    contentSourceUrl?: string;
    thumbMediaId?: string;
    showCoverPic?: number;
    needOpenComment?: number;
    onlyFansCanComment?: number;
}, {
    content?: string;
    title?: string;
    author?: string;
    digest?: string;
    contentSourceUrl?: string;
    thumbMediaId?: string;
    showCoverPic?: number;
    needOpenComment?: number;
    onlyFansCanComment?: number;
}>;
export declare const fileUploadSchema: z.ZodObject<{
    type: z.ZodEnum<["image", "voice", "video", "thumb"]>;
    fileType: z.ZodEffects<z.ZodString, string, string>;
    fileSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type?: "image" | "voice" | "video" | "thumb";
    fileType?: string;
    fileSize?: number;
}, {
    type?: "image" | "voice" | "video" | "thumb";
    fileType?: string;
    fileSize?: number;
}>;
export declare const appIdSchema: z.ZodString;
export declare const appSecretSchema: z.ZodString;
