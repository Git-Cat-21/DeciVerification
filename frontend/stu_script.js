const CONTRACT_ADDRESS = "0xaB38EA0848755438AFAAc5fE3778eD884cbe0f23";
const ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "_Name", "type": "string" },
            { "internalType": "string", "name": "_SRN", "type": "string" },
            { "internalType": "string", "name": "_Course", "type": "string" },
            { "internalType": "uint256", "name": "Semester", "type": "uint256" }
        ],
        "name": "registerStudent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_student", "type": "address" }],
        "name": "isStudentValid",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_SRN", "type": "string" },
            { "internalType": "string", "name": "_Course", "type": "string" },
            { "internalType": "string", "name": "_IPFSHash", "type": "string" }
        ],
        "name": "issueCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "string", "name": "_SRN", "type": "string" }],
        "name": "getCertificate",
        "outputs": [
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "string", "name": "", "type": "string" },
            { "internalType": "string", "name": "", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    
    // Add the new function for eligibility verification
    {
        "inputs": [
            { "internalType": "string", "name": "_name", "type": "string" },
            { "internalType": "string", "name": "_certificateIPFSHash", "type": "string" }
        ],
        "name": "verifyEligibility",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_student", "type": "address" }],
        "name": "isStudentEligible",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    }
];

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

// Verify student eligibility
async function verifyEligibility() {
    if (!contract) return alert("Please connect wallet first!");
    
    const name = document.getElementById("name").value;
    const ipfsHash = document.getElementById("ipfshash").value;
    
    if (!name || !ipfsHash) {
        return alert("Please enter your name and 12th pass certificate IPFS hash");
    }
    
    try {
        // First verify the IPFS hash exists on Pinata
        document.getElementById("eligibilityStatus").innerText = "Status: Checking IPFS hash...";
        
        const isValidIPFS = await verifyIPFSOnPinata(ipfsHash);
        
        if (!isValidIPFS) {
            document.getElementById("eligibilityStatus").innerText = "Status: Invalid IPFS Hash ❌";
            return alert("The certificate IPFS hash could not be verified on Pinata. Please ensure it has been uploaded correctly.");
        }
        
        // Call the smart contract to verify eligibility
        document.getElementById("eligibilityStatus").innerText = "Status: Verifying with blockchain...";
        const tx = await contract.verifyEligibility(name, ipfsHash);
        await tx.wait();
        
        document.getElementById("eligibilityStatus").innerText = "Status: Verified ✅";
        alert("Eligibility verified successfully! You can now register as a student.");
    } catch (error) {
        console.error("Error verifying eligibility:", error);
        document.getElementById("eligibilityStatus").innerText = "Status: Verification Failed ❌";
        alert("Eligibility verification failed: " + (error.message || "Unknown error"));
    }
}

// Register student
async function registerStudent() {
    if (!contract) return alert("Please connect wallet first!");
    
    const address = await signer.getAddress();
    
    // Check if student is eligible before registration
    try {
        const isEligible = await contract.isStudentEligible(address);
        if (!isEligible) {
            return alert("You must verify your eligibility with a 12th pass certificate first!");
        }
    } catch (error) {
        console.error("Error checking eligibility:", error);
        return alert("Error checking eligibility. Make sure you have verified your eligibility first.");
    }
    
    const name = document.getElementById("name").value;
    const srn = document.getElementById("srn").value;
    const course = document.getElementById("course").value;
    const semester = parseInt(document.getElementById("semester").value);
    
    if (!name || !srn || !course || isNaN(semester)) {
        return alert("Please fill in all fields with valid information!");
    }
    
    try {
        const tx = await contract.registerStudent(name, srn, course, semester);
        await tx.wait();
        alert("Student registered successfully!");
    } catch (error) {
        console.error(error);
        alert("Registration failed: " + (error.message || "Unknown error"));
    }
}

// Verify student
async function verifyStudent() {
    if (!contract) return alert("Please connect wallet first!");
    const address = document.getElementById("studentAddress").value.trim();
    try {
        const isRegistered = await contract.isStudentValid(address);
        document.getElementById("studentVerification").innerText = isRegistered ? "✅ Student is registered!" : "❌ Student is NOT registered.";
    } catch (error) {
        console.error(error);
        alert("Verification failed!");
    }
}

// Issue certificate
async function issueCertificate() {
    if (!contract) return alert("Please connect wallet first!");
    const srn = document.getElementById("certSrn").value;
    const course = document.getElementById("certCourse").value;
    const ipfsHash = document.getElementById("certIPFSHash").value;
    try {
        const tx = await contract.issueCertificate(srn, course, ipfsHash);
        await tx.wait();
        alert("Certificate issued successfully!");
    } catch (error) {
        console.error(error);
        alert("Certificate issuance failed!");
    }
}

// Get certificate
async function getCertificate() {
    if (!contract) return alert("Please connect wallet first!");
    const srn = document.getElementById("getCertSrn").value;
    try {
        const [certSrn, certCourse, certIPFSHash] = await contract.getCertificate(srn);
        document.getElementById("certificateDetails").innerText = `SRN: ${certSrn}, Course: ${certCourse}, IPFS Hash: ${certIPFSHash}`;
    } catch (error) {
        console.error(error);
        alert("No certificate found!");
    }
}

// Load wallet on page load
window.onload = loadWallet;