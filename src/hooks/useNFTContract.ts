import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';
import '@/types/ethereum.d';

// Your deployed contract address on Sepolia
const CONTRACT_ADDRESS = '0x3D5b84b63c7F70717A8fBeFB7A6f4771db1f01cd';

// Extended Contract ABI including ERC721Enumerable standard methods
const CONTRACT_ABI = [
  // Mint functions
  {
    "inputs": [
      { "internalType": "string", "name": "_tokenURI", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "string", "name": "_imageUrl", "type": "string" }
    ],
    "name": "mintNFT",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Custom getter functions
  {
    "inputs": [],
    "name": "getTokenCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "getNFTMetadata",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "imageUrl", "type": "string" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "string", "name": "uri", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "getOwnedTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "offset", "type": "uint256" },
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getAllNFTs",
    "outputs": [
      { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" },
      { "internalType": "string[]", "name": "names", "type": "string[]" },
      { "internalType": "string[]", "name": "descriptions", "type": "string[]" },
      { "internalType": "string[]", "name": "imageUrls", "type": "string[]" },
      { "internalType": "address[]", "name": "creators", "type": "address[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // ERC721 Standard methods
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "ownerOf",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
    "name": "tokenURI",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // ERC721Enumerable methods (fallback)
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }],
    "name": "tokenByIndex",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  // ERC721 metadata
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  // Metadata mapping (public)
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "nftMetadata",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "imageUrl", "type": "string" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
      { "internalType": "address", "name": "creator", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export interface NFTData {
  tokenId: number;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: number;
  creator: string;
  tokenURI: string;
  owner?: string;
}

interface MintState {
  isMinting: boolean;
  transactionHash: string | null;
  tokenId: number | null;
  error: string | null;
  success: boolean;
}

export function useNFTContract() {
  const [mintState, setMintState] = useState<MintState>({
    isMinting: false,
    transactionHash: null,
    tokenId: null,
    error: null,
    success: false,
  });
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [allNFTs, setAllNFTs] = useState<NFTData[]>([]);
  const [myNFTs, setMyNFTs] = useState<NFTData[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  const isContractDeployed = CONTRACT_ADDRESS.length === 42 && CONTRACT_ADDRESS.startsWith('0x');

  // Fetch total supply using multiple fallback methods
  const fetchTotalSupply = useCallback(async () => {
    if (!window.ethereum || !isContractDeployed) return;

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      let count = 0;
      try {
        count = Number(await contract.getTokenCounter());
      } catch {
        try {
          count = Number(await contract.totalSupply());
        } catch {
          logger.log('Could not fetch token count');
        }
      }
      setTotalSupply(count);
    } catch (error) {
      logger.error('Error fetching total supply:', error);
    }
  }, [isContractDeployed]);

  // Fetch all NFTs with multiple fallback methods
  const fetchAllNFTs = useCallback(async () => {
    if (!window.ethereum || !isContractDeployed) return;

    setIsLoadingNFTs(true);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      let total = 0;
      try {
        total = Number(await contract.getTokenCounter());
      } catch {
        try {
          total = Number(await contract.totalSupply());
        } catch {
          logger.log('Could not get total supply');
        }
      }
      
      if (total === 0) {
        setAllNFTs([]);
        setTotalSupply(0);
        setIsLoadingNFTs(false);
        return;
      }

      setTotalSupply(total);
      const nfts: NFTData[] = [];

      try {
        const result = await contract.getAllNFTs(0, Math.min(total, 50));
        for (let i = 0; i < result.tokenIds.length; i++) {
          nfts.push({
            tokenId: Number(result.tokenIds[i]),
            name: result.names[i] || 'Untitled',
            description: result.descriptions[i] || '',
            imageUrl: result.imageUrls[i] || '',
            createdAt: 0,
            creator: result.creators[i],
            tokenURI: '',
          });
        }
      } catch {
        logger.log('Using fallback individual fetch method');
        for (let i = 0; i < Math.min(total, 50); i++) {
          try {
            let metadata;
            try {
              metadata = await contract.getNFTMetadata(i);
              nfts.push({
                tokenId: i,
                name: metadata.name || 'Untitled',
                description: metadata.description || '',
                imageUrl: metadata.imageUrl || '',
                createdAt: Number(metadata.createdAt || 0),
                creator: metadata.creator,
                tokenURI: metadata.uri || '',
              });
            } catch {
              try {
                metadata = await contract.nftMetadata(i);
                const owner = await contract.ownerOf(i);
                nfts.push({
                  tokenId: i,
                  name: metadata.name || 'Untitled',
                  description: metadata.description || '',
                  imageUrl: metadata.imageUrl || '',
                  createdAt: Number(metadata.createdAt || 0),
                  creator: metadata.creator || owner,
                  tokenURI: '',
                });
              } catch {
                try {
                  const owner = await contract.ownerOf(i);
                  const uri = await contract.tokenURI(i);
                  nfts.push({
                    tokenId: i,
                    name: `NFT #${i}`,
                    description: '',
                    imageUrl: '',
                    createdAt: 0,
                    creator: owner,
                    tokenURI: uri,
                  });
                } catch {
                  logger.log(`Token ${i} may not exist`);
                }
              }
            }
          } catch (e) {
            logger.log(`Error fetching token ${i}:`, e);
          }
        }
      }

      setAllNFTs(nfts.reverse());
    } catch (error) {
      logger.error('Error fetching NFTs:', error);
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [isContractDeployed]);

  // Fetch user's NFTs with fallback methods
  const fetchMyNFTs = useCallback(async () => {
    if (!window.ethereum || !isContractDeployed) return;

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const nfts: NFTData[] = [];

      try {
        const tokenIds = await contract.getOwnedTokens(address);
        for (const tokenId of tokenIds) {
          try {
            const metadata = await contract.getNFTMetadata(tokenId);
            nfts.push({
              tokenId: Number(tokenId),
              name: metadata.name || 'Untitled',
              description: metadata.description || '',
              imageUrl: metadata.imageUrl || '',
              createdAt: Number(metadata.createdAt),
              creator: metadata.creator,
              tokenURI: metadata.uri,
              owner: address,
            });
          } catch {
            try {
              const metadata = await contract.nftMetadata(tokenId);
              nfts.push({
                tokenId: Number(tokenId),
                name: metadata.name || 'Untitled',
                description: metadata.description || '',
                imageUrl: metadata.imageUrl || '',
                createdAt: Number(metadata.createdAt || 0),
                creator: metadata.creator,
                tokenURI: '',
                owner: address,
              });
            } catch (e) {
              logger.error('Error fetching metadata for token', tokenId, e);
            }
          }
        }
      } catch {
        logger.log('Using ERC721Enumerable fallback for my NFTs');
        try {
          const balance = Number(await contract.balanceOf(address));
          for (let i = 0; i < balance; i++) {
            try {
              const tokenId = await contract.tokenOfOwnerByIndex(address, i);
              try {
                const metadata = await contract.nftMetadata(tokenId);
                nfts.push({
                  tokenId: Number(tokenId),
                  name: metadata.name || 'Untitled',
                  description: metadata.description || '',
                  imageUrl: metadata.imageUrl || '',
                  createdAt: Number(metadata.createdAt || 0),
                  creator: metadata.creator,
                  tokenURI: '',
                  owner: address,
                });
              } catch {
                const uri = await contract.tokenURI(tokenId);
                nfts.push({
                  tokenId: Number(tokenId),
                  name: `NFT #${Number(tokenId)}`,
                  description: '',
                  imageUrl: '',
                  createdAt: 0,
                  creator: address,
                  tokenURI: uri,
                  owner: address,
                });
              }
            } catch (e) {
              logger.error('Error fetching token at index', i, e);
            }
          }
        } catch (e) {
          logger.error('ERC721Enumerable fallback failed:', e);
        }
      }

      setMyNFTs(nfts.reverse());
    } catch (error) {
      logger.error('Error fetching my NFTs:', error);
    }
  }, [isContractDeployed]);

  // Mint NFT with custom metadata
  const mintNFT = useCallback(async (
    name: string,
    description: string,
    imageUrl: string,
    tokenURI: string = ''
  ) => {
    if (!window.ethereum) {
      setMintState(prev => ({ ...prev, error: 'MetaMask is not installed' }));
      return;
    }

    if (!isContractDeployed) {
      setMintState(prev => ({
        ...prev,
        error: 'Contract not deployed yet. Please follow the deployment guide.',
      }));
      return;
    }

    setMintState({
      isMinting: true,
      transactionHash: null,
      tokenId: null,
      error: null,
      success: false,
    });

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const finalTokenURI = tokenURI || `data:application/json;base64,${btoa(JSON.stringify({
        name,
        description,
        image: imageUrl,
        attributes: []
      }))}`;

      logger.log('Minting NFT with params:', { finalTokenURI, name, description, imageUrl });
      const tx = await contract.mintNFT(finalTokenURI, name, description, imageUrl);
      
      setMintState(prev => ({ ...prev, transactionHash: tx.hash }));
      logger.log('Transaction submitted:', tx.hash);

      const receipt = await tx.wait();
      logger.log('Transaction confirmed:', receipt);
      
      let tokenId: number | null = null;
      for (const log of receipt.logs) {
        try {
          if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            tokenId = parseInt(log.topics[3], 16);
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      setMintState({
        isMinting: false,
        transactionHash: tx.hash,
        tokenId,
        error: null,
        success: true,
      });

      // Refresh immediately and after delays to ensure data is captured
      fetchTotalSupply();
      fetchAllNFTs();
      fetchMyNFTs();
      
      // Also refresh after a delay in case of indexing delays
      setTimeout(() => {
        fetchTotalSupply();
        fetchAllNFTs();
        fetchMyNFTs();
      }, 3000);

    } catch (error: unknown) {
      logger.error('Mint error:', error);
      let errorMessage = 'Failed to mint NFT';
      const err = error as { code?: number | string; message?: string };

      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (err.code === -32603) {
        errorMessage = 'Internal JSON-RPC error. Check if you have enough testnet ETH.';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds. Get testnet ETH from a Sepolia faucet.';
      } else if (err.message) {
        errorMessage = err.message.slice(0, 100);
      }

      setMintState({
        isMinting: false,
        transactionHash: null,
        tokenId: null,
        error: errorMessage,
        success: false,
      });
    }
  }, [isContractDeployed, fetchAllNFTs, fetchMyNFTs]);

  // Add NFT to MetaMask wallet - with fallback for unsupported wallets
  const addNFTToWallet = useCallback(async (tokenId: number, imageUrl?: string): Promise<boolean> => {
    if (!window.ethereum?.request) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Try the wallet_watchAsset method for ERC721
      // Note: This is supported in MetaMask Mobile and newer desktop versions
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: CONTRACT_ADDRESS,
            tokenId: tokenId.toString(),
          },
        },
      }) as boolean;

      return wasAdded;
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      
      // Error code -32602 or -32603 means the method is not supported
      if (err.code === -32602 || err.code === -32603 || err.message?.includes('not supported')) {
        // Fallback: Open MetaMask NFT import guide
        logger.log('wallet_watchAsset for ERC721 not supported, using manual method');
        
        // Copy contract info to clipboard for manual import
        const importInfo = `Contract: ${CONTRACT_ADDRESS}\nToken ID: ${tokenId}`;
        await navigator.clipboard.writeText(importInfo);
        
        // Return true to indicate we've handled it (user needs to manually import)
        return true;
      }
      
      logger.error('Error adding NFT to wallet:', error);
      throw error;
    }
  }, []);

  const resetMintState = useCallback(() => {
    setMintState({
      isMinting: false,
      transactionHash: null,
      tokenId: null,
      error: null,
      success: false,
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (isContractDeployed) {
      fetchTotalSupply();
      fetchAllNFTs();
    }
  }, [isContractDeployed, fetchTotalSupply, fetchAllNFTs]);

  return {
    ...mintState,
    mintNFT,
    resetMintState,
    contractAddress: CONTRACT_ADDRESS,
    isContractDeployed,
    totalSupply,
    allNFTs,
    myNFTs,
    isLoadingNFTs,
    fetchAllNFTs,
    fetchMyNFTs,
    fetchTotalSupply,
    addNFTToWallet,
  };
}
