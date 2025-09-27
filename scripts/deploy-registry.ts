import { ethers } from "hardhat"
import * as dotenv from "dotenv"
dotenv.config()

async function main() {
  const semaphore = process.env.SEMAPHORE_ADDRESS!
  const groupId = BigInt(process.env.GROUP_ID!)

  const Registry = await ethers.getContractFactory("AnonOwnershipRegistry")
  const reg = await Registry.deploy(semaphore, groupId)
  await reg.waitForDeployment()

  console.log("AnonOwnershipRegistry:", await reg.getAddress())
  console.log("REGISTRY_ADDRESS=", await reg.getAddress())
}

main().catch((e) => { console.error(e); process.exit(1) })