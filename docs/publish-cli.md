# Publish CLI

## 目的

`/publish` 页面提供了打包构建、预览、上传发布等 UX 交互，但这些能力背后并不只是页面逻辑。

当前仓库已经在本地开发服务器里提供了一组可通过命令行调用的发布相关接口，适合以下场景：

- 用 `curl` 或 shell 脚本替代浏览器点击
- 在本地做半自动发布
- 后续接 CI/CD 或单独的 `scripts/publish.mjs`

⚠️ 这些接口是本仓库的本地开发工作流接口，不是面向线上开放的公共 API。

## 前置条件

### 1. 初始化环境变量

首次使用前先准备 `.env`：

```bash
cp .env.template .env
```

关键配置项如下：

- `VITE_DEV_PORT`：本地开发服务端口，默认 `8000`
- `VITE_BI_HOST`：目标 BI 地址，例如 `https://app.guandata.com`
- `VITE_UID_TOKEN`：目标环境用户 Token；如果已填写，本地代理请求 BI 时会优先带上
- `VITE_BI_LOGIN_DOMAIN`：账号密码登录使用的域，默认 `guanbi`
- `VITE_BI_LOGIN_ID`：账号密码登录的账号
- `VITE_BI_LOGIN_PASSWORD`：账号密码登录的明文密码；本地脚本会在请求 `/api/user/sign-in` 前自动转成 `base64`
- `VITE_APP_ID`：当前应用绑定的 SuperApp ID；为空表示发布时走新建流程

如果 `VITE_BI_HOST` 为空，或者 `VITE_UID_TOKEN` 与账号密码配置都未完成，或者后续校验发现未登录、Token 无效，推荐直接打开本地 `/dev` 页面完成配置：

```bash
http://localhost:8000/dev
```

其中端口取自 `.env` 的 `VITE_DEV_PORT`；未配置时默认是 `8000`。

### 2. 启动开发服务

```bash
npm run dev
```

启动后，`/publish` 页面使用的本地接口会挂载在当前开发端口下。默认地址通常是：

```bash
http://localhost:8000
```

如果你修改了 `VITE_DEV_PORT` 或通过 `npm run dev -- --port <port>` 指定端口，请同步替换下面示例中的端口。

## 能力分层

发布相关能力分为两层：

### 本地工作流接口

由本仓库开发服务器提供，负责：

- 查询当前版本和推荐版本
- 执行 `npm run build`
- 将 `dist` 打成 zip
- 读取或删除本地产物
- 写入 `VITE_APP_ID`
- 提供构建后预览地址

### BI 接口

通过 Vite 代理转发到 `VITE_BI_HOST`，负责：

- 获取当前用户信息
- 上传 zip
- 创建应用
- 更新已有应用

只要 `VITE_UID_TOKEN` 已配置，或已配置可用的账号密码登录信息，本地通过 `/api/...` 调 BI 时就会自动附带 token 头。

如果 `VITE_BI_HOST` 缺失、鉴权配置缺失，或 `/api/validate-token` 校验出未登录、Token 无效，正确处理方式不是继续重试发布，而是先打开 `/dev` 页面让用户完成配置或登录，再回到发布流程。

## 本地工作流接口

### 1. 查询发布信息

```bash
curl http://localhost:8000/__dev/publish
```

用途：

- 查看当前 `package.json` 版本
- 查看推荐的下一个版本号
- 查看当前是否已绑定 `VITE_APP_ID`
- 查看本地已有的 `dist.x.y.z.zip` 产物列表

典型返回字段：

- `currentVersion`
- `recommendedVersion`
- `packageInfo`
- `superApp`
- `artifacts`

### 2. 查询推荐版本号

```bash
curl http://localhost:8000/__dev/publish/recommend
```

典型返回：

```json
{
    "currentVersion": "0.1.0",
    "recommendedVersion": "0.1.1"
}
```

说明：

- 当前实现只支持 `x.y.z` 格式版本号
- 推荐逻辑是 patch 位 `+1`

### 3. 构建并生成发布压缩包

默认只打包，不修改版本号：

```bash
curl -X POST http://localhost:8000/__dev/publish/build
```

如果调用方已经明确确认要修改版本号，再显式传参：

```bash
curl -X POST http://localhost:8000/__dev/publish/build \
  -H 'Content-Type: application/json' \
  -d '{"updateVersion":true,"version":"0.1.1"}'
```

用途：

- 执行 `npm run build`
- 校验 `dist/` 是否存在
- 按当前 `package.json.version` 生成压缩包，例如 `dist.0.1.0.zip`
- 只有当请求体显式传 `updateVersion: true` 时，才会先修改 `package.json.version`

⚠️ 副作用：

- 会在仓库根目录生成 zip 文件
- 当且仅当显式传 `updateVersion: true` 时，会改写 `package.json`

输出产物命名规则：

```text
dist.<version>.zip
```

例如：

```text
dist.0.1.1.zip
```

### 4. 下载本地构建产物

```bash
curl -OJ "http://localhost:8000/__dev/publish/artifact-file?fileName=dist.0.1.1.zip"
```

用途：

- 将本地已生成的 zip 读出来，适合脚本串联后续上传步骤

### 5. 删除本地构建产物

```bash
curl -X DELETE http://localhost:8000/__dev/publish/artifact \
  -H 'Content-Type: application/json' \
  -d '{"fileName":"dist.0.1.1.zip"}'
```

用途：

- 删除仓库根目录下的某个发布压缩包

限制：

- 文件名必须匹配 `dist.x.y.z.zip`

### 6. 绑定 SuperApp ID

```bash
curl -X POST http://localhost:8000/__dev/publish/bind-app \
  -H 'Content-Type: application/json' \
  -d '{"appId":"your-app-id"}'
```

用途：

- 将 `VITE_APP_ID` 写入 `.env`

⚠️ 副作用：

- 会改写 `.env`

## 预览

构建成功后，预览步骤建议直接使用：

```bash
npm run preview:open
```

这个命令会：

- 读取 `.env` 中的 `VITE_DEV_PORT`
- 先检测这个端口是否已被占用
- 如果端口未被占用，则先启动本地开发服务
- 服务可用后，使用默认浏览器打开预览页

当前仓库的 dev server 预览协议是 `http`，因此实际预览地址为：

```bash
http://localhost:<port>/open-apps/preview/
```

其中 `<port>` 为 `.env` 中配置的 `VITE_DEV_PORT`。

这个地址会托管当前 `dist/` 目录内容。

如果未先执行构建，会返回“尚未构建”的提示页。

⚠️ 当前仓库未启用 HTTPS 本地开发证书，因此这里不能写成 `https://localhost:<port>/open-apps/preview/`。

## 通过命令行完成上传发布

`/publish` 页面里的“上传发布”实际上依赖以下 BI 接口：

- `POST /api/open-apps/upload`
- `POST /api/open-apps/create`
- `POST /api/open-apps/update`

此外页面还会用：

- `GET /api/validate-token`
- `GET /api/user/profile`

其中：

- `/api/validate-token` 用于校验当前 `VITE_UID_TOKEN` 是否有效
- `/api/user/profile` 用于判断当前用户是否有管理员角色

### 1. 检查当前 token

```bash
curl -H "token: <VITE_UID_TOKEN>" http://localhost:8000/api/validate-token
```

说明：

- 该请求会通过本地代理转发到 `VITE_BI_HOST`
- 如果返回非 `2xx`，应先回到 `/dev` 页面修正 token 或登录配置

### 2. 检查当前用户

```bash
curl http://localhost:8000/api/user/profile
```

说明：

- 该请求会通过本地代理转发到 `VITE_BI_HOST`
- 如果 `.env` 中已配置 `VITE_UID_TOKEN`，或已配置可用的账号密码登录信息，代理会自动带上 `token` 请求头
- 页面侧会把 `role` 包含 `admin` 或 `super_admin` 的用户视为可发布

### 3. 上传 zip

```bash
curl -X POST http://localhost:8000/api/open-apps/upload \
  -F "file=@dist.0.1.1.zip"
```

返回里通常会带一个 `fileKey`，后续创建或更新应用时要使用它。

### 4. 首次发布：创建应用

当 `.env` 中没有 `VITE_APP_ID` 时，页面走创建流程：

- `/publish` 页面会默认用 `public/settings.json` 中的 `name`
- 如果 `name` 为空，则回退到 `title`
- 两者都读不到时，才回退到当前项目的兜底展示名称

```bash
curl -X POST http://localhost:8000/api/open-apps/create \
  -H 'Content-Type: application/json' \
  -d '{
    "appName": "your-app-name",
    "description": "your description",
    "fileKey": "returned-file-key",
    "version": "0.1.1"
  }'
```

创建成功后，应再调用本地绑定接口，把返回的 `appId` 写回 `.env`：

```bash
curl -X POST http://localhost:8000/__dev/publish/bind-app \
  -H 'Content-Type: application/json' \
  -d '{"appId":"returned-app-id"}'
```

### 5. 已存在应用：更新发布

当 `.env` 中已有 `VITE_APP_ID` 时，页面走更新流程：

- `/publish` 页面确认发布时不再要求填写应用名称和描述
- 只需要确认版本号并选择要上传的 zip 包
- 应用名称和描述沿用线上已绑定 SuperApp 的现有配置

```bash
curl -X POST http://localhost:8000/api/open-apps/update \
  -H 'Content-Type: application/json' \
  -d '{
    "appId": "your-app-id",
    "fileKey": "returned-file-key",
    "version": "0.1.1"
  }'
```

## 推荐的命令行流程

### 只做本地构建与预览

```bash
curl -X POST http://localhost:8000/__dev/publish/build
npm run preview:open
```

### 明确确认后修改版本再构建

```bash
npm run dev
curl -X POST http://localhost:8000/__dev/publish/build \
  -H 'Content-Type: application/json' \
  -d '{"updateVersion":true,"version":"0.1.1"}'
```

### 完整发布

```bash
npm run dev
curl -X POST http://localhost:8000/__dev/publish/build

curl -X POST http://localhost:8000/api/open-apps/upload \
  -F "file=@dist.0.1.1.zip"

# 新应用时调用 create，并把返回的 appId 写回 .env
# 已有应用时调用 update
```

## 常见问题

### 为什么必须先启动 `npm run dev`？

因为这套 CLI 调用方式当前依赖开发服务器暴露：

- `/__dev/publish/*`
- `/open-apps/preview/`
- `/api/*` 到 BI 的本地代理

如果不启动开发服务，这些地址都不存在。

### 为什么 build 不是单纯只打包？

当前实现里，`POST /__dev/publish/build` 不只是 `vite build`，还包含：

- 校验 `dist`
- 打 zip
- 可选地更新 `package.json` 版本

所以它是一个“发布构建动作”，不是单纯的“编译动作”。

### 这些接口适合长期对外暴露吗？

不建议把它们当成稳定公共接口来承诺。

如果后续需要稳定支持命令行或 CI，建议新增一个正式脚本，例如：

```bash
node scripts/publish.mjs build --version 0.1.1
node scripts/publish.mjs release --version 0.1.1
```

然后让脚本内部复用当前这些底层函数，而不是让外部长期直接依赖 `/__dev/publish/*`。
