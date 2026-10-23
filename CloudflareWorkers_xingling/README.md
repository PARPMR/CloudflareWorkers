# 星棱人格库：直接部署到 Cloudflare

把本压缩包内的文件复制到 CloudflareWorkers 仓库根目录，保留原仓库的 .git 文件夹。不要把外层文件夹也套进仓库，根目录应能直接看到 package.json、wrangler.jsonc 和 src/。

此包是独立 Worker 服务源码，不是人格插件安装包。它不依赖 Sites；长期数据保存在你已创建的 R2 桶内。

## 已填写的配置

- Worker 名称：xingleng-persona-memory
- Cloudflare Account ID：ff52687595b64f602482d84cd351446a
- R2 桶名：xingleng-persona-memory
- R2 绑定变量：BUCKET
- 允许登录的 GitHub 数字用户 ID：129664964，对应仓库所有者 PARPMR
- 存储引擎：1.2.0；迁移基线人格修订：2，保留修订 1/2 的历史

GitHub 登录在此处只用于核实身份，申请 read:user，不用于写入 GitHub 仓库。仓库推送使用你自己的本地 Git 登录。

## 1. 复制、检查并推送

在仓库根目录运行：

    npm install
    npm test
    npm run build

确认成功后，通过你自己的 GitHub 登录提交并推送。

本环境的依赖下载失败，因此尚未完成真实依赖安装、Wrangler 打包或部署验证。此包的 15 项本地测试通过，但使用模拟 OAuth 助手和模拟 R2；测试不等于完整登录或真实跨设备验收。没有生成 package-lock.json，请在你联网安装成功后将它一起提交。npm run build 只检查项目配置；真正的 JavaScript 打包由 wrangler deploy 执行。

## 2. Cloudflare 的 GitHub 部署页面

- Repository：PARPMR/CloudflareWorkers
- Project name：xingleng-persona-memory
- Build command：npm run build
- Deploy command：npx wrangler deploy
- Preview builds：第一阶段关闭
- Root directory：/（仓库根目录）

wrangler.jsonc 已包含实际账号和 R2 桶绑定。初次部署故意只提供设置状态：PUBLIC_BASE_URL 和 OAuth KV 未配置之前，/mcp 及其他私有数据接口返回 503，不读取或保存人格数据。/health 可用于检查服务和 R2 绑定。此时部署成功不等于登录或人格库连接完成。

## 3. 创建 OAuth KV

在 Cloudflare「存储和数据库」找到 Workers KV，创建一个命名空间，例如 xingleng-persona-oauth。记录它的 Namespace ID。

这个 KV 只保存 OAuth 客户端、授权状态和令牌记录；长期人格数据继续使用 R2，不存入 KV。不要用 R2 桶名或 Account ID 代替 KV Namespace ID。

得到初次部署的真实 Worker 地址和 KV ID 后，在本地仓库执行：

    npm run configure -- --base-url https://你的真实Worker地址 --oauth-kv-id 你的真实KV命名空间ID

该命令会将真实地址和 KV 绑定写入 wrangler.jsonc。它不写入任何密钥。提交并推送这个配置变更。

## 4. 创建用于登录的 GitHub OAuth App

打开 GitHub Settings → Developer settings → OAuth Apps → New OAuth App。

- Application name：星棱人格库
- Homepage URL：你的真实 Worker 地址
- Authorization callback URL：你的真实 Worker 地址后加 /callback

不要在地址中保留示例文字。GitHub OAuth App 与此前用于仓库访问的第三方集成是两回事。

在 Cloudflare Worker 的「Settings → Variables and Secrets」中设置：

- GITHUB_CLIENT_ID：OAuth App 的 Client ID
- GITHUB_CLIENT_SECRET：OAuth App 的 Client Secret，类型选择 Secret

不需要手动创建 COOKIE_ENCRYPTION_KEY；当前官方 OAuth 库的浏览器绑定助手负责授权状态。不要把 Client Secret 放入仓库或聊天，也不要提交 .dev.vars 或 .env 文件。

更新配置并完成秘密值设置后，检查 /health 返回 oauth_configured=true。若为 false，检查 PUBLIC_BASE_URL、OAUTH_KV、BUCKET 及上述两项配置是否齐全。

## 5. 连接与迁移

服务 MCP 地址是你的真实 Worker 地址后加 /mcp。

使用支持远程 MCP OAuth 的客户端连接该地址，完成每客户端的授权确认和 GitHub 登录。服务仅允许配置中的数字用户 ID。客户端若只获 mcp:read，只能读；保存或初始化需要 mcp:write，并且仍要求当前聊天逐项明确确认。

连接真实可用后：
1. 调用 xingleng_persona_read 核实身份与修订。
2. 当前迭代已授权迁移旧修订，调用 initialize 将基线修订 1、2 写入空库；已有数据不会覆盖。
3. 人格改变使用 preview → 明确同意 → commit → read。
4. 下一聊天通过同一 GitHub 身份读取同一 R2 人格文档。插件版本不会随人格修订改变。

当前并未修改已安装人格插件的连接配置，也没有虚构服务地址。请在 Worker 实际部署后提供真实地址，再处理原插件与此服务的连接；本包本身不表示 ChatGPT 和 Codex 已连接成功。

## 核心文件

- src/index.js：Cloudflare 入口、OAuth Provider 和配置未完成时的拒绝访问
- src/auth.js：每客户端授权、GitHub 登录、允许账号核验
- src/api.js：只接受已验证 OAuth 上下文的 MCP 接口，执行读/写权限检查
- src/store.js：人格数据校验、独立修订、ETag 条件写入、幂等与回滚
- test/：15 项本地测试
- scripts/configure.mjs：填写真实 Worker URL 和 OAuth KV ID
- wrangler.jsonc：Cloudflare 部署与绑定配置

## 版本与边界

固定核心插件版本、云端 Persona Revision、Session State 分开。长期规则保存及回滚只更新 R2 中的人格修订，不调用 Plugin Creator。临时要求和未确认候选不自动保存。服务端验证确认字段与精确预览摘要，但无法独立阅读聊天；调用助手仍需核实用户确实同意。

每个用户以已验证 GitHub 数字 ID 隔离。原始请求头中的 oai-authenticated-user-id 不构成身份凭据。本服务不信任客户端自报的身份，也不将 GitHub 登录 access token 存入人格数据。

## 技术依据

采用 Cloudflare 官方 @cloudflare/workers-oauth-provider 1.2.4，使用该库的 consent/upstream 浏览器绑定助手，包含 PKCE。服务目前仍需真实依赖、登录及客户端连接验收。

- https://github.com/cloudflare/workers-oauth-provider
- https://github.com/cloudflare/workers-oauth-provider/blob/main/docs/upstream-sign-in.md
- https://github.com/cloudflare/workers-oauth-provider/blob/main/docs/consent-page.md
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#conditional-operations
