import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_TITLE, loadAppSettings, resolveAppTitle } from '../../src/services/settings';

describe('settings', () => {
    beforeEach(() => {
        window.history.pushState({}, '', '/');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('prefers title and falls back to name or default title', () => {
        expect(resolveAppTitle({ title: ' Dashboard ', name: 'Ignored' })).toBe('Dashboard');
        expect(resolveAppTitle({ name: 'Studio App' })).toBe('Studio App');
        expect(resolveAppTitle({})).toBe(DEFAULT_APP_TITLE);
    });

    it('loads settings.json with no-store cache', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ title: 'Studio' }), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                },
            }),
        );

        vi.stubGlobal('fetch', fetchMock);

        await expect(loadAppSettings()).resolves.toEqual({ title: 'Studio' });
        expect(fetchMock).toHaveBeenCalledWith('/settings.json', { cache: 'no-store' });
    });

    it('loads settings.json from the current app base url in development', async () => {
        window.history.pushState({}, '', '/bi-test/open-apps/abc-123/page');

        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ title: 'Studio' }), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                },
            }),
        );

        vi.stubGlobal('fetch', fetchMock);

        await expect(loadAppSettings()).resolves.toEqual({ title: 'Studio' });
        expect(fetchMock).toHaveBeenCalledWith('/settings.json', { cache: 'no-store' });
    });

    it('throws when settings.json cannot be loaded', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response('', {
                    status: 500,
                }),
            ),
        );

        await expect(loadAppSettings()).rejects.toThrow('settings.json 加载失败: 500');
    });
});
