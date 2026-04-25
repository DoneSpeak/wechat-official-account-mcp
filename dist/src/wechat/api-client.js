import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger.js';
export class WechatApiClient {
    constructor(authManager) {
        Object.defineProperty(this, "authManager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "httpClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.authManager = authManager;
        this.httpClient = axios.create({
            baseURL: 'https://api.weixin.qq.com',
            timeout: 30000,
        });
        this.httpClient.interceptors.request.use(async (config) => {
            const retryMetadata = this.getRetryMetadata(config);
            if (config.url && !config.url.includes('access_token=')) {
                const tokenInfo = await this.authManager.getAccessToken();
                const separator = config.url.includes('?') ? '&' : '?';
                config.url += `${separator}access_token=${tokenInfo.accessToken}`;
            }
            retryMetadata.retryCount = retryMetadata.retryCount ?? 0;
            retryMetadata.tokenRefreshAttempted = retryMetadata.tokenRefreshAttempted ?? false;
            return config;
        });
        this.httpClient.interceptors.response.use(async (response) => {
            const config = response.config;
            const retryMetadata = this.getRetryMetadata(config);
            const errcode = response?.data?.errcode;
            if (errcode === 40001 && !retryMetadata.tokenRefreshAttempted) {
                retryMetadata.tokenRefreshAttempted = true;
                await this.authManager.refreshAccessToken();
                config.url = this.stripAccessTokenFromUrl(config.url);
                return this.httpClient.request(config);
            }
            return response;
        }, async (error) => {
            const status = error?.response?.status;
            const config = error.config;
            if (config) {
                const retryMetadata = this.getRetryMetadata(config);
                if (this.shouldRetryRequest(error) &&
                    (retryMetadata.retryCount ?? 0) < WechatApiClient.MAX_HTTP_RETRIES) {
                    retryMetadata.retryCount = (retryMetadata.retryCount ?? 0) + 1;
                    await this.sleep(WechatApiClient.RETRY_BACKOFF_MS * retryMetadata.retryCount);
                    return this.httpClient.request(config);
                }
            }
            logger.error('Wechat API request failed:', status ? String(status) : error?.message);
            throw error;
        });
    }
    getAuthManager() {
        return this.authManager;
    }
    getRetryMetadata(config) {
        const target = (config ?? {});
        if (!target.__retryMetadata) {
            target.__retryMetadata = {};
        }
        return target.__retryMetadata;
    }
    shouldRetryRequest(error) {
        const code = error.code ?? '';
        const status = error.response?.status;
        if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
            return true;
        }
        if (status === 429) {
            return true;
        }
        return typeof status === 'number' && status >= 500;
    }
    stripAccessTokenFromUrl(url) {
        if (!url)
            return url;
        return url
            .replace(/([?&])access_token=[^&]*(&)?/g, (match, separator, hasTail) => {
            if (separator === '?' && hasTail)
                return '?';
            return hasTail ? separator : '';
        })
            .replace(/[?&]$/, '');
    }
    async sleep(ms) {
        await new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    async uploadMedia(params) {
        try {
            const formData = new FormData();
            formData.append('media', params.media, params.fileName);
            if (params.type === 'video') {
                const description = {
                    title: params.title || 'Video',
                    introduction: params.introduction || '',
                };
                formData.append('description', JSON.stringify(description));
            }
            const response = await this.httpClient.post(`/cgi-bin/media/upload?type=${params.type}`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            if (response.data.errcode) {
                throw new Error(`Upload failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return {
                mediaId: response.data.media_id,
                type: response.data.type,
                createdAt: response.data.created_at * 1000,
                url: response.data.url,
            };
        }
        catch (error) {
            logger.error('Failed to upload media:', error?.message ?? String(error));
            throw error;
        }
    }
    async getMedia(mediaId) {
        try {
            const response = await this.httpClient.get(`/cgi-bin/media/get?media_id=${mediaId}`, {
                responseType: 'arraybuffer',
            });
            return Buffer.from(response.data);
        }
        catch (error) {
            logger.error('Failed to get media:', error?.message ?? String(error));
            throw error;
        }
    }
    async addNews(articles) {
        try {
            const response = await this.httpClient.post('/cgi-bin/material/add_news', {
                articles,
            });
            if (response.data.errcode) {
                throw new Error(`Add news failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return {
                mediaId: response.data.media_id,
            };
        }
        catch (error) {
            logger.error('Failed to add news:', error?.message ?? String(error));
            throw error;
        }
    }
    async addDraft(articles) {
        try {
            const response = await this.httpClient.post('/cgi-bin/draft/add', {
                articles,
            });
            if (response.data.errcode) {
                throw new Error(`Add draft failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return {
                mediaId: response.data.media_id,
            };
        }
        catch (error) {
            logger.error('Failed to add draft:', error?.message ?? String(error));
            throw error;
        }
    }
    async publishDraft(mediaId) {
        try {
            const response = await this.httpClient.post('/cgi-bin/freepublish/submit', {
                media_id: mediaId,
            });
            if (response.data.errcode) {
                throw new Error(`Publish failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return {
                publishId: response.data.publish_id,
                msgDataId: response.data.msg_data_id,
            };
        }
        catch (error) {
            logger.error('Failed to publish draft:', error?.message ?? String(error));
            throw error;
        }
    }
    async uploadImg(formData) {
        try {
            const response = await this.httpClient.post('/cgi-bin/media/uploadimg', formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            return response.data;
        }
        catch (error) {
            logger.error('Failed to upload image:', error?.message ?? String(error));
            throw error;
        }
    }
    async get(path, params) {
        try {
            const response = await this.httpClient.get(path, { params });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`API Error: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error(`GET ${path} failed:`, error?.message ?? String(error));
            throw error;
        }
    }
    async post(path, data) {
        try {
            const response = await this.httpClient.post(path, data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`API Error: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error(`POST ${path} failed:`, error?.message ?? String(error));
            throw error;
        }
    }
    async getUserList(nextOpenId) {
        try {
            const params = nextOpenId ? { next_openid: nextOpenId } : {};
            const response = await this.httpClient.get('/cgi-bin/user/get', { params });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get user list failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get user list:', error?.message ?? String(error));
            throw error;
        }
    }
    async getUserInfo(openId, lang = 'zh_CN') {
        try {
            const response = await this.httpClient.get('/cgi-bin/user/info', {
                params: { openid: openId, lang }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get user info failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get user info:', error?.message ?? String(error));
            throw error;
        }
    }
    async batchGetUserInfo(userList, lang = 'zh_CN') {
        try {
            const response = await this.httpClient.post('/cgi-bin/user/info/batchget', {
                user_list: userList.map(openid => ({ openid, lang }))
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Batch get user info failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to batch get user info:', error?.message ?? String(error));
            throw error;
        }
    }
    async updateUserRemark(openId, remark) {
        try {
            const response = await this.httpClient.post('/cgi-bin/user/info/updateremark', {
                openid: openId,
                remark
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Update user remark failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to update user remark:', error?.message ?? String(error));
            throw error;
        }
    }
    async getUserSummary(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getusersummary', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get user summary failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get user summary:', error?.message ?? String(error));
            throw error;
        }
    }
    async getUserCumulate(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getusercumulate', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get user cumulate failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get user cumulate:', error?.message ?? String(error));
            throw error;
        }
    }
    async createTag(name) {
        try {
            const response = await this.httpClient.post('/cgi-bin/tags/create', { tag: { name } });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Create tag failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to create tag:', error?.message ?? String(error));
            throw error;
        }
    }
    async getTags() {
        try {
            const response = await this.httpClient.get('/cgi-bin/tags/get');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get tags failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get tags:', error?.message ?? String(error));
            throw error;
        }
    }
    async updateTag(tagId, name) {
        try {
            const response = await this.httpClient.post('/cgi-bin/tags/update', { tag: { id: tagId, name } });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Update tag failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to update tag:', error?.message ?? String(error));
            throw error;
        }
    }
    async deleteTag(tagId) {
        try {
            const response = await this.httpClient.post('/cgi-bin/tags/delete', { tag: { id: tagId } });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Delete tag failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to delete tag:', error?.message ?? String(error));
            throw error;
        }
    }
    async batchTagging(openIdList, tagId) {
        try {
            const response = await this.httpClient.post('/cgi-bin/tags/members/batchtagging', {
                openid_list: openIdList,
                tagid: tagId
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Batch tagging failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to batch tagging:', error?.message ?? String(error));
            throw error;
        }
    }
    async batchUntagging(openIdList, tagId) {
        try {
            const response = await this.httpClient.post('/cgi-bin/tags/members/batchuntagging', {
                openid_list: openIdList,
                tagid: tagId
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Batch untagging failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to batch untagging:', error?.message ?? String(error));
            throw error;
        }
    }
    async getTagUsers(tagId, nextOpenId) {
        try {
            const params = { tagid: tagId };
            if (nextOpenId)
                params.next_openid = nextOpenId;
            const response = await this.httpClient.post('/cgi-bin/user/tag/get', params);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get tag users failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get tag users:', error?.message ?? String(error));
            throw error;
        }
    }
    async createMenu(menuData) {
        try {
            const response = await this.httpClient.post('/cgi-bin/menu/create', menuData);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Create menu failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to create menu:', error?.message ?? String(error));
            throw error;
        }
    }
    async getMenu() {
        try {
            const response = await this.httpClient.get('/cgi-bin/menu/get');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get menu failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get menu:', error?.message ?? String(error));
            throw error;
        }
    }
    async deleteMenu() {
        try {
            const response = await this.httpClient.post('/cgi-bin/menu/delete');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Delete menu failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to delete menu:', error?.message ?? String(error));
            throw error;
        }
    }
    async addConditionalMenu(menuData) {
        try {
            const response = await this.httpClient.post('/cgi-bin/menu/addconditional', menuData);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Add conditional menu failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to add conditional menu:', error?.message ?? String(error));
            throw error;
        }
    }
    async deleteConditionalMenu(menuId) {
        try {
            const response = await this.httpClient.post('/cgi-bin/menu/delconditional', { menuid: menuId });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Delete conditional menu failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to delete conditional menu:', error?.message ?? String(error));
            throw error;
        }
    }
    async getSelfMenuInfo() {
        try {
            const response = await this.httpClient.get('/cgi-bin/get_current_selfmenu_info');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get self menu info failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get self menu info:', error?.message ?? String(error));
            throw error;
        }
    }
    async sendTemplateMessage(data) {
        try {
            const response = await this.httpClient.post('/cgi-bin/message/template/send', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Send template message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to send template message:', error?.message ?? String(error));
            throw error;
        }
    }
    async getAllPrivateTemplates() {
        try {
            const response = await this.httpClient.get('/cgi-bin/template/get_all_private_template');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get templates failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get templates:', error?.message ?? String(error));
            throw error;
        }
    }
    async deletePrivateTemplate(templateId) {
        try {
            const response = await this.httpClient.post('/cgi-bin/template/del_private_template', {
                template_id: templateId
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Delete template failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to delete template:', error?.message ?? String(error));
            throw error;
        }
    }
    async getTemplateIndustry() {
        try {
            const response = await this.httpClient.get('/cgi-bin/template/get_industry');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get template industry failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get template industry:', error?.message ?? String(error));
            throw error;
        }
    }
    async sendCustomMessage(data) {
        try {
            const response = await this.httpClient.post('/cgi-bin/message/custom/send', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Send custom message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to send custom message:', error?.message ?? String(error));
            throw error;
        }
    }
    async getCustomMessageRecords(startTime, endTime, msgId, number) {
        try {
            const data = {
                starttime: startTime,
                endtime: endTime
            };
            if (msgId !== undefined)
                data.msgid = msgId;
            if (number !== undefined)
                data.number = number;
            const response = await this.httpClient.post('/custommsg/get_records', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get custom message records failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get custom message records:', error?.message ?? String(error));
            throw error;
        }
    }
    async getArticleSummary(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getarticlesummary', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get article summary failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get article summary:', error?.message ?? String(error));
            throw error;
        }
    }
    async getArticleTotal(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getarticletotal', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get article total failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get article total:', error?.message ?? String(error));
            throw error;
        }
    }
    async getUserRead(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getuserread', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get user read failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get user read:', error?.message ?? String(error));
            throw error;
        }
    }
    async getUserShare(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getusershare', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get user share failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get user share:', error?.message ?? String(error));
            throw error;
        }
    }
    async getUpstreamMessage(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getupstreammsg', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get upstream message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get upstream message:', error?.message ?? String(error));
            throw error;
        }
    }
    async getInterfaceSummary(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getinterfacesummary', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get interface summary failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get interface summary:', error?.message ?? String(error));
            throw error;
        }
    }
    async getInterfaceSummaryHour(beginDate, endDate) {
        try {
            const response = await this.httpClient.get('/cgi-bin/datacube/getinterfacesummaryhour', {
                params: { begin_date: beginDate, end_date: endDate }
            });
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get interface summary hour failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get interface summary hour:', error?.message ?? String(error));
            throw error;
        }
    }
    async getCurrentAutoReplyInfo() {
        try {
            const response = await this.httpClient.get('/cgi-bin/get_current_autoreply_info');
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Get auto reply info failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to get auto reply info:', error?.message ?? String(error));
            throw error;
        }
    }
    async sendMassMessageByTag(data) {
        try {
            const response = await this.httpClient.post('/cgi-bin/message/mass/sendall', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Send mass message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to send mass message:', error?.message ?? String(error));
            throw error;
        }
    }
    async sendMassMessageByOpenId(data) {
        try {
            const response = await this.httpClient.post('/cgi-bin/message/mass/send', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Send mass message by openid failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to send mass message by openid:', error?.message ?? String(error));
            throw error;
        }
    }
    async deleteMassMessage(msgId, articleIdx) {
        try {
            const data = { msgId };
            if (articleIdx !== undefined)
                data.articleIdx = articleIdx;
            const response = await this.httpClient.post('/cgi-bin/message/mass/delete', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Delete mass message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to delete mass message:', error?.message ?? String(error));
            throw error;
        }
    }
    async previewMassMessage(data) {
        try {
            const response = await this.httpClient.post('/cgi-bin/message/mass/preview', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Preview mass message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to preview mass message:', error?.message ?? String(error));
            throw error;
        }
    }
    async sendSubscribeMessage(data) {
        try {
            const response = await this.httpClient.post('/cgi-bin/message/subscribe/send', data);
            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`Send subscribe message failed: ${response.data.errmsg} (${response.data.errcode})`);
            }
            return response.data;
        }
        catch (error) {
            logger.error('Failed to send subscribe message:', error?.message ?? String(error));
            throw error;
        }
    }
}
Object.defineProperty(WechatApiClient, "MAX_HTTP_RETRIES", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 2
});
Object.defineProperty(WechatApiClient, "RETRY_BACKOFF_MS", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 500
});
