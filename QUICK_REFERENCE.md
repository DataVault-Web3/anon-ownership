# Quick Reference - Anonymous Ownership Registry

## 🚀 One-Time Setup

```bash
# 1. Start blockchain
npx hardhat node

# 2. Deploy Semaphore (in new terminal)
npx hardhat run scripts/deploy-semaphore.ts --network localhost
# Copy SEMAPHORE_ADDRESS to .env

# 3. Add your identity
export SEMAPHORE_ADDRESS=<your-address>
npx hardhat run scripts/add-member.ts --network localhost

# 4. Deploy registry
npx hardhat run scripts/deploy-registry.ts --network localhost
# Copy OWNERSHIP_REGISTRY_ADDRESS to .env
```

## 🎯 Daily Usage

```bash
# Set environment (replace with your addresses)
export SEMAPHORE_ADDRESS=0xYourSemaphoreAddress
export OWNERSHIP_REGISTRY_ADDRESS=0xYourRegistryAddress

# Claim ownership of objects
npx hardhat run scripts/claim-and-prove.ts --network localhost
```

## 🔍 Status Checks

```bash
# Check if system is working
npx hardhat console --network localhost

# In console:
const semaphore = await ethers.getContractAt("Semaphore", "YOUR_SEMAPHORE_ADDRESS")
await semaphore.getMerkleTreeSize(0)  // Should show group size

const registry = await ethers.getContractAt("AnonOwnershipRegistry", "YOUR_REGISTRY_ADDRESS")
await registry.claimed("0xYourObjectHash")  // Check if object is claimed
```

## ⚡ Error Quick Fixes

| Error Code       | Meaning           | Solution                                   |
| ---------------- | ----------------- | ------------------------------------------ |
| `0x646cf558`     | AlreadyClaimed    | ✅ Expected! Try different JSON object     |
| `0xecf64f12`     | DepthNotSupported | ✅ Handled automatically with forced depth |
| `0x4d329586`     | RootNotInGroup    | ❌ Check group membership                  |
| No reason string | Interface issue   | ❌ Redeploy contracts                      |

## 📝 Environment Template

```bash
# .env file
USER_ID_SEED="your-secret-seed-keep-this-safe"
SEMAPHORE_ADDRESS="0x..."
GROUP_ID="0"
OWNERSHIP_REGISTRY_ADDRESS="0x..."
```

## 🎨 Custom JSON Objects

Edit in `scripts/claim-and-prove.ts`:

```javascript
const myJSON = {
  title: "Your Document",
  version: 1,
  timestamp: Date.now(), // Ensures uniqueness
  data: "your content here",
};
```

## 🔄 Reset Everything

```bash
# Stop hardhat node (Ctrl+C)
# Restart hardhat node
npx hardhat node

# Redeploy everything
npx hardhat run scripts/deploy-semaphore.ts --network localhost
npx hardhat run scripts/add-member.ts --network localhost
npx hardhat run scripts/deploy-registry.ts --network localhost

# Update .env with new addresses
```

---

**💡 Pro Tip**: Keep your `USER_ID_SEED` safe - it's your permanent anonymous identity!
