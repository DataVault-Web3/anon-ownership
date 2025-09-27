import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deployer:", deployer.address)

  console.log("Deploying Poseidon library...")
  const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3")
  const poseidonT3 = await PoseidonT3Factory.deploy()
  await poseidonT3.waitForDeployment()
  const poseidonT3Addr = await poseidonT3.getAddress()
  console.log("PoseidonT3:", poseidonT3Addr)

  console.log("Deploying verifier...")
  const VerifierFactory = await ethers.getContractFactory("SemaphoreVerifier")
  const verifier = await VerifierFactory.deploy()
  await verifier.waitForDeployment()
  const verifierAddr = await verifier.getAddress()
  console.log("Verifier:", verifierAddr)

  console.log("Deploying Semaphore...")
  const SemaphoreFactory = await ethers.getContractFactory("Semaphore", {
    libraries: {
      "poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidonT3Addr,
    },
  })
  const semaphore = await SemaphoreFactory.deploy(verifierAddr)
  await semaphore.waitForDeployment()
  const semaphoreAddr = await semaphore.getAddress()
  console.log("Semaphore:", semaphoreAddr)

  console.log("\n=== Creating group ===")
  const admin = deployer.address

  let groupId: bigint

  try {
    console.log("Trying: createGroup(address, uint256) - with admin and depth 20")
    const depth = 20n
    const tx1 = await semaphore["createGroup(address,uint256)"](admin, depth)
    const receipt = await tx1.wait()
    
    const currentGroupCounter = await semaphore.groupCounter()
    groupId = currentGroupCounter - 1n
    
    console.log("✅ Success! Auto-generated groupId:", groupId.toString())
    
  } catch (error1) {
    console.log("❌ Failed with createGroup():", error1.message)
    
    try {
      console.log("Trying: createGroup(address) - with admin")
      const tx2 = await semaphore["createGroup(address)"](admin)
      const receipt = await tx2.wait()
      
      const currentGroupCounter = await semaphore.groupCounter()
      groupId = currentGroupCounter - 1n
      
      console.log("✅ Success! Auto-generated groupId:", groupId.toString())
      
    } catch (error2) {
      console.log("❌ Failed with createGroup(address):", error2.message)
      
      try {
        console.log("Trying: createGroup(address, uint256) - with admin and depth")
        const depth = 20n
        const tx3 = await semaphore["createGroup(address,uint256)"](admin, depth)
        const receipt = await tx3.wait()
        
        const currentGroupCounter = await semaphore.groupCounter()
        groupId = currentGroupCounter - 1n
        
        console.log("✅ Success! Auto-generated groupId:", groupId.toString())
        
      } catch (error3) {
        console.log("❌ Failed with createGroup(address, uint256):", error3.message)
        console.log("❌ All createGroup attempts failed")
        return
      }
    }
  }

  console.log("\n🎉 Group created successfully!")
  console.log("Group ID:", groupId!.toString())
  console.log("Admin:", admin)

  try {
    const groupAdmin = await semaphore.getGroupAdmin(groupId!)
    const merkleTreeDepth = await semaphore.getMerkleTreeDepth(groupId!)
    const merkleTreeSize = await semaphore.getMerkleTreeSize(groupId!)
    
    console.log("\n=== Group Info ===")
    console.log("Group Admin:", groupAdmin)
    console.log("Merkle Tree Depth:", merkleTreeDepth.toString())
    console.log("Merkle Tree Size:", merkleTreeSize.toString())
  } catch (error) {
    console.log("Could not fetch group info:", error.message)
  }

  console.log("\n=== Add these to your .env file ===")
  console.log("SEMAPHORE_ADDRESS=" + semaphoreAddr)
  console.log("GROUP_ID=" + groupId!.toString())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})