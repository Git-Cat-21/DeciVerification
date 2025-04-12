// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract universityVal {
    struct University {
        string name;
        string ipfsHash; // IPFS Proof (Accreditation Documents)
        bool isActive;
    }

    address public admin;
    string[] public registeredIds; // Store university regIds
    mapping(string => University) public universities; // regId -> University

    constructor() {
        admin = msg.sender;
    }

    function registerUniversity(string memory _name, string memory _regId, string memory _ipfsHash) public {
        require(msg.sender == admin, "Only admin can register");
        require(bytes(universities[_regId].name).length == 0, "University already exists");

        // Prevent duplicate IPFS hashes
        for (uint i = 0; i < registeredIds.length; i++) {
            require(keccak256(bytes(universities[registeredIds[i]].ipfsHash)) != keccak256(bytes(_ipfsHash)), "IPFS hash already used");
    }

    universities[_regId] = University(_name, _ipfsHash, true);
    registeredIds.push(_regId);
}


    function verifyUniversity(string memory _regId) public view returns (string memory, string memory, bool) {
        require(universities[_regId].isActive, "University not found or removed");
        University memory uni = universities[_regId];
        return (uni.name, uni.ipfsHash, uni.isActive);
    }

    function removeUniversity(string memory _regId) public {
        require(msg.sender == admin, "Only admin can remove");
        require(universities[_regId].isActive, "University already removed");

        universities[_regId].isActive = false;

        for (uint i = 0; i < registeredIds.length; i++) {
            if (keccak256(bytes(registeredIds[i])) == keccak256(bytes(_regId))) {
                registeredIds[i] = registeredIds[registeredIds.length - 1]; // Move last element to deleted index
                registeredIds.pop(); // Remove last element
                break;
            }
    }
    }

    function getAllUniversities() public view returns (string[] memory) {
        return registeredIds;
    }
}
