import { ethers, network, deployments } from "hardhat";

async function main() {
  if (network.name !== "localhost" || (await ethers.provider.getNetwork()).chainId !== 31337n) {
    throw new Error("This script requires the Hardhat localhost network.");
  }

  const arbiter = "0x971811d8d22be7f8f99b1db5eb309ebfb6b94104";
  const buyer = "0x3120381f4f629fd77d598271976b8edc3f52996a";
  const seller = "0x7ee066564a11b879bc6c8aaeed372d7a401354e5";
  const escrowDeployment = await deployments.get("Escrow");
  const escrow = await ethers.getContractAt("Escrow", escrowDeployment.address);
  if ((await escrow.arbiter()).toLowerCase() !== arbiter) {
    throw new Error("Redeploy Escrow with the requested arbiter before continuing.");
  }
  const minimumEth = ethers.parseEther("10");

  for (const address of [arbiter, buyer, seller]) {
    if ((await ethers.provider.getBalance(address)) < minimumEth) {
      await ethers.provider.send("hardhat_setBalance", [address, ethers.toQuantity(minimumEth)]);
    }
  }

  const deployment = await deployments.get("PWQToken");
  const token = await ethers.getContractAt("PWQToken", deployment.address);
  const [deployer] = await ethers.getSigners();
  const targetBalance = ethers.parseUnits("100", 18);
  const balance = await token.balanceOf(buyer);
  if (balance < targetBalance) {
    await (await token.connect(deployer).mint(buyer, targetBalance - balance)).wait();
  }

  console.log("Escrow:", escrowDeployment.address);
  console.log("Arbiter:", await escrow.arbiter());
  console.log("Buyer PWQToken:", ethers.formatUnits(await token.balanceOf(buyer), 18));
  console.log("All three demo accounts have at least 10 local ETH.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
