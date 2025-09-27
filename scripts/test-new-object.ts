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

// Custom proof packing function to handle different proof structures
function packProofForSolidity(proof: any): [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  console.log("Raw proof structure:", JSON.stringify(proof, null, 2))
  
  // Try different proof structures
  if (proof.proof) {
    // Structure: { proof: { pi_a: [...], pi_b: [...], pi_c: [...] } }
    const { pi_a, pi_b, pi_c } = proof.proof
    return [
      BigInt(pi_a[0]), BigInt(pi_a[1]),
      BigInt(pi_b[0][1]), BigInt(pi_b[0][0]), BigInt(pi_b[1][1]), BigInt(pi_b[1][0]),
      BigInt(pi_c[0]), BigInt(pi_c[1])
    ]
  } else if (proof.pi_a && proof.pi_b && proof.pi_c) {
    // Structure: { pi_a: [...], pi_b: [...], pi_c: [...] }
    return [
      BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1]),
      BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0]),
      BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])
    ]
  } else if (Array.isArray(proof) && proof.length === 8) {
    // Structure: [a0, a1, b00, b01, b10, b11, c0, c1]
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

  // Build the same identity we registered
  const identity = new Identity(process.env.USER_ID_SEED!)
  const commitment = identity.commitment
  console.log("Identity commitment:", commitment.toString())

  // Get the on-chain group info
  const semaphore = await ethers.getContractAt("Semaphore", semaphoreAddr)
  
  const groupSize = await semaphore.getMerkleTreeSize(groupId)
  const groupDepth = await semaphore.getMerkleTreeDepth(groupId)
  const groupRoot = await semaphore.getMerkleTreeRoot(groupId)
  
  console.log("\n=== On-chain Group Info ===")
  console.log("Group size:", groupSize.toString())
  console.log("Group depth:", groupDepth.toString())
  console.log("Group root:", groupRoot.toString())

  // Build a local mirror of the group
  console.log("\n=== Building Local Group ===")
  const group = new Group()
  group.addMembers([commitment])
  console.log("Local group size:", group.size)
  console.log("Local group root:", group.root.toString())

  // Test with a NEW JSON object (different from the previous one)
  const myJSON = { 
    title: "My New Document", 
    version: 2, 
    metadata: { 
      author: "anonymous", 
      timestamp: Date.now() 
    } 
  }
  const objectHash = objectHashBytes32(myJSON)
  const objectHashField = BigInt(objectHash)

  console.log("\n=== NEW JSON Object ===")
  console.log("JSON:", JSON.stringify(myJSON))
  console.log("Hash:", objectHash)

  const externalNullifier = objectHashField
  const signal = objectHashField

  console.log("\n=== Generating Proof ===")
  try {
    // Generate proof
    const fullProof = await generateProof(identity, group, externalNullifier, signal)
    
    console.log("✅ Proof generated successfully!")
    console.log("Merkle root:", fullProof.merkleTreeRoot.toString())
    console.log("Nullifier:", fullProof.nullifier.toString())

    // Pack the proof using our custom function
    const solidityProof = packProofForSolidity(fullProof.points)
    const nullifierHash = fullProof.nullifier
    const merkleRoot = fullProof.merkleTreeRoot

    console.log("✅ Proof packed successfully!")

    // Check if this new object is already claimed
    console.log("\n=== Checking Claim Status ===")
    const registry = await ethers.getContractAt("AnonOwnershipRegistry", registryAddr)
    const alreadyClaimed = await registry.claimed(objectHash)
    console.log("Already claimed:", alreadyClaimed)

    if (alreadyClaimed) {
      console.log("⚠️ This object is already claimed. Let's try proving ownership instead...")
      
      // Try to prove ownership
      console.log("\n=== Proving Ownership ===")
      const FORCED_DEPTH = 1
      const tx2 = await registry.proveOwnership(objectHash, FORCED_DEPTH, merkleRoot, nullifierHash, solidityProof)
      await tx2.wait()
      console.log("✅ Ownership proven successfully!")
      
    } else {
      // Claim ownership on-chain
      console.log("\n=== Claiming Ownership ===")
      const FORCED_DEPTH = 1
      console.log("Using forced depth:", FORCED_DEPTH, "(minimum required by Semaphore)")
      
      const tx1 = await registry.claimOwnership(objectHash, FORCED_DEPTH, merkleRoot, nullifierHash, solidityProof)
      await tx1.wait()
      console.log("✅ Ownership claimed for", objectHash)

      // Generate a new proof and re-prove
      console.log("\n=== Proving Ownership Again ===")
      const fullProof2 = await generateProof(identity, group, externalNullifier, signal)
      const solidityProof2 = packProofForSolidity(fullProof2.points)
      const tx2 = await registry.proveOwnership(objectHash, FORCED_DEPTH, fullProof2.merkleTreeRoot, fullProof2.nullifier, solidityProof2)
      await tx2.wait()
      console.log("✅ Ownership proven again for", objectHash)
    }

  } catch (error) {
    console.error("❌ Error:", error.message)
    console.error("Full error:", error)
  }
}

main().catch((e) => { 
  console.error("Script failed:", e)
  process.exit(1) 
})