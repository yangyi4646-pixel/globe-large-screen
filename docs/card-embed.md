# 卡片内嵌说明

这份文档只保留 iframe card 接入时最关键的创建方式和传参结构。联动场景下，过滤条件也通过同一套消息传入。

## 核心结论

- 子页面当前明确要求走 `sendMessage` ，不走 `setProps`
- `filter` 直接传数组，不包 `{ filters }`

## SDK 地址

```html
<script src="https://guandata-libs.oss-cn-hangzhou.aliyuncs.com/js-sdk.js"></script>
```

需要使用时，需要在 `index.html` 中直接引用 或 根据情况动态引用

## 最小接入流程

1. 用 `getBIWebRouteUrl(...)` 生成 iframe URL
2. 创建 iframe
3. 用 `window.GDEmbedBridge` 或 `window.GD.createEmbedBridge` 创建 bridge
4. bridge 创建时显式传入 iframe 最终页面的 `targetOrigin`
5. 首帧显式调用 `bridge.sendMessage(filter)`
6. 外部条件变化时继续发送同样结构的消息，不重建 iframe

## 关键参数

- `cardId`
- `targetFieldId`
- `targetFieldType`
- `targetFieldName`
- `currentValue`

如果只有条件来源标识，还不够，字段映射要先去 card info 里确认。

## iframe URL

```ts
import { getBIWebRouteUrl } from '@/core/url';

const iframeSrc = getBIWebRouteUrl(`/card/${cardId}?ps=embed`);
const targetOrigin = new URL(iframeSrc, window.location.href).origin;
```

## 关键传参结构

### filter

```ts
const filter = [
    {
        fdId: targetFieldId,
        fdType: targetFieldType,
        name: targetFieldName,
        filterLevel: 'DETAIL',
        filterType: 'IN',
        filterValue: currentValue ? [currentValue] : [],
        displayValue: currentValue ? [currentValue] : [],
    },
];
```

### send

```ts
bridge.sendMessage(filter);
```

`filter` 的字段含义见 [`card-filter.md`](./card-filter.md)。

## React 推荐时序

在 React 里，最稳的方式是“先创建 bridge，再让 iframe 加载真实地址”：

```tsx
const iframeRef = useRef<HTMLIFrameElement | null>(null);
const bridgeRef = useRef<EmbedBridge | null>(null);
const [iframeSrc, setIframeSrc] = useState('');

useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    bridgeRef.current = createSceneBridge(iframe, {
        sceneType: 'bi-card-embed',
        targetOrigin: new URL(realIframeSrc, window.location.href).origin,
    });

    setIframeSrc(realIframeSrc);

    return () => {
        bridgeRef.current?.destroy();
        bridgeRef.current = null;
    };
}, [realIframeSrc]);

useEffect(() => {
    bridgeRef.current?.sendMessage(filter);
}, [filter]);

function handleIframeLoad() {
    bridgeRef.current?.sendMessage(filter);
}
```

关键点：

- 如果 bridge 创建晚于 iframe 首次初始化，可能会错过首次握手信息
- 如果先创建 bridge、后设置 `src`，必须显式传 `targetOrigin`

### 清空筛选

```ts
const filter = [
    {
        fdId: targetFieldId,
        fdType: targetFieldType,
        name: targetFieldName,
        filterLevel: 'DETAIL',
        filterType: 'IN',
        filterValue: [],
        displayValue: [],
    },
];

bridge.sendMessage(filter);
```
