const CONTRACT_ADDRESS = "0x38E5311309d1319eE44500F68d6e1e06DC6C07b4";
const ABI = [
    
    {
        "inputs": [
            { "internalType": "string", "name": "_name", "type": "string" },
            { "internalType": "string", "name": "_regId", "type": "string" },
            { "internalType": "string", "name": "_ipfsHash", "type": "string" }
        ],
        "name": "registerUniversity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "string", "name": "_regId", "type": "string" }],
        "name": "verifyUniversity",
        "outputs": [
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "bool", "name": "", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "string", "name": "_regId", "type": "string" }],
        "name": "removeUniversity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllUniversities",
        "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }],
        "stateMutability": "view",
        "type": "function"
    }
]    // Add the new function for eligibility verification

let provider, signer, contract;

// Pinata Configuration
const PINATA_API_KEY = "597fb26f3a710e516bdc"; // Replace with your actual Pinata API key
const PINATA_SECRET_API_KEY = "2248f2b664531861d6b4bfd045807caa62cab6c1e56a117e09bf2a2f08d833b7"; // Replace with your actual Pinata secret key
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/files";

// Connect wallet and store address in localStorage
async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            const address = await signer.getAddress();
            document.getElementById("walletAddress").innerText = address;

            // Store address in localStorage
            localStorage.setItem("walletAddress", address);

            contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert("Failed to connect wallet. Please try again.");
        }
    } else {
        alert("Please install MetaMask!");
    }
}

// Load wallet from localStorage
async function loadWallet() {
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
        document.getElementById("walletAddress").innerText = storedAddress;
        if (window.ethereum) {
            try {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                const currentAddress = await signer.getAddress();
                if (currentAddress.toLowerCase() === storedAddress.toLowerCase()) {
                    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
                } else {
                    localStorage.removeItem("walletAddress");
                    document.getElementById("walletAddress").innerText = "Not connected";
                }
            } catch (error) {
                console.error("Error loading wallet:", error);
                localStorage.removeItem("walletAddress");
                document.getElementById("walletAddress").innerText = "Not connected";
            }
        }
    }
}
// Function to check eligibility status
async function checkEligibilityStatus(address) {
    try {
        if (!contract) return;
        const isEligible = await contract.isStudentEligible(address);
        if (isEligible) {
            document.getElementById("eligibilityStatus").innerText = "Status: Verified ✅";
        }
    } catch (error) {
        console.error("Error checking eligibility status:", error);
    }
}

// Verify IPFS hash with Pinata
async function verifyIPFSOnPinata(ipfsHash) {
    try {
        // First, try simple gateway request
        const gatewayUrl = `${PINATA_GATEWAY}${ipfsHash}`;
        
        try {
            const response = await fetch(gatewayUrl, { method: 'HEAD' });
            if (response.ok) {
                console.log("IPFS hash verified via gateway");
                return true;
            }
        } catch (gatewayError) {
            console.warn("Gateway verification failed, trying API:", gatewayError);
        }
        
        // If gateway doesn't work, try Pinata API (requires authentication)
        const apiUrl = "https://api.pinata.cloud/data/pinList";
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`Pinata API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if the IPFS hash exists in Pinata pins
        const pinFound = data.rows.some(pin => pin.ipfs_pin_hash === ipfsHash);
        
        return pinFound;
    } catch (error) {
        console.error("Error verifying IPFS hash on Pinata:", error);
        return false;
    }
}

async function registerUniversity() {
    if (!contract) return alert("Please connect wallet first!");
    const name = document.getElementById("uniName").value;
    const regId = document.getElementById("uniRegId").value;
    const ipfsHash = document.getElementById("uniIPFSHash").value;
    try {
        const tx = await contract.registerUniversity(name, regId, ipfsHash);
        await tx.wait();
        alert("University registered successfully!");
    } catch (error) {
        console.error(error);
        alert("University registration failed!");
    }
}

async function verifyUniversity() {
    if (!contract) return alert("Please connect wallet first!");

    const regIdInput = document.getElementById("verifyRegId");
    if (!regIdInput) {
        console.error("Error: Input field with ID 'verifyRegId' not found.");
        alert("Verification failed: Input field missing!");
        return;
    }

    const regId = regIdInput.value.trim();
    if (!regId) {
        alert("Please enter a valid University Registration ID.");
        return;
    }

    try {
        const [name, ipfsHash, isActive] = await contract.verifyUniversity(regId);

        if (!isActive) {
            alert("Verification failed: University is inactive or removed.");
            document.getElementById("universityDetails").innerText = "";
            return;
        }

        const isIPFSValid = await verifyIPFSOnPinata(ipfsHash);
        if (!isIPFSValid) {
            alert("IPFS hash is not found on Pinata!");
            document.getElementById("universityDetails").innerText = "";
            return;
        }

        document.getElementById("universityDetails").innerText =
            `✅ Verified University: ${name}, IPFS Hash: ${ipfsHash}`;
    } catch (error) {
        console.error(error);
        alert("Verification failed: University not found!");
        document.getElementById("universityDetails").innerText = "";
    }
}


async function removeUniversity() {
    if (!contract) return alert("Please connect wallet first!");
    const regId = document.getElementById("removeUniRegId").value;
    try {
        const tx = await contract.removeUniversity(regId);
        await tx.wait();
        alert("University removed successfully!");
    } catch (error) {
        console.error(error);
        alert("University removal failed!");
    }
}

async function getAllUniversities() {
    if (!contract) return alert("Please connect wallet first!");
    try {
        const universityIds = await contract.getAllUniversities();
        let activeUniversities = [];

        for (const id of universityIds) {
            const [name, ipfsHash, isActive] = await contract.verifyUniversity(id).catch(() => [null, null, false]);
            if (isActive) activeUniversities.push(`${name} (${id})`);
        }

        document.getElementById("allUniversities").innerText = activeUniversities.length
            ? `Registered Universities: ${activeUniversities.join(", ")}`
            : "No active universities registered.";
    } catch (error) {
        console.error(error);
        alert("Failed to fetch universities!");
    }
}

// Load wallet on page load
window.onload = loadWallet;