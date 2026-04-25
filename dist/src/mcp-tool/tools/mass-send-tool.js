import { z } from 'zod';
import { logger } from '../../utils/logger.js';
const mediaIdSchema = z.string().min(1, 'MediaID不能为空');
const tagIdSchema = z.number().int().positive('标签ID必须为正整数');
export const massSendMcpTool = {
    name: 'wechat_mass_send',
    description: '微信公众号群发消息 - 根据标签或OpenID列表群发图文、文本、图片等消息，支持删除和预览',
    inputSchema: {
        action: z.enum([
            'send_by_tag',
            'send_by_openid',
            'delete',
            'preview'
        ]),
        isToAll: z.boolean().optional(),
        tagId: tagIdSchema.optional(),
        toUser: z.array(z.string().min(1, 'OpenID不能为空')).optional(),
        msgtype: z.enum(['mpnews', 'text', 'voice', 'image', 'mpvideo', 'wxcard']).optional(),
        mediaId: mediaIdSchema.optional(),
        content: z.string().optional(),
        sendIgnoreReprint: z.number().int().min(0).max(1).optional(),
        msgId: z.number().int().positive().optional(),
        articleIdx: z.number().int().min(0).optional(),
        previewToUser: z.string().optional(),
    },
    handler: async (params, apiClient) => {
        try {
            const validated = parseMassSendParams(params);
            switch (validated.action) {
                case 'send_by_tag': {
                    if (validated.isToAll === undefined && !validated.tagId) {
                        throw new Error('send_by_tag 操作需要 isToAll 或 tagId 参数');
                    }
                    if (!validated.msgtype) {
                        throw new Error('send_by_tag 操作需要 msgtype 参数');
                    }
                    const data = {
                        filter: {
                            isToAll: validated.isToAll || false,
                            ...(validated.tagId !== undefined && { tagId: validated.tagId })
                        },
                        msgtype: validated.msgtype
                    };
                    if (validated.msgtype === 'mpnews' || validated.msgtype === 'mpvideo') {
                        if (!validated.mediaId) {
                            throw new Error(`${validated.msgtype} 类型需要 mediaId 参数`);
                        }
                        data[validated.msgtype] = { mediaId: validated.mediaId };
                    }
                    else if (validated.msgtype === 'text') {
                        if (!validated.content) {
                            throw new Error('text 类型需要 content 参数');
                        }
                        data.text = { content: validated.content };
                    }
                    else if (validated.msgtype === 'voice' || validated.msgtype === 'image') {
                        if (!validated.mediaId) {
                            throw new Error(`${validated.msgtype} 类型需要 mediaId 参数`);
                        }
                        data[validated.msgtype] = { mediaId: validated.mediaId };
                    }
                    else if (validated.msgtype === 'wxcard') {
                        if (!validated.mediaId) {
                            throw new Error('wxcard 类型需要 cardId 参数');
                        }
                        data.wxcard = { cardId: validated.mediaId };
                    }
                    if (validated.sendIgnoreReprint !== undefined) {
                        data.sendIgnoreReprint = validated.sendIgnoreReprint;
                    }
                    const result = await apiClient.sendMassMessageByTag(data);
                    return {
                        content: [{
                                type: 'text',
                                text: `群发消息提交成功\n` +
                                    `- 消息ID: ${result.msgId}\n` +
                                    `- 数据ID: ${result.msgDataId}\n` +
                                    `- 发送方式: ${validated.isToAll ? '全部用户' : `标签 ${validated.tagId}`}\n` +
                                    `- 消息类型: ${validated.msgtype}`
                            }]
                    };
                }
                case 'send_by_openid': {
                    if (!validated.toUser || validated.toUser.length === 0) {
                        throw new Error('send_by_openid 操作需要 toUser 参数（OpenID数组）');
                    }
                    if (validated.toUser.length > 10000) {
                        throw new Error('OpenID列表长度不能超过10000');
                    }
                    if (!validated.msgtype) {
                        throw new Error('send_by_openid 操作需要 msgtype 参数');
                    }
                    const data = {
                        touser: validated.toUser,
                        msgtype: validated.msgtype
                    };
                    if (validated.msgtype === 'mpnews' || validated.msgtype === 'mpvideo') {
                        if (!validated.mediaId) {
                            throw new Error(`${validated.msgtype} 类型需要 mediaId 参数`);
                        }
                        data[validated.msgtype] = { mediaId: validated.mediaId };
                    }
                    else if (validated.msgtype === 'text') {
                        if (!validated.content) {
                            throw new Error('text 类型需要 content 参数');
                        }
                        data.text = { content: validated.content };
                    }
                    else if (validated.msgtype === 'voice' || validated.msgtype === 'image') {
                        if (!validated.mediaId) {
                            throw new Error(`${validated.msgtype} 类型需要 mediaId 参数`);
                        }
                        data[validated.msgtype] = { mediaId: validated.mediaId };
                    }
                    else if (validated.msgtype === 'wxcard') {
                        if (!validated.mediaId) {
                            throw new Error('wxcard 类型需要 cardId 参数');
                        }
                        data.wxcard = { cardId: validated.mediaId };
                    }
                    if (validated.sendIgnoreReprint !== undefined) {
                        data.sendIgnoreReprint = validated.sendIgnoreReprint;
                    }
                    const result = await apiClient.sendMassMessageByOpenId(data);
                    return {
                        content: [{
                                type: 'text',
                                text: `群发消息提交成功\n` +
                                    `- 消息ID: ${result.msgId}\n` +
                                    `- 数据ID: ${result.msgDataId}\n` +
                                    `- 发送人数: ${validated.toUser.length}\n` +
                                    `- 消息类型: ${validated.msgtype}`
                            }]
                    };
                }
                case 'delete': {
                    if (!validated.msgId) {
                        throw new Error('delete 操作需要 msgId 参数');
                    }
                    await apiClient.deleteMassMessage(validated.msgId, validated.articleIdx);
                    return {
                        content: [{
                                type: 'text',
                                text: `群发消息删除成功\n` +
                                    `- 消息ID: ${validated.msgId}\n` +
                                    `${validated.articleIdx !== undefined ? `- 文章索引: ${validated.articleIdx}` : ''}`
                            }]
                    };
                }
                case 'preview': {
                    if (!validated.previewToUser) {
                        throw new Error('preview 操作需要 previewToUser 参数（接收者OpenID）');
                    }
                    if (!validated.msgtype) {
                        throw new Error('preview 操作需要 msgtype 参数');
                    }
                    const data = {
                        touser: validated.previewToUser,
                        msgtype: validated.msgtype
                    };
                    if (validated.msgtype === 'mpnews' || validated.msgtype === 'mpvideo') {
                        if (!validated.mediaId) {
                            throw new Error(`${validated.msgtype} 类型需要 mediaId 参数`);
                        }
                        data[validated.msgtype] = { mediaId: validated.mediaId };
                    }
                    else if (validated.msgtype === 'text') {
                        if (!validated.content) {
                            throw new Error('text 类型需要 content 参数');
                        }
                        data.text = { content: validated.content };
                    }
                    else if (validated.msgtype === 'voice' || validated.msgtype === 'image') {
                        if (!validated.mediaId) {
                            throw new Error(`${validated.msgtype} 类型需要 mediaId 参数`);
                        }
                        data[validated.msgtype] = { mediaId: validated.mediaId };
                    }
                    else if (validated.msgtype === 'wxcard') {
                        if (!validated.mediaId) {
                            throw new Error('wxcard 类型需要 cardId 参数');
                        }
                        data.wxcard = { cardId: validated.mediaId };
                    }
                    const result = await apiClient.previewMassMessage(data);
                    return {
                        content: [{
                                type: 'text',
                                text: `预览消息发送成功\n` +
                                    `- 消息ID: ${result.msgId}\n` +
                                    `- 接收者: ${validated.previewToUser}\n` +
                                    `- 消息类型: ${validated.msgtype}`
                            }]
                    };
                }
                default:
                    throw new Error(`未知的操作: ${validated.action}`);
            }
        }
        catch (error) {
            logger.error('Mass send tool error:', error);
            throw error;
        }
    }
};
function parseMassSendParams(params) {
    return params;
}
