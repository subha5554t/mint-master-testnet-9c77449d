// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================
// Enhanced NFT Minting Smart Contract
// Deploy this contract using Remix IDE
// ============================================

// Import OpenZeppelin contracts
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyNFT
 * @dev An enhanced ERC-721 NFT contract with enumerable support
 * @notice This contract allows users to mint NFTs and query all tokens
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open Remix IDE (https://remix.ethereum.org)
 * 2. Create new file: contracts/NFT.sol
 * 3. Paste this code
 * 4. Compile with Solidity 0.8.20
 * 5. Deploy to Sepolia testnet via MetaMask
 * 6. Copy the deployed contract address
 * 7. Update CONTRACT_ADDRESS in src/hooks/useNFTContract.ts
 */
contract MyNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    // ============ State Variables ============
    
    // Token ID counter - starts at 0 and increments with each mint
    uint256 private _tokenIdCounter;

    // Mapping to store NFT metadata
    struct NFTMetadata {
        string uniqueId;      // UUID-style unique identifier
        string name;
        string description;
        string imageUrl;
        uint256 createdAt;
        address creator;
    }
    
    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(string => bool) public uniqueIdExists; // Prevent duplicate UUIDs

    // ============ Events ============
    
    event NFTMinted(
        address indexed minter,
        uint256 indexed tokenId,
        string uniqueId,
        string tokenURI,
        string name,
        string description,
        string imageUrl
    );

    // ============ Constructor ============
    
    /**
     * @dev Constructor sets the token name and symbol
     */
    constructor() ERC721("MyNFT Collection", "MNFT") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    // ============ Main Functions ============
    
    /**
     * @dev Mints a new NFT with custom metadata and UUID
     * @param _uniqueId The UUID-style unique identifier for the NFT
     * @param _tokenURI The metadata URI for the NFT
     * @param _name The name of the NFT
     * @param _description The description of the NFT
     * @param _imageUrl The image URL of the NFT
     * @return The token ID of the newly minted NFT
     */
    function mintNFT(
        string memory _uniqueId,
        string memory _tokenURI,
        string memory _name,
        string memory _description,
        string memory _imageUrl
    ) public returns (uint256) {
        require(bytes(_uniqueId).length > 0, "Unique ID cannot be empty");
        require(!uniqueIdExists[_uniqueId], "Unique ID already exists");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        // Mark unique ID as used
        uniqueIdExists[_uniqueId] = true;
        
        // Store metadata on-chain
        nftMetadata[tokenId] = NFTMetadata({
            uniqueId: _uniqueId,
            name: _name,
            description: _description,
            imageUrl: _imageUrl,
            createdAt: block.timestamp,
            creator: msg.sender
        });
        
        emit NFTMinted(msg.sender, tokenId, _uniqueId, _tokenURI, _name, _description, _imageUrl);
        
        return tokenId;
    }

    /**
     * @dev Simple mint function for backwards compatibility (generates UUID on-chain)
     */
    function mintNFTSimple(string memory _tokenURI) public returns (uint256) {
        string memory generatedId = _generateUniqueId(_tokenIdCounter);
        return mintNFT(generatedId, _tokenURI, "Untitled NFT", "No description", "");
    }
    
    /**
     * @dev Internal function to generate a unique ID based on token ID and block data
     */
    function _generateUniqueId(uint256 tokenId) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, tokenId));
        return _bytes32ToHexString(hash);
    }
    
    /**
     * @dev Converts bytes32 to a hex string (UUID-like format)
     */
    function _bytes32ToHexString(bytes32 data) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(36); // 32 hex chars + 4 dashes
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < 16; i++) {
            // Add dashes at positions 8, 12, 16, 20 (after 4, 6, 8, 10 bytes)
            if (i == 4 || i == 6 || i == 8 || i == 10) {
                result[resultIndex++] = "-";
            }
            result[resultIndex++] = hexChars[uint8(data[i] >> 4)];
            result[resultIndex++] = hexChars[uint8(data[i] & 0x0f)];
        }
        
        return string(result);
    }

    /**
     * @dev Returns the current token counter value
     */
    function getTokenCounter() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Returns NFT metadata by token ID
     */
    function getNFTMetadata(uint256 tokenId) public view returns (
        string memory uniqueId,
        string memory name,
        string memory description,
        string memory imageUrl,
        uint256 createdAt,
        address creator,
        string memory uri
    ) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        NFTMetadata memory metadata = nftMetadata[tokenId];
        return (
            metadata.uniqueId,
            metadata.name,
            metadata.description,
            metadata.imageUrl,
            metadata.createdAt,
            metadata.creator,
            tokenURI(tokenId)
        );
    }

    /**
     * @dev Returns all NFTs owned by an address
     */
    function getOwnedTokens(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        
        return tokens;
    }

    /**
     * @dev Returns all NFTs with metadata (paginated)
     */
    function getAllNFTs(uint256 offset, uint256 limit) public view returns (
        uint256[] memory tokenIds,
        string[] memory uniqueIds,
        string[] memory names,
        string[] memory descriptions,
        string[] memory imageUrls,
        address[] memory creators
    ) {
        uint256 total = _tokenIdCounter;
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end > offset ? end - offset : 0;
        
        tokenIds = new uint256[](count);
        uniqueIds = new string[](count);
        names = new string[](count);
        descriptions = new string[](count);
        imageUrls = new string[](count);
        creators = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = offset + i;
            tokenIds[i] = tokenId;
            uniqueIds[i] = nftMetadata[tokenId].uniqueId;
            names[i] = nftMetadata[tokenId].name;
            descriptions[i] = nftMetadata[tokenId].description;
            imageUrls[i] = nftMetadata[tokenId].imageUrl;
            creators[i] = nftMetadata[tokenId].creator;
        }
        
        return (tokenIds, uniqueIds, names, descriptions, imageUrls, creators);
    }

    // ============ Required Overrides ============

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}
