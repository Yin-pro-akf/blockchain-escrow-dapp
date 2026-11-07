// 01_deploy_token.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  if (hre.network.name === "potos_testnet" && deployer.toLowerCase() !== "0x971811d8d22be7f8f99b1db5eb309ebfb6b94104") {
    throw new Error("Use account 0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104 to deploy your PWQToken.");
  }
  await hre.deployments.deploy("PWQToken", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

export default deployToken;
deployToken.tags = ["TokenPWQ202430552622"];
