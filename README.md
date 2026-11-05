# Spring Boot + Web3J Example

This is a simple example of a Spring Boot application that integrates with Web3J to interact with Ethereum smart contracts.

## Overview

This application demonstrates how to:
- Deploy a smart contract to an Ethereum blockchain
- Load an existing smart contract
- Interact with a smart contract (get and set values)
- Expose smart contract functionality via REST API

## Prerequisites

- Java 21 or higher
- Gradle
- An Ethereum client (like Ganache, Geth, or a testnet connection)

## Smart Contract

The application uses a simple `SimpleStorage` contract that allows storing and retrieving a single value:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedData;
    
    event DataChanged(uint256 newValue);
    
    function set(uint256 x) public {
        storedData = x;
        emit DataChanged(x);
    }
    
    function get() public view returns (uint256) {
        return storedData;
    }
}
```

## Building and Running

1. Clone the repository
2. Configure your Ethereum client in `src/main/resources/application.properties`
3. Build the application:
   ```
   ./gradlew build
   ```
4. Run the application:
   ```
   ./gradlew bootRun
   ```

## API Endpoints

### Deploy a new contract
```
POST /api/storage/deploy
```

### Load an existing contract
```
POST /api/storage/load?address={contractAddress}
```

### Get the stored value
```
GET /api/storage/value/get
```

### Set a new value
```
POST /api/storage/value/set?value={newValue}
```

### Get the contract address
```
GET /api/storage/address
```

## Example Usage

1. Deploy a new contract:
   ```
   curl -X POST http://localhost:8080/api/storage/deploy
   ```

2. Set a value:
   ```
   curl -X POST http://localhost:8080/api/storage/value?value=42
   ```

3. Get the value:
   ```
   curl -X GET http://localhost:8080/api/storage/value
   ```

## Configuration

The application can be configured in `src/main/resources/application.properties`:

```properties
# Server configuration
server.port=8080

# Web3j configuration
web3j.client-address=http://localhost:8545
web3j.private-key=${WEB3J_PRIVATE_KEY}
web3j.gas-price=20000000000
web3j.gas-limit=6721975
```

## Notes

- This is a simple example and not intended for production use
- Supply the signing key through the `WEB3J_PRIVATE_KEY` environment variable. There is no default private key.
- Set this variable in the shell or deployment secret store before starting the application. Spring Boot does not automatically load `.env` files.
- Never commit private keys or seed phrases. Previously committed keys must be replaced because removing them from the current code does not remove them from Git history.
- The application assumes you have an Ethereum client running at the configured address