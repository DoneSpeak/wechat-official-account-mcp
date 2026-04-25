import { authTool, authMcpTool } from './auth-tool.js';
import { mediaUploadTool } from './media-upload-tool.js';
import { uploadImgTool } from './upload-img-tool.js';
import { permanentMediaTool } from './permanent-media-tool.js';
import { draftTool, draftMcpTool } from './draft-tool.js';
import { publishTool, publishMcpTool } from './publish-tool.js';
import { userMcpTool } from './user-tool.js';
import { tagMcpTool } from './tag-tool.js';
import { menuMcpTool } from './menu-tool.js';
import { templateMsgMcpTool } from './template-msg-tool.js';
import { customerServiceMcpTool } from './customer-service-tool.js';
import { statisticsMcpTool } from './statistics-tool.js';
import { autoReplyMcpTool } from './auto-reply-tool.js';
import { massSendMcpTool } from './mass-send-tool.js';
import { subscribeMsgMcpTool } from './subscribe-msg-tool.js';
export const wechatTools = [
    authTool,
    draftTool,
    publishTool,
];
export const mcpTools = [
    authMcpTool,
    draftMcpTool,
    publishMcpTool,
    permanentMediaTool,
    mediaUploadTool,
    uploadImgTool,
    userMcpTool,
    tagMcpTool,
    menuMcpTool,
    templateMsgMcpTool,
    customerServiceMcpTool,
    subscribeMsgMcpTool,
    statisticsMcpTool,
    autoReplyMcpTool,
    massSendMcpTool,
];
export { authTool, mediaUploadTool, uploadImgTool, permanentMediaTool, draftTool, publishTool, userMcpTool, tagMcpTool, menuMcpTool, templateMsgMcpTool, customerServiceMcpTool, statisticsMcpTool, autoReplyMcpTool, massSendMcpTool, subscribeMsgMcpTool, };
