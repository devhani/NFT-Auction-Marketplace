require('babel-register');
require('babel-polyfill');

var HDWallet = require('@truffle/hdwallet-provider')

const HDWalletProvider = require('@truffle/hdwallet-provider');
const infuraKey = "https://rinkeby.infura.io/v3/fcc9a053d77e47e38babe07ace28b0cd";
const fs = require('fs');
const mnemonic = fs.readFileSync(".secret").toString().trim();
const infuraURL = "https://rinkeby.infura.io/v3/fcc9a053d77e47e38babe07ace28b0cd";


module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, infuraURL),
      network_id: 4,          // Rinkeby's network id
      gas: 9990000,        
    },
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    
    solc: {
      version: "0.6.3",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
