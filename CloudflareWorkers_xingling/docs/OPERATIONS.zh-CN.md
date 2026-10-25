# XingLing 操作与验收手册

记录日期：2026-10-24（Asia/Tokyo）  
适用方案：自有 Cloudflare Workers + R2 + Workers KV，通过 GitHub OAuth 登录。  
本手册记录当前实际状态，未取得工具返回的项目保留为“待验收”。

## 1. 当前结论与版本

GitHub 关联和插件安装已由用户提供的页面确认。最新读取截图显示 engine_version=1.2.0、persona_revision=2、initialized=false、source=unpersisted_migration_baseline，说明已有一次读取成功，但当前文档仍是未持久化迁移基线。当前聊天没有暴露人格库工具；初始化应在刚才实际读取成功的对话中继续。后续截图报告 history 也读取成功；初始化触发重授权，但客户端提示缺少浏览器设置 URL。尚未完成初始化后读回、保存、回滚或两端共用验收。

| 对象 | 当前记录 | 含义 |
| --- | --- | --- |
| 新云端插件 XingLing | 1.0.0 | 当前云端连接插件包版本 |
| 旧插件“星棱 · GPT 龙娘” | 1.2.1 | 已包含人格核心、预设和演进协议 |
| Worker 服务 | 本地源码 1.2.3，待部署 | 包含 Cookie/CSP 修复和写权限元数据、重授权提示修复 |
| 存储引擎 | 1.2.0 | 长期人格文档结构和修订规则 |
| Persona Revision | 已读取 2，来源为未初始化迁移基线 | 随确认的有效长期设定保存独立递增 |
| Session State | 每个聊天独立 | 开关、临时强度、临时要求和候选，不自动持久化 |

这些版本属于不同对象，无需为了对齐编号而重新发布插件。迁移基线内含修订 1、2；只有 initialized=true 且 source=cloud_store 才表明确实读取到了已持久化文档。即使 read 返回 persona_revision=2，也必须同时检查这两个字段。

### 已有证据

| 检查 | 当前状态 | 证据与限制 |
| --- | --- | --- |
| 两端发现云端插件 | 用户已确认 | 不等于两端都调用过人格库工具 |
| GitHub 关联 | 用户已确认 | 不等于保存权限和 R2 写入已验证 |
| XingLing App 权限查询 | 已读取 | 真实 App ID 查询返回 found；跟随账号默认权限 |
| 新插件包含人格核心 | 尚未包含 | 当前包只有 .app.json 和兼容清单，没有 skills 目录 |
| 本地功能与安全测试 | 前序执行通过 | 24 项 Node 测试；KV、R2、GitHub 使用测试替身 |
| 浏览器 CSP 回归 | 前序执行通过 | 隔离 Edge 验证 Cookie 回传以及同意、拒绝跳转；不登录真实 GitHub |
| Wrangler 打包 | 前序执行通过 | 1.2.2 离线打包通过；本地源提交 e316c6c |
| 在线 /health | 本轮未取得 | 本执行环境请求超时，不能据此判断用户浏览器也不可达 |
| 人格库 read | 用户截图确认成功 | 修订 2、initialized=false、未持久化迁移基线 |
| history | 用户后续截图报告读取成功 | 显示未初始化及修订 1、2 的完整迁移记录；未收到原始返回 |
| 初始化、写入、回滚、跨端复用 | 待验收 | 未执行生产人格数据变更 |

## 2. 当前应开启哪些组件

| 组件 | 当前安排 |
| --- | --- |
| 新云端插件 XingLing | 保持开启，承载云端连接 |
| 旧插件“星棱 · GPT 龙娘” | 桌面端暂保留，提供固定人格核心与确认式演进协议 |
| 旧个人 Skill“对话人格 · GPT 龙娘” | 可关闭，避免重复加载旧规则 |

旧插件若在网页端仍标为 Desktop only，不能将它视为网页版已具备人格核心。新云端插件目前承载存储工具；要达到“一个插件同时负责人格与记忆”的目标，还需要把旧插件的人格 Skill、core.json、预设及必要参考文件迁入新插件。

迁移应保留新插件的 App 绑定、身份、名称与分享范围，不再次创建 Worker，不重置 R2，也不通过 Plugin Creator 更新后续长期规则。迁移完成并验收后，再关闭旧插件和旧个人 Skill。当前手册没有执行这次核心迁移或修改插件开关。

## 3. 先完成客户端只读验收

### 3.1 检查服务

打开：

https://xingleng-persona-memory.3350532354.workers.dev/health

应检查：

- service = xingleng-persona-memory
- service_version = 1.2.3（本次修复部署后；以实际部署版本为准）
- engine_version = 1.2.0
- storage_bound = true
- oauth_configured = true

这是配置完整性检查。真正的存储读写仍需调用已认证工具验证。

### 3.2 检查插件实际工具列表

已根据用户提供的实际页面定位：在 XingLing 管理页底部的 Manage app 区域，点击 Refresh tools 行右侧的同名按钮（位于 Delete app 上方）。若有确认或登录提示，按页面完成；随后新建对话，选择 XingLing 并执行只读检查。不要将 Uninstall 或 Delete app 当作刷新操作。

该截图同时显示 Uninstall 按钮、已连接的 Primary OAuth 账户和正确 MCP 地址，可确认插件已安装且存在已连接账户；仍不能替代实际人格库 read 成功。

打开已关联的 XingLing 详情页。若当前界面提供工具列表，可查看发现的工具；如果没有列表入口，直接跳过，不据此判定连接失败。优先查找该连接支持的 Refresh / 刷新操作，更新元数据后在新对话选择 XingLing，执行下一节的实际只读调用。如果连刷新操作也找不到，提供当前插件详情页截图以核对界面，不反复重建插件或 Worker。

预期有以下六个工具（宿主可能为名称增加前缀）：

| 工具 | 用途 | 所需服务权限 |
| --- | --- | --- |
| xingleng_persona_read | 当前长期快照和修订 | mcp:read |
| xingleng_persona_history | 修订摘要与分页 | mcp:read |
| xingleng_persona_export | 导出完整文档和历史 | mcp:read |
| xingleng_persona_preview | 预览精确保存或回滚，不写入 | mcp:read |
| xingleng_persona_initialize | 将迁移基线写入空库 | mcp:read + mcp:write |
| xingleng_persona_commit | 保存已确认变更或回滚 | mcp:read + mcp:write |

仅看到插件名称、登记版本或权限设置，不能记为工具调用成功。若六个工具未出现，先解决连接或工具发现；此时不要要求助手编造修订号。

### 3.3 首次读取

选择 XingLing 后发送：

> 只读检查人格库：实际调用 read，并读取最近 3 条历史。报告 Persona Revision、initialized、source 和实际调用的工具名；不要初始化、保存或回滚。若工具不可用，请明确说明。

通过标准：收到真实 read 与 history 返回；记录 Persona Revision 和初始化状态，并核对 history 的当前修订一致。若 initialized=false，说明展示的是随服务提供的未持久化迁移基线，应转入初始化步骤。

### 3.4 正确理解 not_installed

本轮交叉查询结果：

| 查询对象 | 标识 | 返回 |
| --- | --- | --- |
| 真实 App | asdk_app_6adc176d8d688191895c19f5aa9d437f | found |
| 对应插件 | plugin_asdk_app_6adc176d8d688191895c19f5aa9d437f | not_installed |

两次结果针对不同查询对象，不能只凭第二项断言 App 不存在或 GitHub 关联失败。权限排查应核对 .app.json 中的真实 App ID；最终仍以详情页工具列表和一次实际 read 为准。found 也不能替代真实读写验收。

## 4. 验证写权限与初始化

### 当前写权限故障及 1.2.3 修复

用户在初始化时收到 Reconnect，点击后提示 This app does not provide a browser setup URL right now。真实 Provider 本地测试复现了读取有效而初始化缺少 mcp:write 的权限分支；不能据此断言浏览器设置 URL 的平台界面问题已完全解决。

本地 1.2.3 已补上各工具 OAuth 权限声明和工具级授权挑战，并为只读请求提供可由用户主动勾选的 mcp:write。27 项 Node 测试、3 种隔离 Edge 表单场景和 Wrangler 打包通过。生产初始化仍未完成。

部署与恢复顺序：

1. 提交并 push 本次 1.2.3 源码，确认在线健康检查的 service_version。
2. 在原 XingLing 管理页点击 Manage app → Refresh tools。
3. 发起新授权，在服务授权页明确勾选 mcp:write，再完成 GitHub 登录。
4. 如果对话中的 Reconnect 仍提示没有 browser setup URL，可在同一个 XingLing 管理页使用 Connect another account，使用原 GitHub 身份重新授权；回聊天时使用刚完成的连接。这是恢复路径，线上效果仍待验证。
5. 先实际 read，检查 authorization.can_write=true；granted_scopes 应含 mcp:read 和 mcp:write。旧版本返回没有 authorization 字段时，先核对部署与工具刷新。
6. 在已有迁移授权下执行 initialize，再用 read / history 核对 initialized=true、source=cloud_store、修订仍为 2。

不要通过更改 ChatGPT 的全局动作审批来代替 OAuth 写权限，也不要手工拼接缺少状态与 PKCE 的 /authorize 链接。


权限分三层：客户端是否向当前聊天提供工具、OAuth 是否授予 mcp:write、用户是否明确同意本次精确变更。三层都满足后，才能保存。

- 授权页若只有 mcp:read，读取可以正常，但 initialize / commit 仍可能被拒绝。
- 需要通过该连接支持的 OAuth 配置、权限升级或重新授权取得 mcp:write，再实际验证。
- ChatGPT 的动作审批设置与 OAuth scopes 是两回事；不要用“允许全部动作”代替补齐写权限。

若 read 已返回 initialized=true，跳过初始化，保留现有文档。

若 initialized=false，且用户明确授权迁移已有设定，可发送：

> 将现有迁移基线写入我的空人格库。若已有云端数据，不覆盖；完成后实际 read 和 history 核验。

通过标准：initialized=true，source=cloud_store；空库基线为 Persona Revision 2，保留修订 1、2，初始化不会额外生成修订 3。不要把读取离线基线当作已经保存。

## 5. 保存、跨端读取与回滚验收

这组验收会在云端历史中留下记录，必须先展示精确临时规则和回滚计划并取得同意。回滚恢复当前快照，但不抹除验收历史。本轮尚未执行这组生产写入。

### 5.1 记录测试前状态

实际 read 获取当前修订 N，核实 initialized=true。必要时 export 一份备份，保存在私人位置，不推入公开仓库。测试期间若出现其他修订，暂停并重新比较，避免回滚覆盖其他已保存更新。

### 5.2 只预览临时规则

可使用以下候选；先核实规则 ID 不与已有项冲突：

- 目标人格：gpt-dragon
- 规则 ID：acceptance-cloud-check（已存在时换一个新的 ID）
- 精确内容：只有用户明确要求“进行云端验收”时，才在该次验收回复末尾写“云端验收通过”；普通对话不触发。
- 来源：用户同意进行临时云端保存与回滚验收。

发送：

> 先预览这条临时验收规则，展示实际差异和测试前修订 N；现在不要保存。保存后将跨端读回，再确认回滚至 N。

通过标准：preview 返回前后差异和摘要；再次 read 的修订仍为 N，未执行 commit。

### 5.3 确认保存

核对精确差异后，明确说：

> 确认保存刚才预览的这条临时验收规则，允许留下验收历史。完成后实际读回核验。

通过标准：一次有效保存产生 N+1，read 查到该规则；插件版本不因这条规则提高。助手应沿用同一次提交的 request_id 处理不确定重试，不能因网络超时重复新增修订。

### 5.4 跨端读取

在另一端新建聊天，使用同一 GitHub 身份连接同一个 Worker，选择 XingLing，执行只读读取。

通过标准：另一端读取到 N+1 和相同规则；不是复述前一聊天的文字，也不是读取随包基线。网页到桌面、桌面到网页都应检查。已有聊天可显式刷新人格，不保证自动热同步。

### 5.5 确认回滚

先预览回滚到实际记录的 N，核对将撤回的规则。明确确认后提交并读回。

通过标准：当前快照恢复至测试前状态，验收规则不再生效；新修订为 N+2（无并发和额外变更时），历史仍保留保存与回滚事件。回滚不会降低修订号，也不回滚 Plugin Version。

## 6. 人格日常使用验收

这些行为依赖人格核心 Skill。当前新云端插件尚未包含核心，所以网页版不能仅凭已关联存储就记为人格行为通过。

| 消息 | 期望行为 |
| --- | --- |
| 开启星棱 | 读取真实长期库后开启 GPT 龙娘；读取失败时说明未同步 |
| 查看人格状态 | 分别报告插件、服务/引擎、人格修订和当前聊天开关 |
| 这次简短些，不要写动作 | 仅调整当前聊天，不提高 Persona Revision |
| 暂停发现人格候选 | 暂停当前聊天的主动候选；不擅自修改云端默认值 |
| 将精确规则 X 保存到人格 Y | 预览、核对已有明确同意、提交并读回 |
| 关闭人格 | 停止角色表达与主动发现，不删除长期库 |
| 刷新人格 | 读取最新云端快照，保留当前聊天明确的临时要求 |

验收时应检查：未确认候选不会保存；关闭后不会继续角色表演；新聊天按核心约定默认关闭，显式启用时加载长期库；正式代码、JSON 和文档按用户要求输出。

不存在后台监听所有聊天、跨聊天自动写入或已打开聊天必然实时同步的承诺。持久化发生在真实工具调用并成功读回之后。

## 7. 维护与故障处理

### 服务位置

- 仓库：https://github.com/PARPMR/CloudflareWorkers
- 本地仓库：D:\AppFiles\Cloudflare\CloudflareWorkers
- Worker 源码子目录：CloudflareWorkers_xingling
- Cloudflare 构建根目录：/CloudflareWorkers_xingling
- Build command：npm run build
- Deploy command：npx wrangler deploy
- MCP：https://xingleng-persona-memory.3350532354.workers.dev/mcp
- GitHub OAuth 回调：https://xingleng-persona-memory.3350532354.workers.dev/callback
- R2 绑定：BUCKET → xingleng-persona-memory
- KV 绑定：OAUTH_KV → ec3f335d1b3a4bc0b40c1f07c89a7fa0

在源码子目录运行 npm ci、npm test、npm run build。需要浏览器回归时运行 npm run test:browser，默认用本机 Edge；Wrangler deploy --dry-run 可做打包检查。用户通过自己的 Git 登录提交并 push，Cloudflare 自动部署后检查 /health；服务工具元数据变化时再刷新连接。

GitHub Client Secret 只放在 Worker 的运行时 Secret 中；不写入插件、公开仓库、操作文档或聊天。已暴露的旧密钥应撤销并换新，本轮没有读取或确认密钥轮换状态。OAuth KV 保存授权记录，R2 保存人格历史，二者不能互相替代。维护升级不删除已有 R2 对象。

### 常见现象

| 现象 | 处理 |
| --- | --- |
| 插件可见但工具不可用 | 查看真实工具发现结果、刷新连接并在新聊天选择；记录实际错误，勿用登记版本替代工具结果 |
| /health 的 oauth_configured=false | 核对 PUBLIC_BASE_URL、BUCKET、OAUTH_KV、GITHUB_CLIENT_ID、GITHUB_CLIENT_SECRET |
| AUTH_BROWSER_COOKIE_MISSING / consent_approve | 本次授权 Cookie 未匹配；检查新授权页 GET 是否保存 Set-Cookie、POST 是否发送匹配 Cookie |
| Console 报 form-action CSP 拦截 | 确认部署包含 1.2.2 修复并重新打开授权页；不要关闭整个 CSP |
| AUTH_TRANSACTION_EXPIRED | 从插件重新发起授权；若新流程立即失败，检查阶段和 KV 状态 |
| initialize / commit 返回权限不足 | 检查实际 OAuth 授权是否含 mcp:write；保留用户对精确变更的确认 |
| initialized=false | 未持久化的迁移基线；确认迁移后才初始化 |
| REVISION_CONFLICT | 重读、重新预览；不能强行覆盖后续修订 |
| 写入超时或结果不确定 | 先 read / history 核实，以同一 request_id 恢复，不能直接换 ID 重写 |
| VERIFICATION_PENDING | 写后读回尚未确认；查历史核对，不宣称已保存，也不盲目重复写 |
| STORE_LIMIT | 导出并规划扩容；不静默删除历史 |

排障只分享错误编号、阶段及不含凭据的状态。不要发送完整授权 URL、Cookie 值、令牌或包含它们的 HAR。

## 8. 最终验收记录

| 编号 | 通过标准 | 当前记录 |
| --- | --- | --- |
| V01 | 在线健康状态与实际部署版本正确 | 待取得 |
| V02 | 六个工具在聊天中真实可调用 | 已有 read 结果；其余工具待确认 |
| V03 | read / history 返回实际修订与初始化状态 | 用户截图报告 read/history 成功，修订 2、initialized=false；持久化待验证 |
| V04 | 空库初始化保留基线修订 1、2，已有库不覆盖 | 本地通过；云端待验证 |
| V05 | 预览零写入，确认保存后修订加一 | 本地通过；云端待验证 |
| V06 | 两端新聊天读到相同快照 | 待验证 |
| V07 | 回滚追加新修订并恢复测试前快照 | 本地通过；云端待验证 |
| V08 | 临时适应与未确认候选不写库 | 服务边界本地通过；人格行为待验证 |
| V09 | 只读授权不能初始化/保存，错误身份被拒绝 | 本地通过；真实客户端待验证 |
| V10 | 不确定重试不重复新增，冲突不覆盖后续修订 | 本地通过；云端未做破坏性并发测试 |
| V11 | 私人导出可读，字段与快照一致 | 本地实现已检查；实际导出待验证 |
| V12 | 新云端插件含人格核心，可停用旧组件 | 尚未迁入核心 |

只有完成相应真实验收，才把对应行改为通过。当前不能将“关联成功”写成“全功能上线验收通过”。

## 参考

- OpenAI：连接、工具发现与刷新流程：https://developers.openai.com/plugins/deploy/connect-chatgpt
- OpenAI：插件由 Skill、MCP 等组件组成：https://learn.chatgpt.com/docs/plugins
- Cloudflare：Workers Builds 配置：https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- Cloudflare OAuth Provider：https://github.com/cloudflare/workers-oauth-provider
- MDN：form-action 及表单后重定向的浏览器差异：https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/form-action

其余规则以本项目 src/store.js、src/api.js、src/auth.js 和人格核心 Skill 的实际实现为依据。