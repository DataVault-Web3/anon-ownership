import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox" // or "@nomicfoundation/hardhat-ethers" if you chose Option B
import * as dotenv from "dotenv"
dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23", // Updated from 0.8.20 to match Semaphore requirements
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: { url: process.env.RPC_URL || "http://127.0.0.1:8545" },
  }
}

export default config