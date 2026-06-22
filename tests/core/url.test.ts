import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUrl, getAppBaseUrl, getBIBaseRouteUrl, getBIResourceUrl, getBIWebRouteUrl } from '../../src/core/url';

describe('core/url', () => {
    beforeEach(() => {
        vi.stubGlobal('__DEV__', false);
        vi.stubGlobal('__DEV_BI_HOST__', '');
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        window.history.replaceState({}, '', '/');
    });

    it('resolves BI base route url in production from pathname', () => {
        window.history.replaceState({}, '', '/bi-test/open-apps/demo?tab=1#hash');
        expect(getBIBaseRouteUrl()).toBe('/bi-test');

        window.history.replaceState({}, '', '/open-apps/demo');
        expect(getBIBaseRouteUrl()).toBe('');

        window.history.replaceState({}, '', '/some-other-page');
        expect(getBIBaseRouteUrl()).toBe('');
    });

    it('resolves BI base route url in development from __DEV_BI_HOST__', () => {
        vi.stubGlobal('__DEV__', true);
        vi.stubGlobal('__DEV_BI_HOST__', ' https://app.guandata.com/bi-test/ ');

        expect(getBIBaseRouteUrl()).toBe('https://app.guandata.com/bi-test');
    });

    it('resolves app base url from pathname only in production', () => {
        window.history.replaceState({}, '', '/bi-test/open-apps/abc-123/page/detail');
        expect(getAppBaseUrl()).toBe('/bi-test/open-apps/abc-123');

        window.history.replaceState({}, '', '/open-apps/my-App-01/settings?tab=1#hash');
        expect(getAppBaseUrl()).toBe('/open-apps/my-App-01');

        window.history.replaceState({}, '', '/bi-test/other-page');
        expect(getAppBaseUrl()).toBe('');

        vi.stubGlobal('__DEV__', true);
        window.history.replaceState({}, '', '/bi-test/open-apps/demo');
        expect(getAppBaseUrl()).toBe('');
    });

    it('builds BI web route urls against BI base route url', () => {
        window.history.replaceState({}, '', '/bi-test/open-apps/demo/page');
        expect(getBIWebRouteUrl('/dashboard/view?tab=1#summary')).toBe('/bi-test/dashboard/view?tab=1#summary');

        vi.stubGlobal('__DEV__', true);
        vi.stubGlobal('__DEV_BI_HOST__', 'https://app.guandata.com/bi-test/');
        expect(getBIWebRouteUrl('/dashboard/view?tab=1#summary')).toBe(
            'https://app.guandata.com/bi-test/dashboard/view?tab=1#summary',
        );

        vi.stubGlobal('__DEV__', false);
        window.history.replaceState({}, '', '/dev');
        expect(getBIWebRouteUrl('/dashboard/view?tab=1#summary')).toBe('/dashboard/view?tab=1#summary');
        expect(getBIWebRouteUrl('https://cdn.example.com/dashboard/view?tab=1#summary')).toBe(
            'https://cdn.example.com/dashboard/view?tab=1#summary',
        );
    });

    it('builds BI resource urls only for BI resource paths', () => {
        window.history.replaceState({}, '', '/studio/open-apps/demo/page');
        expect(getBIResourceUrl('/api/query?page=1')).toBe('/studio/api/query?page=1');
        expect(getBIResourceUrl('/static/js/app.js?lang=zh#hash')).toBe('/studio/static/js/app.js?lang=zh#hash');
        expect(getBIResourceUrl('/survey-engine/api/form/demo/data')).toBe('/studio/survey-engine/api/form/demo/data');

        vi.stubGlobal('__DEV__', true);
        expect(getBIResourceUrl('/api/query?page=1')).toBe('/api/query?page=1');

        vi.stubGlobal('__DEV__', false);
        expect(getBIResourceUrl('/dev')).toBe('/dev');
        expect(getBIResourceUrl('api/query')).toBe('api/query');
        expect(getBIResourceUrl('  https://cdn.example.com/sdk.js  ')).toBe('https://cdn.example.com/sdk.js');
    });

    it('builds url with query params', () => {
        expect(buildUrl('/api/users')).toBe('/api/users');
        expect(buildUrl('/api/users', {})).toBe('/api/users');
        expect(buildUrl('/api/users', { page: 1, size: 10 })).toBe('/api/users?page=1&size=10');
        expect(buildUrl('/api/users', { tags: ['a', 'b'] })).toBe('/api/users?tags=a&tags=b');
        expect(buildUrl('/api/users?existing=1', { page: 2 })).toBe('/api/users?existing=1&page=2');
        expect(buildUrl('/api/users', { key: null, valid: 'yes' })).toBe('/api/users?valid=yes');
        expect(buildUrl('/api/users', { key: undefined })).toBe('/api/users');
    });
});
