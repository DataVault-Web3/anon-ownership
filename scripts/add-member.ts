import { ethers } from "hardhat"
import * as dotenv from "dotenv"
dotenv.config()
import { Identity } from "@semaphore-protocol/identity"

async function main() {
  const groupId = BigInt(process.env.GROUP_ID!)
  const seed = process.env.USER_ID_SEED!
  const identity = new Identity(seed)
  const commitment = identity.commitment // bigint

  const semaphore = await ethers.getContractAt("Semaphore", process.env.SEMAPHORE_ADDRESS!)
  const tx = await semaphore.addMember(groupId, commitment)
  await tx.wait()

  console.log("Added member. Commitment:", commitment.toString())
  console.log("Keep USER_ID_SEED safe; it reproduces the same identity.")
}

main().catch((e) => { console.error(e); process.exit(1) })