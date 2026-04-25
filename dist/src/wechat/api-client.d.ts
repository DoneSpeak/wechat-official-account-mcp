import FormData from 'form-data';
import { AuthManager } from '../auth/auth-manager.js';
export declare class WechatApiClient {
    private authManager;
    private httpClient;
    private static readonly MAX_HTTP_RETRIES;
    private static readonly RETRY_BACKOFF_MS;
    constructor(authManager: AuthManager);
    getAuthManager(): AuthManager;
    private getRetryMetadata;
    private shouldRetryRequest;
    private stripAccessTokenFromUrl;
    private sleep;
    uploadMedia(params: {
        type: 'image' | 'voice' | 'video' | 'thumb';
        media: Buffer;
        fileName: string;
        title?: string;
        introduction?: string;
    }): Promise<{
        mediaId: string;
        type: string;
        createdAt: number;
        url?: string;
    }>;
    getMedia(mediaId: string): Promise<Buffer>;
    addNews(articles: Array<{
        title: string;
        author?: string;
        digest?: string;
        content: string;
        contentSourceUrl?: string;
        thumbMediaId: string;
        showCoverPic?: number;
        needOpenComment?: number;
        onlyFansCanComment?: number;
    }>): Promise<{
        mediaId: string;
    }>;
    addDraft(articles: Array<{
        title: string;
        author?: string;
        digest?: string;
        content: string;
        contentSourceUrl?: string;
        thumbMediaId: string;
        showCoverPic?: number;
        needOpenComment?: number;
        onlyFansCanComment?: number;
    }>): Promise<{
        mediaId: string;
    }>;
    publishDraft(mediaId: string): Promise<{
        publishId: string;
        msgDataId: string;
    }>;
    uploadImg(formData: FormData): Promise<{
        url: string;
        errcode?: number;
        errmsg?: string;
    }>;
    get(path: string, params?: Record<string, unknown>): Promise<unknown>;
    post(path: string, data?: unknown): Promise<unknown>;
    getUserList(nextOpenId?: string): Promise<{
        total: number;
        count: number;
        data: {
            openid: string[];
        };
        nextOpenid: string;
    }>;
    getUserInfo(openId: string, lang?: 'zh_CN' | 'zh_TW' | 'en'): Promise<{
        subscribe: number;
        openid: string;
        nickname: string;
        sex: number;
        language: string;
        city: string;
        province: string;
        country: string;
        headImgUrl: string;
        subscribeTime: number;
        unionId?: string;
        remark?: string;
        groupId?: number;
        tagidList?: number[];
    }>;
    batchGetUserInfo(userList: string[], lang?: 'zh_CN' | 'zh_TW' | 'en'): Promise<{
        user_info_list: Array<{
            subscribe: number;
            openid: string;
            nickname: string;
            sex: number;
            language: string;
            city: string;
            province: string;
            country: string;
            headImgUrl: string;
            subscribeTime: number;
            unionId?: string;
            remark?: string;
            groupId?: number;
        }>;
    }>;
    updateUserRemark(openId: string, remark: string): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    getUserSummary(beginDate: string, endDate: string): Promise<{
        list: Array<{
            ref_date: string;
            user_source: number;
            new_user: number;
            cancel_user: number;
        }>;
    }>;
    getUserCumulate(beginDate: string, endDate: string): Promise<{
        list: Array<{
            ref_date: string;
            cumulate_user: number;
        }>;
    }>;
    createTag(name: string): Promise<{
        tag: {
            id: number;
            name: string;
        };
    }>;
    getTags(): Promise<{
        tags: Array<{
            id: number;
            name: string;
            count: number;
        }>;
    }>;
    updateTag(tagId: number, name: string): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    deleteTag(tagId: number): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    batchTagging(openIdList: string[], tagId: number): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    batchUntagging(openIdList: string[], tagId: number): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    getTagUsers(tagId: string, nextOpenId?: string): Promise<{
        count: number;
        data: {
            openid: string[];
        };
        next_openid: string;
    }>;
    createMenu(menuData: {
        button: Array<{
            type?: string;
            name: string;
            key?: string;
            url?: string;
            mediaId?: string;
            sub_button?: Array<any>;
        }>;
    }): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    getMenu(): Promise<{
        menu: {
            button: Array<any>;
        };
    }>;
    deleteMenu(): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    addConditionalMenu(menuData: {
        button: Array<any>;
        matchrule: {
            tag_id?: number;
            sex?: string;
            country?: string;
            province?: string;
            city?: string;
            client_platform_type?: number;
            language?: string;
        };
    }): Promise<{
        menuid: number;
        errcode: number;
        errmsg: string;
    }>;
    deleteConditionalMenu(menuId: number): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    getSelfMenuInfo(): Promise<{
        selfmenu_info: {
            button: Array<any>;
        };
    }>;
    sendTemplateMessage(data: {
        touser: string;
        templateId: string;
        url?: string;
        topcolor?: string;
        data: Record<string, {
            value: string;
            color?: string;
        }>;
    }): Promise<{
        errcode: number;
        errmsg: string;
        msgid: number;
    }>;
    getAllPrivateTemplates(): Promise<{
        template_list: Array<{
            templateId: string;
            title: string;
            content: string;
            example: string;
        }>;
    }>;
    deletePrivateTemplate(templateId: string): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    getTemplateIndustry(): Promise<{
        primary_industry: {
            firstClass: string;
            secondClass: string;
        };
        secondary_industry: {
            firstClass: string;
            secondClass: string;
        };
    }>;
    sendCustomMessage(data: {
        touser: string;
        msgtype: 'text' | 'image' | 'voice' | 'video' | 'music' | 'news' | 'mpnews' | 'wxcard';
        text?: {
            content: string;
        };
        image?: {
            mediaId: string;
        };
        voice?: {
            mediaId: string;
        };
        video?: {
            mediaId: string;
            thumbMediaId: string;
            title?: string;
            description?: string;
        };
        music?: {
            title: string;
            description: string;
            musicurl: string;
            hqmusicurl: string;
            thumbMediaId?: string;
        };
        news?: {
            articles: Array<any>;
        };
        mpnews?: {
            mediaId: string;
        };
        wxcard?: {
            cardId: string;
        };
    }): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    getCustomMessageRecords(startTime: number, endTime: number, msgId?: number, number?: number): Promise<{
        records: Array<{
            worker: string;
            openid: string;
            opercode: number;
            time: number;
            text: string;
        }>;
        errmsg: string;
        errcode: number;
    }>;
    getArticleSummary(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            intPageReadUser: number;
            intPageReadCount: number;
            oriPageReadUser: number;
            oriPageReadCount: number;
            shareUser: number;
            shareCount: number;
            addToFavUser: number;
            addToFavCount: number;
        }>;
    }>;
    getArticleTotal(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            userSource: number;
            readUser: number;
            readCount: number;
            shareUser: number;
            shareCount: number;
        }>;
    }>;
    getUserRead(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            intPageReadUser: number;
            intPageReadCount: number;
            oriPageReadUser: number;
            oriPageReadCount: number;
            shareUser: number;
            shareCount: number;
            addToFavUser: number;
            addToFavCount: number;
        }>;
    }>;
    getUserShare(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            sharePage: number;
            shareUser: number;
            shareCount: number;
        }>;
    }>;
    getUpstreamMessage(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            msgType: number;
            msgUser: number;
            msgCount: number;
        }>;
    }>;
    getInterfaceSummary(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            callbackCount: number;
            failCount: number;
            totalTime: number;
            maxTime: number;
        }>;
    }>;
    getInterfaceSummaryHour(beginDate: string, endDate: string): Promise<{
        list: Array<{
            refDate: string;
            refHour: number;
            callbackCount: number;
            failCount: number;
            totalTime: number;
            maxTime: number;
        }>;
    }>;
    getCurrentAutoReplyInfo(): Promise<{
        isAddFriendReply: boolean;
        isAutoReply: boolean;
        addFriendReplyInfo: {
            type: string;
            content: string;
        };
        defaultMessageReplyInfoList: Array<{
            type: string;
            content: string;
        }>;
        keywordAutoreplyInfoList: Array<{
            keyword: string;
            matchMode: number;
            replyListInfo: Array<any>;
        }>;
    }>;
    sendMassMessageByTag(data: {
        filter: {
            isToAll: boolean;
            tagId?: number;
        };
        mpnews?: {
            mediaId: string;
        };
        msgtype: 'mpnews' | 'text' | 'voice' | 'image' | 'mpvideo' | 'wxcard';
        text?: {
            content: string;
        };
        voice?: {
            mediaId: string;
        };
        image?: {
            mediaId: string;
        };
        mpvideo?: {
            mediaId: string;
        };
        wxcard?: {
            cardId: string;
        };
        sendIgnoreReprint?: number;
    }): Promise<{
        errcode: number;
        errmsg: string;
        msgId: number;
        msgDataId: number;
    }>;
    sendMassMessageByOpenId(data: {
        touser: string[];
        mpnews?: {
            mediaId: string;
        };
        msgtype: 'mpnews' | 'text' | 'voice' | 'image' | 'mpvideo' | 'wxcard';
        text?: {
            content: string;
        };
        voice?: {
            mediaId: string;
        };
        image?: {
            mediaId: string;
        };
        mpvideo?: {
            mediaId: string;
        };
        wxcard?: {
            cardId: string;
        };
        sendIgnoreReprint?: number;
    }): Promise<{
        errcode: number;
        errmsg: string;
        msgId: number;
        msgDataId: number;
    }>;
    deleteMassMessage(msgId: number, articleIdx?: number): Promise<{
        errcode: number;
        errmsg: string;
    }>;
    previewMassMessage(data: {
        touser: string;
        mpnews?: {
            mediaId: string;
        };
        msgtype: 'mpnews' | 'text' | 'voice' | 'image' | 'mpvideo' | 'wxcard';
        text?: {
            content: string;
        };
        voice?: {
            mediaId: string;
        };
        image?: {
            mediaId: string;
        };
        mpvideo?: {
            mediaId: string;
        };
        wxcard?: {
            cardId: string;
        };
    }): Promise<{
        errcode: number;
        errmsg: string;
        msgId: number;
    }>;
    sendSubscribeMessage(data: {
        touser: string;
        templateId: string;
        page?: string;
        miniprogram?: {
            appId: string;
            pagePath: string;
        };
        data: Record<string, {
            value: string;
        }>;
    }): Promise<{
        errcode: number;
        errmsg: string;
        msgid: number;
    }>;
}
