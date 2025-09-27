import { ethers } from "hardhat"
import * as dotenv from "dotenv"
dotenv.config()
import stringify from "json-stable-stringify"
import { keccak256, toUtf8Bytes } from "ethers"
import { Identity } from "@semaphore-protocol/identity"
import { Group } from "@semaphore-protocol/group"
import { generateProof } from "@semaphore-protocol/proof"

function objectHashBytes32(obj: unknown): `0x${string}` {
  const canonical = stringify(obj, { space: 0 })
  return keccak256(toUtf8Bytes(canonical)) as `0x${string}`
}

function packProofForSolidity(proof: any): [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  console.log("Raw proof structure:", JSON.stringify(proof, null, 2))
  
  if (proof.proof) {
    const { pi_a, pi_b, pi_c } = proof.proof
    return [
      BigInt(pi_a[0]), BigInt(pi_a[1]),
      BigInt(pi_b[0][1]), BigInt(pi_b[0][0]), BigInt(pi_b[1][1]), BigInt(pi_b[1][0]),
      BigInt(pi_c[0]), BigInt(pi_c[1])
    ]
  } else if (proof.pi_a && proof.pi_b && proof.pi_c) {
    return [
      BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1]),
      BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0]),
      BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])
    ]
  } else if (Array.isArray(proof) && proof.length === 8) {
    return proof.map(p => BigInt(p)) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
  } else {
    throw new Error(`Unsupported proof structure: ${JSON.stringify(proof)}`)
  }
}

async function main() {
  const groupId = BigInt(process.env.GROUP_ID!)
  const registryAddr = process.env.OWNERSHIP_REGISTRY_ADDRESS!
  const semaphoreAddr = process.env.SEMAPHORE_ADDRESS!

  console.log("=== Configuration ===")
  console.log("Group ID:", groupId.toString())
  console.log("Registry Address:", registryAddr)
  console.log("Semaphore Address:", semaphoreAddr)

  if (!registryAddr || registryAddr === 'undefined') {
    console.error("❌ OWNERSHIP_REGISTRY_ADDRESS not set!")
    console.log("Run: npx hardhat run scripts/deploy-ownership-registry.ts --network localhost")
    return
  }

  const identity = new Identity(process.env.USER_ID_SEED!)
  const commitment = identity.commitment
  console.log("Identity commitment:", commitment.toString())

  const semaphore = await ethers.getContractAt("Semaphore", semaphoreAddr)
  
  const groupSize = await semaphore.getMerkleTreeSize(groupId)
  const groupDepth = await semaphore.getMerkleTreeDepth(groupId)
  const groupRoot = await semaphore.getMerkleTreeRoot(groupId)
  
  console.log("\n=== On-chain Group Info ===")
  console.log("Group size:", groupSize.toString())
  console.log("Group depth:", groupDepth.toString())
  console.log("Group root:", groupRoot.toString())

  console.log("\n=== Building Local Group ===")
  const group = new Group()
  group.addMembers([commitment])
  console.log("Local group size:", group.size)
  console.log("Local group root:", group.root.toString())

  const myJSON = { a: 1, b: 2, nested: { x: ["y", 3] } }
  const objectHash = objectHashBytes32(myJSON)
  const objectHashField = BigInt(objectHash)

  console.log("\n=== JSON Object ===")
  console.log("JSON:", JSON.stringify(myJSON))
  console.log("Hash:", objectHash)

  const externalNullifier = objectHashField
  const signal = objectHashField

  console.log("\n=== Generating Proof ===")
  try {
    const fullProof = await generateProof(identity, group, externalNullifier, signal)
    
    console.log("✅ Proof generated successfully!")
    console.log("Merkle root:", fullProof.merkleTreeRoot.toString())
    console.log("Nullifier:", fullProof.nullifier.toString())

    const solidityProof = packProofForSolidity(fullProof.points)
    const nullifierHash = fullProof.nullifier
    const merkleRoot = fullProof.merkleTreeRoot

    console.log("✅ Proof packed successfully!")

    console.log("\n=== Claiming Ownership ===")
    const registry = await ethers.getContractAt("AnonOwnershipRegistry", registryAddr)
    
    const FORCED_DEPTH = 1
    console.log("Using forced depth:", FORCED_DEPTH, "(minimum required by Semaphore)")
    
    const tx1 = await registry.claimOwnership(objectHash, FORCED_DEPTH, merkleRoot, nullifierHash, solidityProof)
    await tx1.wait()
    console.log("✅ Ownership claimed for", objectHash)

    console.log("\n=== Proving Ownership Again ===")
    const fullProof2 = await generateProof(identity, group, externalNullifier, signal)
    const solidityProof2 = packProofForSolidity(fullProof2.points)
    const tx2 = await registry.proveOwnership(objectHash, FORCED_DEPTH, fullProof2.merkleTreeRoot, fullProof2.nullifier, solidityProof2)
    await tx2.wait()
    console.log("✅ Ownership proven again for", objectHash)

  } catch (error) {
    console.error("❌ Error:", error.message)
    console.error("Full error:", error)
  }
}

main().catch((e) => { 
  console.error("Script failed:", e)
  process.exit(1) 
})