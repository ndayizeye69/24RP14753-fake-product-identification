const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ProductVerification = await hre.ethers.getContractFactory("ProductVerification");
  const productVerification = await ProductVerification.deploy();

  await productVerification.waitForDeployment();

  const address = await productVerification.getAddress();
  console.log("ProductVerification deployed to:", address);
  console.log("Contract owner set to:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});