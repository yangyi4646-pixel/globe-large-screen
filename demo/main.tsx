import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SuperAppGlobeApp } from '@towerx';
import { getAppBaseUrl } from '@towerx/core/url';
import { PrimitivesDemo } from './PrimitivesDemo';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element "#root" was not found.');
}

const appRootElement = rootElement;

function getRouterBasename(): string | undefined {
    const appBasename = (window as Window & { __APP_BASENAME__?: string }).__APP_BASENAME__;

    return appBasename || getAppBaseUrl() || undefined;
}

/**
 * 走 `?demo=primitives` 进入 PrimitivesDemo —— D3.5 加的原语脱样板验证页;
 * 默认仍是 TowerX 样板大屏。
 */
function shouldShowPrimitivesDemo(): boolean {
    if (typeof window === 'undefined') return false;
    return new URL(window.location.href).searchParams.get('demo') === 'primitives';
}

function bootstrap(): void {
    const showPrimitives = shouldShowPrimitivesDemo();
    ReactDOM.createRoot(appRootElement).render(
        <React.StrictMode>
            {showPrimitives ? (
                <PrimitivesDemo />
            ) : (
                <BrowserRouter basename={getRouterBasename()}>
                    <SuperAppGlobeApp />
                </BrowserRouter>
            )}
        </React.StrictMode>,
    );
}

bootstrap();
