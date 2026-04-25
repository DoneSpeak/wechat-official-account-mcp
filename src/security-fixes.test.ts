import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthManager } from './auth/auth-manager.js';
import { WechatApiClient } from './wechat/api-client.js';

test('setCredentialsFromCli keeps optional fields and only clears token when credentials change', async () => {
  let clearAccessTokenCalls = 0;
  let savedConfig: Record<string, unknown> | null = null;

  const storageManagerMock = {
    initialize: async () => undefined,
    getConfig: async () => null,
    getAccessToken: async () => null,
    saveConfig: async (config: Record<string, unknown>) => {
      savedConfig = config;
    },
    clearAccessToken: async () => {
      clearAccessTokenCalls += 1;
    },
  };

  const authManager = new AuthManager();
  (authManager as any).storageManager = storageManagerMock;
  (authManager as any).config = {
    appId: 'wx-old',
    appSecret: 'secret-old',
    token: 'server-token',
    encodingAESKey: '1234567890123456789012345678901234567890123',
  };

  await authManager.setCredentialsFromCli('wx-old', 'secret-old');

  assert.equal(clearAccessTokenCalls, 0);
  assert.deepEqual(savedConfig, {
    appId: 'wx-old',
    appSecret: 'secret-old',
    token: 'server-token',
    encodingAESKey: '1234567890123456789012345678901234567890123',
  });

  await authManager.setCredentialsFromCli('wx-new', 'secret-old');
  assert.equal(clearAccessTokenCalls, 1);
});

test('api client retries 40001 once and refreshes token', async () => {
  let refreshCalls = 0;
  let requestCalls = 0;

  const authManagerMock = {
    getAccessToken: async () => ({
      accessToken: refreshCalls === 0 ? 'token-old' : 'token-new',
      expiresIn: 7200,
      expiresAt: Date.now() + 7200_000,
    }),
    refreshAccessToken: async () => {
      refreshCalls += 1;
      return {
        accessToken: 'token-new',
        expiresIn: 7200,
        expiresAt: Date.now() + 7200_000,
      };
    },
  };

  const apiClient = new WechatApiClient(authManagerMock as any);
  const httpClient = (apiClient as any).httpClient;

  httpClient.defaults.adapter = async (config: any) => {
    requestCalls += 1;

    if (requestCalls === 1) {
      assert.ok(config.url.includes('access_token=token-old'));
      return {
        data: { errcode: 40001, errmsg: 'invalid credential' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    assert.ok(config.url.includes('access_token=token-new'));
    return {
      data: { errcode: 0, ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const response = await httpClient.get('/cgi-bin/test');
  assert.equal(response.data.ok, true);
  assert.equal(refreshCalls, 1);
  assert.equal(requestCalls, 2);
});

test('api client retries transient 5xx errors', async () => {
  let requestCalls = 0;

  const authManagerMock = {
    getAccessToken: async () => ({
      accessToken: 'token-static',
      expiresIn: 7200,
      expiresAt: Date.now() + 7200_000,
    }),
    refreshAccessToken: async () => ({
      accessToken: 'token-static',
      expiresIn: 7200,
      expiresAt: Date.now() + 7200_000,
    }),
  };

  const apiClient = new WechatApiClient(authManagerMock as any);
  const httpClient = (apiClient as any).httpClient;

  httpClient.defaults.adapter = async (config: any) => {
    requestCalls += 1;

    if (requestCalls < 3) {
      return Promise.reject({
        config,
        response: { status: 500 },
        message: 'server error',
      });
    }

    return {
      data: { errcode: 0, ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  const response = await httpClient.get('/cgi-bin/retry');
  assert.equal(response.data.ok, true);
  assert.equal(requestCalls, 3);
});
