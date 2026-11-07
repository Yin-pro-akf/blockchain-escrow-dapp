# 区块链托管交易大作业

3 班第 5 组（组长彭雯青，组员刘思桐、林俊希）。基础实验采用路线 B，由用户通过钱包签名完成托管交易。路线 A 使用独立合约，由 Web3j 后端账户签署仲裁交易。


| 分支                                                                                                        | 实验内容                               | 验收入口                                                   |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| [main](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/main)                                     | 路线 B、重入攻击挑战、独立双仲裁人合约 | `/escrow`，重入和多签合约位于 `packages/hardhat/contracts` |
| [Route-A-escrow](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/Route-A-escrow)                 | Spring Boot 与 Web3j 后端              | `http://localhost:8080/api/escrow`                         |
| [Order-Timeline](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/Order-Timeline)                 | 订单事件时间线                         | `/escrow` 的订单时间线面板                                 |
| [Seller-Shipment-Status](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/Seller-Shipment-Status) | 卖家标记发货及超期退款限制             | `/escrow`                                                  |
| [multi-signature-arbitration](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/multi-signature-arbitration) | 双仲裁人多签托管合约 | `packages/hardhat/contracts/MultiSigEscrow.sol`，Remix 或任意客户端调用 |

## 路线 B 启动与验收

使用 Node.js 20.18.3 或以上版本、项目指定的 Yarn 3.2.3 和 MetaMask。

~~~bash
git switch main
corepack enable
yarn install --immutable
yarn start
~~~

打开 [订单页](http://localhost:3000/escrow)。在 MetaMask 中选择 POTOS Testnet，Chain ID 为 `60600`，RPC 为 `https://rpc-testnet.potos.hk`，Gas 代币为 POT。页面从 `packages/nextjs/contracts/deployedContracts.ts` 读取已有部署信息。

买家创建订单并确认授权和付款。正常订单由买家确认收货。争议订单由买家或卖家发起争议，再切换仲裁账户裁决。

本地合约测试可在仓库根目录运行。

~~~bash
yarn workspace @se-2/hardhat exec hardhat test test/Escrow.ts --network hardhat
~~~

重新部署 POTOS 合约时，先运行 `yarn account:import` 配置加密账户，再运行 `yarn workspace @se-2/hardhat deployWithPK --network potos_testnet`。部署任务会重新生成前端合约配置。


| 环境配置                                                               | 用途                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `DEPLOYER_PRIVATE_KEY_ENCRYPTED`                                       | 本地 Hardhat 加密账户，由导入命令写入受 Git 忽略的环境文件 |
| `__RUNTIME_DEPLOYER_PRIVATE_KEY`                                       | 部署子进程的临时签名配置，由加密账户部署命令注入           |
| `ALCHEMY_API_KEY`、`ETHERSCAN_V2_API_KEY`                              | Hardhat 的可选 RPC 与验证服务配置                          |
| `NEXT_PUBLIC_ALCHEMY_API_KEY`、`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | 前端的可选服务配置                                         |
| `WEB3J_PRIVATE_KEY`                                                    | 路线 A 服务器进程的签名配置                                |

### 环境文件与变量填写

`.env.example` 只是模板，实际值放在下列被 Git 忽略的本地文件中，需要先复制一份再填写：

~~~bash
cp packages/hardhat/.env.example packages/hardhat/.env
cp packages/nextjs/.env.example packages/nextjs/.env.local
~~~

- `packages/hardhat/.env`：`ALCHEMY_API_KEY` 和 `ETHERSCAN_V2_API_KEY` 可留空，留空时 `hardhat.config.ts` 使用内置默认 key；`DEPLOYER_PRIVATE_KEY_ENCRYPTED` 不要手工编辑，运行 `yarn account:import` 后按提示输入私钥和加密口令，脚本会把加密 JSON 写入该文件，部署时再输入同一口令解密；`__RUNTIME_DEPLOYER_PRIVATE_KEY` 由 `deployWithPK` 解密后注入子进程，不需要写进文件。
- `packages/nextjs/.env.local`：`NEXT_PUBLIC_ALCHEMY_API_KEY` 和 `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` 可留空，留空时 `scaffold.config.ts` 使用内置默认值。
- `WEB3J_PRIVATE_KEY`：路线 A 的进程环境变量，取值方式见下节，不写入 `application.properties`。

## 路线 A 启动与验收

切换到 `Route-A-escrow`，使用 Java 21 或以上版本。后端账户私钥通过进程环境变量 `WEB3J_PRIVATE_KEY` 传入，`src/main/resources/application.properties` 用 `${WEB3J_PRIVATE_KEY}` 引用它，该文件其余配置如下：

~~~properties
server.port=8080
web3j.client-address=https://rpc-testnet.potos.hk
web3j.private-key=${WEB3J_PRIVATE_KEY}
web3j.gas-price=20000000000
web3j.gas-limit=6721975
~~~

`web3j.gas-price` 固定为 20 Gwei，若节点 `eth_gasPrice` 不同需按实际值调整。使用本组已部署的路线 A 合约启动，私钥在启动命令前导出即可，不要写进仓库文件；在 IDEA 里运行时，把同名变量填到 Run Configuration 的环境变量中同样生效：

~~~bash
export WEB3J_PRIVATE_KEY=0x待填入的仲裁账户私钥
./gradlew bootRun --args='--escrow.contract-address=0x199376ede564C93C560Cf34946f58CE7AFEd359A --escrow.deploy-block=2788466'
~~~

--escrow.contract-address 与 --escrow.deploy-block 需要同时传入，缺省会以 Could not resolve placeholder 'escrow.contract-address' 启动失败。

首次运行会下载 Gradle 8.13 与 Spring 依赖，需要能访问 `services.gradle.org` 和 Maven 仓库；网络受限时这一步会长时间停在下载。

六个必做接口的前缀均为 `/api/escrow`。


| 方法 | 路径                                    | 用途                           |
| ---- | --------------------------------------- | ------------------------------ |
| POST | `/deploy`                               | 部署新合约                     |
| POST | `/load?address=…&fromBlock=…`         | 加载已有合约，指定日志起始区块 |
| GET  | `/address`                              | 查询合约和仲裁人               |
| GET  | `/orders`                               | 从 OrderCreated 事件发现订单   |
| GET  | `/orders/{id}`                          | 查询当前订单详情               |
| POST | `/orders/{id}/resolve?sellerWins=false` | 由后端签署仲裁交易             |

复现实验数据时，加载下表的路线 A Escrow，`fromBlock` 填 `2788466`。写操作需要由该合约对应的仲裁人账户执行。

## POTOS 合约地址


| 实验     | 托管合约                                     | 代币合约                                     |
| -------- | -------------------------------------------- | -------------------------------------------- |
| 路线 B   | `0xDc0f0Ad6580cf7EF2227f48ABFc65e8700F2Ad73` | `0x49d67FD9A5F2C4F0A186f77dF4Daa2C5DAFc33E4` |
| 路线 A   | `0x199376ede564C93C560Cf34946f58CE7AFEd359A` | `0x70841c7b06bA23F7718ba3B4B01b3313fc133CA4` |
| 卖家发货 | `0x9A208b6bc80EFb2Ce91c0eC1DDE104aD1f3A5035` | `0x738532cd4EBD69dfc2Fd78CEFFC50fEe71992AbC` |
| 多签仲裁 | `0x26eF2469F4395151d06129445C89D75ebB234F73` | `0x1345AdcD30B95318E0EdAf2814751481E7Ed9eFa` |

四块加分项的实现位置、复现步骤与链上交易见下文四节：重入攻击挑战、订单时间线、卖家发货状态、多签仲裁。

## 实验账户与角色


| 实验     | 角色                     | 地址                                         |
| -------- | ------------------------ | -------------------------------------------- |
| 路线 B   | 部署与买家（组长彭雯青） | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 路线 B   | 卖家、争议发起（刘思桐） | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 路线 B   | 仲裁人（林俊希）         | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 路线 A   | 后端仲裁账户             | `0xEeF093d43d1143Db42999a25D192f4d5F1fb14A5` |
| 路线 A   | 买家（组员独立环境）     | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 路线 A   | 卖家（组员独立环境）     | `0xA35e482AE71aCCb943B20507A65014bD1f86a5e5` |
| 多签仲裁 | 买家                     | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 多签仲裁 | 卖家                     | `0x3120381f4F629FD77d598271976B8EdC3F52996A` |
| 多签仲裁 | 仲裁人 1                 | `0x7Ee066564A11b879Bc6C8AAEeD372D7a401354E5` |
| 多签仲裁 | 仲裁人 2                 | `0x740B5E7B77C9eAa8b8CE8A75Dc0a0aa6855b645e` |
| 卖家发货 | 仲裁人                   | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 卖家发货 | 买家                     | `0x3120381f4F629FD77d598271976B8EdC3F52996A` |
| 卖家发货 | 卖家                     | `0x7Ee066564A11b879Bc6C8AAEeD372D7a401354E5` |

多签与卖家发货实验复用上述三个 MetaMask 账户，按实验需要切换角色。仲裁人是合约部署时写入构造函数的地址，链上由 `onlyArbiter` 校验调用者身份。

## 重入攻击挑战（main 分支）

`packages/hardhat/contracts` 下是三个配套合约：`VulnerableVault.sol` 在 `withdraw()` 里先 `call` 转账、后把 `balances[msg.sender]` 清零；`Attacker.sol` 的 `attack()` 先存入再调用 `withdraw()`，其 `receive()` 在金库仍有余额时再次调用 `withdraw()`；`FixedVault.sol` 把清零提到转账之前。


| 合约                              | 地址                                         |
| --------------------------------- | -------------------------------------------- |
| VulnerableVault（第一轮受害金库） | `0xec4D81E683dAc60c9f995E115ED94f872760F90A` |
| Attacker（第一轮攻击合约）        | `0xa910364DF22e46e4Eb320cA8674b6E6a610f09A2` |
| FixedVault（修复后金库）          | `0x1970611d92817e92256166FF52f934653cBAde77` |
| Attacker（第二轮攻击合约）        | `0x9fb36Df26e2A01dBc00512c363Ce628CF5A4DEBb` |

用 Remix 或任意钱包客户端连接 POTOS Testnet（Chain ID `60600`），部署攻击合约时构造函数传入被攻击金库地址，按下列顺序操作，金额单位为 POT。


| 步骤                 | 调用                | 参数或金额           | 区块    | 交易                                                                                                                                                                      | 发起账户                                     |
| -------------------- | ------------------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 部署 VulnerableVault | 构造函数            | 无                   | 2692319 | [0x051ae0759703738ee6fd1d6f0f1c4d0e7a721f08257d9e3b861c1ab1a4790b89](https://scan-testnet.potos.hk/tx/0x051ae0759703738ee6fd1d6f0f1c4d0e7a721f08257d9e3b861c1ab1a4790b89) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 部署第一轮攻击合约   | 构造函数            | 传入金库地址         | 2692377 | [0xb23f04b24bf6be47cebff2560257c55244366b4ffd46c1378f6c7abaffe964da](https://scan-testnet.potos.hk/tx/0xb23f04b24bf6be47cebff2560257c55244366b4ffd46c1378f6c7abaffe964da) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 受害者存入           | `deposit()`         | 0.002                | 2692539 | [0xee64e5be2e00cf54914d764ae0516903a1c0ff25806ef433aa9891798557e0ad](https://scan-testnet.potos.hk/tx/0xee64e5be2e00cf54914d764ae0516903a1c0ff25806ef433aa9891798557e0ad) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 第一次攻击           | `attack()`          | 0.001                | 2692605 | [0xcaced1cd6efabe0e0d9f93b9f008c4892e94c9e9dfee771a700b066f159de6fd](https://scan-testnet.potos.hk/tx/0xcaced1cd6efabe0e0d9f93b9f008c4892e94c9e9dfee771a700b066f159de6fd) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 第二次攻击           | `attack()`          | 0.001                | 2692807 | [0x195246a470cd2b7e469faa9dcbd7ae642b847f8a0e38098a220b140ac932ac72](https://scan-testnet.potos.hk/tx/0x195246a470cd2b7e469faa9dcbd7ae642b847f8a0e38098a220b140ac932ac72) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 提取攻击所得         | `withdrawProfits()` | 无                   | 2703672 | [0xce1fc3b91d7313c73407a9d947c9bec2022e3049c238eeb1039a1a3751b29926](https://scan-testnet.potos.hk/tx/0xce1fc3b91d7313c73407a9d947c9bec2022e3049c238eeb1039a1a3751b29926) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 再次提取             | `withdrawProfits()` | 无                   | 2703674 | [0x68d4b4bc3243c0b54d926c4e950affc39eefe323d42ab1fd133a4d68cc300ccc](https://scan-testnet.potos.hk/tx/0x68d4b4bc3243c0b54d926c4e950affc39eefe323d42ab1fd133a4d68cc300ccc) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 部署 FixedVault      | 构造函数            | 无                   | 2701609 | [0x63c644bf1ebbcc3c5bf55c58e277bd5ab7044e1f03c91d116689a645f09eab01](https://scan-testnet.potos.hk/tx/0x63c644bf1ebbcc3c5bf55c58e277bd5ab7044e1f03c91d116689a645f09eab01) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 受害者存入           | `deposit()`         | 0.001                | 2701620 | [0xa875a188579e9a0ec16d93daee2537c0ea466b6cdb1cd5743e9e8f2e9eeb2c6e](https://scan-testnet.potos.hk/tx/0xa875a188579e9a0ec16d93daee2537c0ea466b6cdb1cd5743e9e8f2e9eeb2c6e) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 受害者补存           | `deposit()`         | 0.001                | 2703702 | [0xf407da747bbaed95bb5b3785674b5e21bf2603a4be0117c59c48d1fa04ec2612](https://scan-testnet.potos.hk/tx/0xf407da747bbaed95bb5b3785674b5e21bf2603a4be0117c59c48d1fa04ec2612) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 部署第二轮攻击合约   | 构造函数            | 传入 FixedVault 地址 | 2703743 | [0x76a3e59ae97e6fc9a782de7c567b4975417678cf2670156f737b1a99b79c96f8](https://scan-testnet.potos.hk/tx/0x76a3e59ae97e6fc9a782de7c567b4975417678cf2670156f737b1a99b79c96f8) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 第二轮攻击           | `attack()`          | 0.001                | 2703773 | [0xd533b6701024389ef4f8efcac6d9a4bba657db6dc8a27196d4c0cb848f3b8b74](https://scan-testnet.potos.hk/tx/0xd533b6701024389ef4f8efcac6d9a4bba657db6dc8a27196d4c0cb848f3b8b74)（执行失败） | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |

2692605 与 2692807 两笔 `attack()` 均返回成功；第二轮 `attack()` 返回失败，因为 FixedVault 在转账前已把 `balances[msg.sender]` 清零，`receive()` 里的再次 `withdraw()` 在 `require(amount > 0)` 处回滚，金库 0.002 POT 保持完好。`eth_call` 复核当前链上状态：`VulnerableVault.vaultBalance()` 为 `0`，`FixedVault.vaultBalance()` 为 `0.002 POT`。另有 2692470、2692473、2692536 三笔 0 值 `deposit()` 属存入前的试探调用，不影响结论。

## 订单时间线（Order-Timeline 分支）

该分支在 `/escrow` 订单列表上方增加事件时间线。`_components/useReceiptTimeline.ts` 连接 MetaMask 后逐块扫描 `to` 为 Escrow 地址的交易，逐笔调用 `eth_getTransactionReceipt` 读取日志，按 6 个事件 topic（OrderCreated、OrderPaid、OrderCompleted、OrderRefunded、OrderDisputed、OrderResolved）解析订单 ID、区块号、交易哈希和 `logIndex`，再按区块升序、同区块按日志序号排序；`_components/ReceiptTimelinePanel.tsx` 负责折叠面板与交易链接。页面可“展开事件时间线”，也可在面板中直接导入历史交易哈希。

复现步骤：`git switch Order-Timeline` 后执行 `yarn install --immutable` 与 `yarn start`，MetaMask 切到 Chain ID `60600`，打开 `/escrow`；正常下单、付款、确认收货，或在时间线面板依次导入下表三笔哈希。

样本为订单 #16，金额 30 个 `LST202430550975`（代币 `0x70b99b4Eb86264F28920A31f4F9c25f2A0781C17`，精度 18），买家 `0x3962e2f0f8c3a6180C209D8442028BB4fb023815`，卖家 `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426`，描述为 `11111111111111111111111111111`。


| 事件           | 区块    | 交易                                                                                                                                                                      |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OrderCreated   | 2773464 | [0x3bf6f632b156fd907d83ee8ce204fa75886515899062877eaef09abe9c09423e](https://scan-testnet.potos.hk/tx/0x3bf6f632b156fd907d83ee8ce204fa75886515899062877eaef09abe9c09423e) |
| OrderPaid      | 2773468 | [0x1e43aa1e2b89d584ee6ba8a91c4737466073fc484069de8e1426c4cb7be7b1be](https://scan-testnet.potos.hk/tx/0x1e43aa1e2b89d584ee6ba8a91c4737466073fc484069de8e1426c4cb7be7b1be) |
| OrderCompleted | 2773471 | [0x6e91bfe5ae6ff872c6ffb38d7118fd3c9d18e4f4b222e01615b0edf222cbb485](https://scan-testnet.potos.hk/tx/0x6e91bfe5ae6ff872c6ffb38d7118fd3c9d18e4f4b222e01615b0edf222cbb485) |

时间线应显示 3 条事件、订单号 16、上述三个区块号与报告 4.6 节一致。该订单使用的代币不是路线 B 主表的 PWQToken（`0x49d67FD9A5F2C4F0A186f77dF4Daa2C5DAFc33E4`），买卖双方也与主表相反：本单由 `0x3962…` 买入、`0x7061…` 卖出。

## 卖家发货状态（Seller-Shipment-Status 分支）

该分支把 Escrow 的 `Status` 扩展为 Created(0)、Paid(1)、Completed(2)、Refunded(3)、Disputed(4)、Shipped(5)，并加入三处约束：`markShipped(id)` 仅订单卖家、仅在 Paid 状态可调用，成功后发出 `OrderShipped` 且托管资金留在合约；`confirm(id)` 改为仅买家、仅在 Shipped 状态可调用；`refund(id)` 仍要求买家、Paid 状态且已超过截止时间，因此已发货订单不能直接退款。`dispute(id)` 允许 Paid 或 Shipped 状态发起。

复现步骤：`git switch Seller-Shipment-Status`，`yarn install --immutable` 与 `yarn start`，MetaMask 切到 Chain ID `60600` 并打开 `/escrow`。买家创建订单并完成授权与付款后，切换到卖家账户才会出现“标记已发货”；发货后买家只出现“确认收货”和“争议”，不再显示“超期退款”。

下列三单使用 Escrow `0x9A208b6bc80EFb2Ce91c0eC1DDE104aD1f3A5035` 与 PWQToken `0x738532cd4EBD69dfc2Fd78CEFFC50fEe71992AbC`，买家 `0x3120381f4F629FD77d598271976B8EdC3F52996A`，卖家 `0x7Ee066564A11b879Bc6C8AAEeD372D7a401354E5`。


| 订单 | 操作          | 参数                         | 区块    | 交易                                                                                                                                                                      | 发起账户 |
| ---- | ------------- | ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| #0   | `createOrder` | 10 PWQ，`发币测试`           | 2809437 | [0x59eb202cbe7bf270f1ae507f6ee189a101df0e9cff315f35bb2dfbbc59e2f83f](https://scan-testnet.potos.hk/tx/0x59eb202cbe7bf270f1ae507f6ee189a101df0e9cff315f35bb2dfbbc59e2f83f) | 买家     |
| #0   | `approve`     | 10 PWQ 给 Escrow             | 2809441 | [0x1db73428c08bd5cdf50bd59b0abd6d7df562375ce914144c2a4edc52cc866ad2](https://scan-testnet.potos.hk/tx/0x1db73428c08bd5cdf50bd59b0abd6d7df562375ce914144c2a4edc52cc866ad2) | 买家     |
| #0   | `deposit`     | id=0                         | 2809442 | [0xbecd25a766ee2f17875527a95d901d324d8547f2d364174a8107feed9e9ba5c3](https://scan-testnet.potos.hk/tx/0xbecd25a766ee2f17875527a95d901d324d8547f2d364174a8107feed9e9ba5c3) | 买家     |
| #0   | `markShipped` | id=0                         | 2809459 | [0x4ef3a7f1e4dfe809f3bfcaffc954f9cc312cf5418cc9d6a2de4f150f3ab8e5eb](https://scan-testnet.potos.hk/tx/0x4ef3a7f1e4dfe809f3bfcaffc954f9cc312cf5418cc9d6a2de4f150f3ab8e5eb) | 卖家     |
| #0   | `confirm`     | id=0                         | 2809470 | [0x7931ce2c65cd965d5f1d14de602b0f469a623b4f8ddb3e21516b312c81fb7d23](https://scan-testnet.potos.hk/tx/0x7931ce2c65cd965d5f1d14de602b0f469a623b4f8ddb3e21516b312c81fb7d23) | 买家     |
| #1   | `createOrder` | 19 PWQ，`未发货且超期测试`    | 2809523 | [0x2a86148fe8674c9845f4853e4eea7b5a09071bd8edd5117c60e970fc336d926d](https://scan-testnet.potos.hk/tx/0x2a86148fe8674c9845f4853e4eea7b5a09071bd8edd5117c60e970fc336d926d) | 买家     |
| #1   | `approve`     | 19 PWQ 给 Escrow             | 2809600 | [0x39795f9a578db162e8bec57e7c00e6e868977105578b82f8121e359d93747878](https://scan-testnet.potos.hk/tx/0x39795f9a578db162e8bec57e7c00e6e868977105578b82f8121e359d93747878) | 买家     |
| #1   | `deposit`     | id=1                         | 2809602 | [0xd30f5c795e126838d0084fea63c433ee09aad60505b68809569fdc3224142f69](https://scan-testnet.potos.hk/tx/0xd30f5c795e126838d0084fea63c433ee09aad60505b68809569fdc3224142f69) | 买家     |
| #1   | `refund`      | id=1                         | 2809606 | [0xc6618551576d96f78109c8fade3a96c4b52f9924ec95a956bc8874082c74bb52](https://scan-testnet.potos.hk/tx/0xc6618551576d96f78109c8fade3a96c4b52f9924ec95a956bc8874082c74bb52) | 买家     |
| #2   | `createOrder` | 10 PWQ，`已发货且超期`        | 2809613 | [0x8737129141e590075ab206ad528b86387dcc5a90611cff2e2b47d948206084a2](https://scan-testnet.potos.hk/tx/0x8737129141e590075ab206ad528b86387dcc5a90611cff2e2b47d948206084a2) | 买家     |
| #2   | `approve`     | 10 PWQ 给 Escrow             | 2809620 | [0xf3ddedab019b3c09c69346e750d81916aef1da4c4f984a943f66b78e40179141](https://scan-testnet.potos.hk/tx/0xf3ddedab019b3c09c69346e750d81916aef1da4c4f984a943f66b78e40179141) | 买家     |
| #2   | `deposit`     | id=2                         | 2809622 | [0xdeddfe9f190e521bb39941a2676248233271744ba02bd7ec7f44f131f741b538](https://scan-testnet.potos.hk/tx/0xdeddfe9f190e521bb39941a2676248233271744ba02bd7ec7f44f131f741b538) | 买家     |
| #2   | `markShipped` | id=2                         | 2809628 | [0x993290dedd95f7a769a2b70e9c445db69e80b9a37929d251006850929b8b66ab](https://scan-testnet.potos.hk/tx/0x993290dedd95f7a769a2b70e9c445db69e80b9a37929d251006850929b8b66ab) | 卖家     |
| #2   | `confirm`     | id=2                         | 2809634 | [0x3de718f140629e063be74739651de87b6bfa13c7c0493ae960694051235494c4](https://scan-testnet.potos.hk/tx/0x3de718f140629e063be74739651de87b6bfa13c7c0493ae960694051235494c4) | 买家     |

三条状态流转分别是 #0 的 0 → 1 → 5 → 2、#1 的 0 → 1 → 3、#2 的 0 → 1 → 5。订单 #2 在已发货且超期后没有退款交易，因为前端按 Shipped 状态隐藏了退款按钮，合约层 `refund` 也只接受 Paid 状态；该单最后由买家 `confirm(2)` 完成。链上复核：买家 PWQToken 余额为 `180000000000000000000`。该余额由两笔各 100 PWQ 的 `mint` 构成 200，订单 #0、#2 各支出 10，订单 #1 的 19 PWQ 已原路退回，净余 180。

## 多签仲裁（main 或 multi-signature-arbitration 分支）

`MultiSigEscrow.sol` 用构造函数写入两个仲裁人，`REQUIRED_APPROVALS` 固定为 2。`voteResolve(id, sellerWins)` 只允许仲裁人调用，要求订单处于 Disputed、每人每单只能投一次；两票必须同向，一票 `true` 一票 `false` 会触发 `Vote direction mismatch` 回滚；同一方向累计 2 票后执行裁决：`sellerWins = true` 把托管代币转给卖家并置 Completed，`false` 退回买家并置 Refunded，且都是先改状态再转账。

复现顺序（Remix 或任意客户端，MetaMask 切到 Chain ID `60600`）：

1. 部署 LJXToken：区块 2773766，交易 `0xb370f0b2…`，地址 `0x1345AdcD30B95318E0EdAf2814751481E7Ed9eFa`。
2. 给买家铸造 30 LJX：`mint(0x9718…, 30000000000000000000)`，区块 2775437，交易 `0xd8ddc56c…`。
3. 买家授权托管合约：`approve(0x26eF…, 30000000000000000000)`，区块 2775381，交易 `0xdcb59936…`。
4. 部署 MultiSigEscrow，构造参数为仲裁人 1 `0x7Ee066564A11b879Bc6C8AAEeD372D7a401354E5`、仲裁人 2 `0x740B5E7B77C9eAa8b8CE8A75Dc0a0aa6855b645e`：区块 2773777，交易 `0x4b8638eb…`。
5. 买家 `createOrder(卖家 0x3120…, LJXToken, 30000000000000000000, 1800000000, "多签测试订单")`：区块 2773793，交易 `0xc14e6f3b…`。
6. 买家 `deposit(0)`：区块 2775445，交易 `0x0aaccb86…`。此前 2775255 的同名调用执行失败（`0x35ab257d…`，`isError = 1`），原因是当时 `approve` 的 spender 写成了 `0x50D27FEd9E5C565046AB5eEDF8547415001EB7C6` 而非托管合约（2773804 的 `0xaaa15612…` 与 2775253 的 `0x17b98b2f…` 两次授权都指向该地址），重新授权给托管后才成功。
7. 卖家 `dispute(0)`：区块 2775492，交易 `0xf16f6d61…`。
8. 仲裁人 1 `voteResolve(0, false)`：区块 2775546，交易 `0x5f670618…`。
9. 仲裁人 2 `voteResolve(0, false)`：区块 2775569，交易 `0xb7323380…`。


| 步骤                | 区块    | 交易                                                                                                                                                                      | 发起账户                                     |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 部署 LJXToken       | 2773766 | [0xb370f0b2d318deaaef4ccd43b3251dd4e194b0b96ff146438d5424a31e253029](https://scan-testnet.potos.hk/tx/0xb370f0b2d318deaaef4ccd43b3251dd4e194b0b96ff146438d5424a31e253029) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 部署 MultiSigEscrow | 2773777 | [0x4b8638eb3a4c9075c31004e1c236a79f4a96bbaa04c2afcaed8626dfa81bc95b](https://scan-testnet.potos.hk/tx/0x4b8638eb3a4c9075c31004e1c236a79f4a96bbaa04c2afcaed8626dfa81bc95b) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 创建订单 #0         | 2773793 | [0xc14e6f3bf47fef80a5930728ee7d9f96fd4c57b4c15ba86f32d7884e79877f40](https://scan-testnet.potos.hk/tx/0xc14e6f3bf47fef80a5930728ee7d9f96fd4c57b4c15ba86f32d7884e79877f40) | 买家 `0x9718…`                                |
| 首次 `deposit(0)`   | 2775255 | [0x35ab257db30821f7334caf80963d1fd8e5de1883938ff9024edf7bb608f7a884](https://scan-testnet.potos.hk/tx/0x35ab257db30821f7334caf80963d1fd8e5de1883938ff9024edf7bb608f7a884)（执行失败） | 买家 `0x9718…`                                |
| 授权 30 LJX         | 2775381 | [0xdcb59936e45783124bb65bf6e592f975dda0f25beb14e35ba99ff5540e993faa](https://scan-testnet.potos.hk/tx/0xdcb59936e45783124bb65bf6e592f975dda0f25beb14e35ba99ff5540e993faa) | 买家 `0x9718…`                                |
| 铸造 30 LJX         | 2775437 | [0xd8ddc56c0d423bdb54328a85ed8f1e1062f5fe7e558b9fada73848c23cf9574f](https://scan-testnet.potos.hk/tx/0xd8ddc56c0d423bdb54328a85ed8f1e1062f5fe7e558b9fada73848c23cf9574f) | `0x9718…`                                    |
| `deposit(0)` 成功   | 2775445 | [0x0aaccb86e096596028f15977ecdb0456b30532f4801e51aaea7fc16c3c4c415e](https://scan-testnet.potos.hk/tx/0x0aaccb86e096596028f15977ecdb0456b30532f4801e51aaea7fc16c3c4c415e) | 买家 `0x9718…`                                |
| `dispute(0)`        | 2775492 | [0xf16f6d61af988194055a9ed109db9df8771011d5eba884654b6a0280236a0c87](https://scan-testnet.potos.hk/tx/0xf16f6d61af988194055a9ed109db9df8771011d5eba884654b6a0280236a0c87) | 卖家 `0x3120…`                                |
| 仲裁人 1 投 `false` | 2775546 | [0x5f6706186332dc91d6e6a51ccc87873ff636fe93ce2717a44413c1bcd90ce23a](https://scan-testnet.potos.hk/tx/0x5f6706186332dc91d6e6a51ccc87873ff636fe93ce2717a44413c1bcd90ce23a) | 仲裁人 1 `0x7Ee0…`                            |
| 仲裁人 2 投 `false` | 2775569 | [0xb7323380ac97932c0f613bc945cc5704d17ae82a0f0ca0f65d5fec671bfff970](https://scan-testnet.potos.hk/tx/0xb7323380ac97932c0f613bc945cc5704d17ae82a0f0ca0f65d5fec671bfff970) | 仲裁人 2 `0x740B…`                            |

链上复核 `orders(0)` 返回：buyer `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104`、seller `0x3120381f4F629FD77d598271976B8EdC3F52996A`、token `0x1345AdcD30B95318E0EdAf2814751481E7Ed9eFa`、amount `30000000000000000000`、deadline `1800000000`、status `3`（Refunded）、description `多签测试订单`；`LJXToken.balanceOf(0x9718…)` 为 `30000000000000000000`，卖家余额为 `0`，说明 30 枚代币已按两票一致意见退回买家。


## 路线 B 交易记录


| 操作        | 交易哈希                                                                                                                                                                  | 发起账户                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 部署 Escrow | [0xb889df40c027d13292795ced9ede22d4092f1a4e30fac14c961cfcb911389449](https://scan-testnet.potos.hk/tx/0xb889df40c027d13292795ced9ede22d4092f1a4e30fac14c961cfcb911389449) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 创建订单 #4 | [0xeed1d2e6a1fb3f817ecd384ff89a489432d200b6efecb213636ff548be946905](https://scan-testnet.potos.hk/tx/0xeed1d2e6a1fb3f817ecd384ff89a489432d200b6efecb213636ff548be946905) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 授权订单 #4 | [0xe819c2729d258f48a9b193b99d177bc707fae6a2d9b42581eb9b8e6f560f8af4](https://scan-testnet.potos.hk/tx/0xe819c2729d258f48a9b193b99d177bc707fae6a2d9b42581eb9b8e6f560f8af4) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 支付订单 #4 | [0x13f536856a772b6be8e5475b71e7faab12689b843284382a9a475b405090a5b4](https://scan-testnet.potos.hk/tx/0x13f536856a772b6be8e5475b71e7faab12689b843284382a9a475b405090a5b4) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 创建订单 #5 | [0x51e7940f993fff1ddd0d6989246ca8d8f24bf4e2e422c65cfb2eb5e4273e3289](https://scan-testnet.potos.hk/tx/0x51e7940f993fff1ddd0d6989246ca8d8f24bf4e2e422c65cfb2eb5e4273e3289) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 支付订单 #5 | [0x81b52ede3616cc091c5bba9b4b1560b6ddd3bc8ed17e4694c0959ff28ffc3fac](https://scan-testnet.potos.hk/tx/0x81b52ede3616cc091c5bba9b4b1560b6ddd3bc8ed17e4694c0959ff28ffc3fac) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 发起争议 #5 | [0x105bef22efcb4b2e2f5a38ef3ae19437a99f5197379396e327ea5e1dbaba51a0](https://scan-testnet.potos.hk/tx/0x105bef22efcb4b2e2f5a38ef3ae19437a99f5197379396e327ea5e1dbaba51a0) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 仲裁退款 #5 | [0x3077617582ddfa23ad4454411f57caee17da011c48d8debd7aefcd50aedffe3d](https://scan-testnet.potos.hk/tx/0x3077617582ddfa23ad4454411f57caee17da011c48d8debd7aefcd50aedffe3d) | `0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104` |
| 确认收货 #4 | [0x5df08a31fce728176fdd6c725effff2b4847c8dd2b239840c18db6b0e564d901](https://scan-testnet.potos.hk/tx/0x5df08a31fce728176fdd6c725effff2b4847c8dd2b239840c18db6b0e564d901) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |

## 路线 A 交易记录


| 操作               | 交易哈希                                                                                                                                                                  | 发起账户                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 部署 Escrow        | [0xc80fea7b058bac8b0289c6aaeb14a4df0da7ce06848a39c1d316930f6f676be7](https://scan-testnet.potos.hk/tx/0xc80fea7b058bac8b0289c6aaeb14a4df0da7ce06848a39c1d316930f6f676be7) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 创建订单 #0        | [0xbe120356fb90aa68e5564866f038e751ca16c566f87fb0d4193b4d1bd6a2a0c4](https://scan-testnet.potos.hk/tx/0xbe120356fb90aa68e5564866f038e751ca16c566f87fb0d4193b4d1bd6a2a0c4) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 创建订单 #1        | [0x65244ed86c4048c45470f44993c3bf1f95628e9a05ce8935797ee92cb8d1a613](https://scan-testnet.potos.hk/tx/0x65244ed86c4048c45470f44993c3bf1f95628e9a05ce8935797ee92cb8d1a613) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 授权代币（120 个） | [0x786a759b7776453c6b651e56377cd7fbe77aded7c5b209f6f14f661a59fadc21](https://scan-testnet.potos.hk/tx/0x786a759b7776453c6b651e56377cd7fbe77aded7c5b209f6f14f661a59fadc21) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 支付订单 #0        | [0x0cc7ad5c1df6cd317bb92a41e0f28d52ac0dffb6de4826acfaf5925fd5d0dc6c](https://scan-testnet.potos.hk/tx/0x0cc7ad5c1df6cd317bb92a41e0f28d52ac0dffb6de4826acfaf5925fd5d0dc6c) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 支付订单 #1        | [0xe6296efab36ce4872c201be9dd66c6b38cdabf796a114119190a595cfecdcba4](https://scan-testnet.potos.hk/tx/0xe6296efab36ce4872c201be9dd66c6b38cdabf796a114119190a595cfecdcba4) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 发起争议 #1        | [0xfc10f0d5c8a1428228e1ed20de8cba3c7b872d611bf98df13eb6f9b29ef55a57](https://scan-testnet.potos.hk/tx/0xfc10f0d5c8a1428228e1ed20de8cba3c7b872d611bf98df13eb6f9b29ef55a57) | `0x3962e2f0f8c3a6180C209D8442028BB4fb023815` |
| 仲裁退款 #1        | [0xec849533b0e6b718f8766a0c712434dac8bacd71fd74fdb0ab4e217addca8b53](https://scan-testnet.potos.hk/tx/0xec849533b0e6b718f8766a0c712434dac8bacd71fd74fdb0ab4e217addca8b53) | `0xEeF093d43d1143Db42999a25D192f4d5F1fb14A5` |
