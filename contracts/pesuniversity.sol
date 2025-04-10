// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract pesuniversity {

    struct Student {
        string Name;
        string SRN;
        string Course;
        uint Semester;
        bool isRegistered;
    }

    mapping(address => Student) public Students;

    function registerStudent(string memory _Name, string memory _SRN, string memory _Course, uint256 Semester) public {
        Students[msg.sender].Name = _Name;
        Students[msg.sender].SRN = _SRN;
        Students[msg.sender].Semester = Semester;
        Students[msg.sender].Course = _Course;
        Students[msg.sender].isRegistered = true;
    }

    function isStudentValid(address _student) public view returns (bool) {
        return Students[_student].isRegistered;
    }

    struct CourseCertificate {
        string SRN;
        string Course;
        string IPFSHash;
    }

    mapping(string => CourseCertificate) public certificates;

    event CertificateIssued(string indexed srn, string course, string ipfsHash);

    function issueCertificate(string memory _srn, string memory _course, string memory _ipfsHash) public {
        require(bytes(Students[msg.sender].Name).length != 0, "Not a registered student");
        require(keccak256(abi.encodePacked(Students[msg.sender].SRN)) == keccak256(abi.encodePacked(_srn)), "SRN mismatch");
        require(keccak256(abi.encodePacked(Students[msg.sender].Course)) == keccak256(abi.encodePacked(_course)), "Course mismatch");
        require(bytes(certificates[_srn].IPFSHash).length == 0, "Certificate already exists");

        certificates[_srn] = CourseCertificate(_srn, _course, _ipfsHash);
        emit CertificateIssued(_srn, _course, _ipfsHash);
    }

    function getCertificate(string memory _srn) public view returns (string memory, string memory, string memory) {
        require(bytes(certificates[_srn].IPFSHash).length != 0, "No certificate found");
        return (certificates[_srn].SRN, certificates[_srn].Course, certificates[_srn].IPFSHash);
    }
}
