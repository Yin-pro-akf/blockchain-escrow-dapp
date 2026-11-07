# 区块链托管交易大作业

3 班第 5 组（组长彭雯青，组员刘思桐、林俊希）。基础实验采用路线 B，由用户通过钱包签名完成托管交易。路线 A 使用独立合约，由 Web3j 后端账户签署仲裁交易。


| 分支                                                                                                        | 实验内容                               | 验收入口                                                   |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| [main](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/main)                                     | 路线 B、重入攻击挑战、独立双仲裁人合约 | `/escrow`，重入和多签合约位于 `packages/hardhat/contracts` |
| [Route-A-escrow](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/Route-A-escrow)                 | Spring Boot 与 Web3j 后端              | `http://localhost:8080/api/escrow`                         |
| [Order-Timeline](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/Order-Timeline)                 | 订单事件时间线                         | `/escrow` 的订单时间线面板                                 |
| [Seller-Shipment-Status](https://github.com/Yin-pro-akf/blockchain-escrow-dapp/tree/Seller-Shipment-Status) | 卖家标记发货及超期退款限制             | `/escrow`                                                  |

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

多签实验使用独立的 `MultiSigEscrow`，两个仲裁人分别调用 `voteResolve`，意见一致后执行裁决。重入实验对应 `VulnerableVault.sol`、`Attacker.sol` 和 `FixedVault.sol`。发货分支的测试覆盖未发货超期退款和已发货超期时拒绝直接退款。

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

## 重入实验地址


| 合约                              | 地址                                         |
| --------------------------------- | -------------------------------------------- |
| VulnerableVault（第一轮受害金库） | `0xec4D81E683dAc60c9f995E115ED94f872760F90A` |
| Attacker（第一轮攻击合约）        | `0xa910364DF22e46e4Eb320cA8674b6E6a610f09A2` |
| FixedVault（修复后金库）          | `0x1970611d92817e92256166FF52f934653cBAde77` |
| Attacker（第二轮攻击合约）        | `0x9fb36Df26e2A01dBc00512c363Ce628CF5A4DEBb` |

第一轮攻击后金库余额归零、攻击合约取得 0.003 POT；第二轮针对 FixedVault 的攻击被重入锁拒绝，金库 0.002 POT 保持完好。

## 路线 B 交易记录


| 操作        | 交易哈希                                                                                                                                                                  | 发起账户                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 部署 Escrow | [0xb889df40c027d13292795ced9ede22d4092f1a4e30fac14c961cfcb911389449](https://scan-testnet.potos.hk/tx/0xb889df40c027d13292795ced9ede22d4092f1a4e30fac14c961cfcb911389449) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 创建订单 #4 | [0xeed1d2e6a1fb3f817ecd384ff89a489432d200b6efecb213636ff548be946905](https://scan-testnet.potos.hk/tx/0xeed1d2e6a1fb3f817ecd384ff89a489432d200b6efecb213636ff548be946905) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 授权订单 #4 | [0xe819c2729d258f48a9b193b99d177bc707fae6a2d9b42581eb9b8e6f560f8af4](https://scan-testnet.potos.hk/tx/0xe819c2729d258f48a9b193b99d177bc707fae6a2d9b42581eb9b8e6f560f8af4) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 支付订单 #4 | [0x13f536856a772b6be8e5475b71e7faab12689b843284382a9a475b405090a5b4](https://scan-testnet.potos.hk/tx/0x13f536856a772b6be8e5475b71e7faab12689b843284382a9a475b405090a5b4) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
| 创建订单 #5 | [0x51e7940f993fff1ddd0d6989246ca8d8f24bf4e2e422c65cfb2eb5e4273e3289](https://scan-testnet.potos.hk/tx/0x51e7940f993fff1ddd0d6989246ca8d8f24bf4e2e422c65cfb2eb5e4273e3289) | `0x7061b72D8a3C93ac3268B3f2DE1c1E2B4356f426` |
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
