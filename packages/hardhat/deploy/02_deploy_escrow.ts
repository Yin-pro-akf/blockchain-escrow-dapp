// 02_deploy_escrow.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const ARBITER = "0x971811D8D22bE7f8F99B1db5eb309EBFb6B94104";

const deployEscrow: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  if (hre.network.name === "potos_testnet" && deployer.toLowerCase() !== ARBITER.toLowerCase()) {
    throw new Error("Use the configured arbiter account to deploy your Escrow.");
  }
  await hre.deployments.deploy("Escrow", {
    from: deployer,
    args: [ARBITER],
    log: true,
    autoMine: true,
  });
};

export default deployEscrow;
deployEscrow.tags = ["EscrowPWQ202430552622"];
