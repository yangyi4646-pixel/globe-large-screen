# card filter 说明

这份文档只回答一件事：当前业务条件，如何稳定地转换成 card 可消费的 `filter`。

## 核心结论

- 发给 `/api/card/:id/data` 时，过滤条件统一放在请求参数 `filters` 里
- 发给 iframe card 时，`bridge.sendMessage(...)` 直接传 `filter[]`
- 当前仓库的 `src/bi-services/card.ts` 已导出 `IFieldFilter`，可直接复用
- 真正发给目标 card 的字段信息来自目标 card，不来自条件产生方式
- 同一个业务条件驱动多张 card 时，可以复用同一组字段映射

## 必填输入

- 当前业务条件值
- 目标 `cardId`
- 目标字段的 `fdId`
- 目标字段的 `name`
- 目标字段的 `fdType`

如果上面任一字段不明确，不要继续猜，先回到 card info 核对。

## 字段从哪里来

- 业务条件可能来自 selector、card 点击、页面自定义 options、URL 参数或默认值
- card 可过滤字段来自 `getCardInfo(cardId).content.dsInfo.columns`
- 发给 card 的 `fdId / fdType / name` 都应该来自目标 card

最容易出错的点是把条件来源标识当成 `fdId`。这两个值语义完全不同。

## 联动流程

1. 先明确当前生效的业务条件
2. 调 `getCardInfo(cardId)`，确认目标字段在 `content.dsInfo.columns` 中存在
3. 在 `src/services/` 里固化字段映射
4. 把当前条件组装成 `filter`
5. 把 `filter` 发给目标 card

页面层只管理条件状态、触发更新和渲染状态，不负责拼过滤对象。联动只是条件来源，真正发请求时统一传 `filter`。

## `filter` 结构

`filter` 的最小结构如下：

```ts
const filter = [
    {
        fdId: field.fdId,
        fdType: field.fdType,
        name: field.name,
        filterLevel: 'DETAIL',
        filterType: 'IN',
        filterValue: currentValue ? [currentValue] : [],
        displayValue: [],
    },
];

// API card
await getStandardCardData(cardId, { filters: filter });

// iframe card
bridge.sendMessage(filter);
```

关键字段说明：

- `fdId`：目标字段 ID
- `fdType`：目标字段类型，例如 `STRING`
- `name`：目标字段名
- `filterLevel`：过滤层级，当前文档示例统一使用 `DETAIL`
- `filterType`：当前联动场景固定用 `IN`
- `filterValue`：当前选中的值数组
- `displayValue`：展示值数组；当前仓库默认传空数组即可

## 多 Card 共享规则

同一个业务条件同时联动 iframe card、表格 card、图表 card 时：

- iframe 侧复用同一个 `fdId / name`
- API 侧复用同一个 `fdId / fdType / name`

如果几张 card 来自同一个数据集，这种做法最稳。

## selector 只是条件产生方式之一

- 如果条件来自 selector，先调 `getSelectorOptions(selectorId)` 拿可选值
- selector 负责产出当前条件，不负责决定目标 card 的字段映射
- selectorId 不是目标 card 的字段 ID
