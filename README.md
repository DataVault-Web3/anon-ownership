# Anonymous Ownership Registry

A zero-knowledge proof-based system for anonymous ownership claims using Semaphore protocol. This system allows users to claim ownership of digital objects (JSON data) while maintaining complete privacy and preventing double-claims.

## 🎯 Overview

The Anonymous Ownership Registry enables:

- **Anonymous Ownership Claims**: Claim ownership without revealing your identity
- **Zero-Knowledge Proofs**: Prove group membership without exposing personal data
- **Duplicate Prevention**: Prevent the same object from being claimed multiple times
- **Ownership Verification**: Prove ownership of previously claimed objects

## 🏗️ Architecture

### Core Components

1. **Semaphore Protocol**: Provides zero-knowledge group membership proofs
2. **AnonOwnershipRegistry**: Smart contract managing ownership claims
3. **Identity Management**: Cryptographic identities for anonymous users
4. **Proof Generation**: Creates zero-knowledge proofs for ownership claims

### System Flow

```
User Identity → Semaphore Group → Generate Proof → Claim Ownership → Verify Ownership
```

## 🔧 Internal Working

### 1. Identity & Group Management

- Each user has a cryptographic identity with a commitment
- Users are added to a Semaphore group (merkle tree of commitments)
- Group membership enables proof generation without revealing identity

### 2. Object Hashing

- JSON objects are canonically serialized using `json-stable-stringify`
- Objects are hashed using Keccak256 to create unique identifiers
- Hash serves as both signal and external nullifier in proofs

### 3. Zero-Knowledge Proof Generation

- Proves: "I am a member of the group AND I know the preimage of this hash"
- Uses Semaphore's circuit to generate zk-SNARK proofs
- Produces a nullifier that prevents double-spending

### 4. On-Chain Verification

- Smart contract verifies the zero-knowledge proof
- Maps object hashes to nullifiers (not identities)
- Prevents duplicate claims using nullifier tracking

## 📋 Prerequisites

- Node.js (v18+)
- Hardhat development environment
- Local blockchain (Hardhat Network)

## 🚀 Quick Start

### 1. Installation

```bash
cd anon-ownership
npm install
```

### 2. Environment Setup

Create a `.env` file:

```bash
# Generate a random seed for your identity
USER_ID_SEED="your-secret-seed-here"

# These will be populated after deployment
SEMAPHORE_ADDRESS=""
GROUP_ID=""
OWNERSHIP_REGISTRY_ADDRESS=""
```

### 3. Start Local Blockchain

```bash
npx hardhat node
```

Keep this terminal running.

## 📖 Complete Runbook

### Step 1: Deploy Semaphore Infrastructure

```bash
npx hardhat run scripts/deploy-semaphore.ts --network localhost
```

**Expected Output:**

```
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
PoseidonT3: 0x...
Verifier: 0x...
Semaphore: 0x...
Group ID: 0
```

**Action Required:** Copy the `SEMAPHORE_ADDRESS` to your `.env` file.

### Step 2: Add Your Identity to the Group

```bash
export SEMAPHORE_ADDRESS=<address-from-step-1>
npx hardhat run scripts/add-member.ts --network localhost
```

**Expected Output:**

```
Added member. Commitment: 17703299358118700136594072929752634577016113478846486071128418346941104444603
Keep USER_ID_SEED safe; it reproduces the same identity.
```

### Step 3: Deploy Ownership Registry

```bash
npx hardhat run scripts/deploy-registry.ts --network localhost
```

**Expected Output:**

```
AnonOwnershipRegistry: 0x...
REGISTRY_ADDRESS= 0x...
```

**Action Required:** Copy the `OWNERSHIP_REGISTRY_ADDRESS` to your `.env` file.

### Step 4: Test the System

```bash
export OWNERSHIP_REGISTRY_ADDRESS=<address-from-step-3>
npx hardhat run scripts/claim-and-prove.ts --network localhost
```

**Expected Output:**

```
✅ Proof generated successfully!
✅ Ownership claimed for 0x...
✅ Ownership proven again for 0x...
```

## 🔍 Understanding the Output

### Successful Claim

```
=== Claiming Ownership ===
Using forced depth: 1 (minimum required by Semaphore)
✅ Ownership claimed for 0xea21670bdb34c04b0edb05e13518acf667e4144eb001b56333b9985e0a4edc79
```

### Duplicate Claim Prevention

```
❌ Error: VM Exception with custom error (return data: 0x646cf558)
```

This error (`AlreadyClaimed()`) is **expected** and **good** - it means the system is preventing double-claims.

### Proof Structure

```
Raw proof structure: [
  "17454036302904535419201448379062372393506270210521000771438067795768615328484",
  "11588949043175972318678848377231376562856184491031913893341083840279618569721",
  ...
]
```

This is the zero-knowledge proof that proves group membership without revealing identity.

## 🛠️ Development Workflow

### For New Objects

1. **Modify the JSON object** in `scripts/claim-and-prove.ts`:

```javascript
const myJSON = {
  title: "My Document",
  version: 1,
  data: "some content",
};
```

2. **Run the claim script**:

```bash
npx hardhat run scripts/claim-and-prove.ts --network localhost
```

### For Testing Different Scenarios

1. **Test with same object twice** (should fail with `AlreadyClaimed`)
2. **Test with different objects** (should succeed)
3. **Test ownership proving** (should always work for owned objects)

## 🔐 Security Features

### Privacy Protection

- **Identity Privacy**: Your real identity is never revealed on-chain
- **Group Membership**: Only proves you're in the authorized group
- **Unlinkability**: Different proofs from the same user cannot be linked

### Anti-Fraud Mechanisms

- **Nullifier System**: Prevents double-claiming the same object
- **Proof Verification**: Cryptographically ensures claim validity
- **Group Authorization**: Only group members can make claims

## 🚨 Troubleshooting

### Common Errors and Solutions

#### `Semaphore__MerkleTreeDepthIsNotSupported (0xecf64f12)`

**Cause**: Group depth is 0, but Semaphore requires minimum depth 1
**Solution**: The system automatically uses forced depth 1 - this is handled internally

#### `AlreadyClaimed (0x646cf558)`

**Cause**: Object has already been claimed
**Solution**: This is expected behavior - try with a different JSON object

#### `Transaction reverted without a reason string`

**Cause**: Usually an interface mismatch or gas issue
**Solution**: Ensure contracts are properly deployed and addresses are correct

#### `Semaphore verification failed`

**Cause**: Proof generation or verification issue
**Solution**: Check that your identity is properly added to the group

### Debug Steps

1. **Verify Deployment**:

```bash
# Check if contracts are deployed
npx hardhat run scripts/test-registry-connection.ts --network localhost
```

2. **Check Group Membership**:

```bash
# Verify your identity is in the group
npx hardhat console --network localhost
> const semaphore = await ethers.getContractAt("Semaphore", "YOUR_SEMAPHORE_ADDRESS")
> await semaphore.getMerkleTreeSize(0)  // Should be > 0
```

3. **Test with Fresh Object**:
   - Modify the JSON object in the script
   - Use current timestamp to ensure uniqueness

## 📁 File Structure

```
anon-ownership/
├── contracts/
│   ├── AnonOwnershipRegistry.sol    # Main ownership registry contract
│   └── SemaphoreImports.sol         # Semaphore protocol imports
├── scripts/
│   ├── deploy-semaphore.ts          # Deploy Semaphore infrastructure
│   ├── add-member.ts                # Add identity to group
│   ├── deploy-registry.ts           # Deploy ownership registry
│   └── claim-and-prove.ts           # Test ownership claims
├── .env                             # Environment configuration
└── README.md                        # This file
```

## 🔄 Maintenance

### Regular Tasks

1. **Backup Identity Seed**: Keep your `USER_ID_SEED` secure and backed up
2. **Monitor Group Size**: Track how many members are in your Semaphore group
3. **Clean Deployments**: For testing, you may want to redeploy contracts periodically

### Upgrading

1. **Update Dependencies**:

```bash
npm update
```

2. **Redeploy Contracts** (if needed):

```bash
# Follow the complete runbook from Step 1
```

## 🎯 Use Cases

### Digital Asset Ownership

- Claim ownership of digital artworks
- Prove authorship of documents
- Establish priority claims on ideas

### Anonymous Voting

- Vote on proposals while maintaining privacy
- Prevent double-voting through nullifiers
- Verify voter eligibility anonymously

### Decentralized Identity

- Prove membership in organizations
- Anonymous credential verification
- Privacy-preserving authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test thoroughly with the runbook
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🆘 Support

If you encounter issues:

1. **Check this README** for troubleshooting steps
2. **Verify environment variables** are set correctly
3. **Ensure local blockchain is running**
4. **Follow the runbook step-by-step**

For additional help, create an issue with:

- Complete error message
- Steps to reproduce
- Environment details (Node.js version, OS, etc.)

---

**🎉 Congratulations!** You now have a fully functional anonymous ownership registry system powered by zero-knowledge proofs!
