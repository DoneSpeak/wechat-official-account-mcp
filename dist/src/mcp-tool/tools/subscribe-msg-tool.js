import { z } from 'zod';
import { logger } from '../../utils/logger.js';
const templateIdSchema = z.string().min(1, '模板ID不能为空');
const openIdSchema = z.string().min(1, 'OpenID不能为空');
export const subscribeMsgMcpTool = {
    name: 'wechat_subscribe_msg',
    description: '微信公众号订阅通知 - 发送一次性订阅通知给用户',
    inputSchema: {
        action: z.enum([
            'send'
        ]),
        toUser: openIdSchema,
        templateId: templateIdSchema,
        page: z.string().optional(),
        miniProgramAppId: z.string().optional(),
        miniProgramPagePath: z.string().optional(),
        data: z.record(z.object({
            value: z.string()
        })),
    },
    handler: async (params, apiClient) => {
        try {
            const validated = parseSubscribeMsgParams(params);
            switch (validated.action) {
                case 'send': {
                    if (!validated.data || Object.keys(validated.data).length === 0) {
                        throw new Error('send 操作需要 data 参数（模板数据）');
                    }
                    const data = {
                        touser: validated.toUser,
                        templateId: validated.templateId,
                        data: validated.data
                    };
                    if (validated.page) {
                        data.page = validated.page;
                    }
                    if (validated.miniProgramAppId && validated.miniProgramPagePath) {
                        data.miniprogram = {
                            appId: validated.miniProgramAppId,
                            pagePath: validated.miniProgramPagePath
                        };
                    }
                    const result = await apiClient.sendSubscribeMessage(data);
                    return {
                        content: [{
                                type: 'text',
                                text: `订阅通知发送成功\n` +
                                    `- 接收者: ${validated.toUser}\n` +
                                    `- 模板ID: ${validated.templateId}\n` +
                                    `- 消息ID: ${result.msgid}`
                            }]
                    };
                }
                default:
                    throw new Error(`未知的操作: ${validated.action}`);
            }
        }
        catch (error) {
            logger.error('Subscribe message tool error:', error);
            throw error;
        }
    }
};
function parseSubscribeMsgParams(params) {
    return params;
}
