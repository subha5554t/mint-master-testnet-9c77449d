import { useState, useCallback, useEffect } from 'react';
import '@/types/ethereum.d';

// Sepolia testnet chain ID
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isCorrectNetwork: false,
    isConnecting: false,
    error: null,
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Check current connection status
  const checkConnection = useCallback(async () => {
    if (!isMetaMaskInstalled || !window.ethereum?.request) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const chainIdDecimal = parseInt(chainId, 16);

      if (accounts.length > 0) {
        setState({
          isConnected: true,
          address: accounts[0],
          chainId: chainIdDecimal,
          isCorrectNetwork: chainIdDecimal === SEPOLIA_CHAIN_ID_DECIMAL,
          isConnecting: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }, [isMetaMaskInstalled]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled || !window.ethereum?.request) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to continue.',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const chainIdDecimal = parseInt(chainId, 16);

      setState({
        isConnected: true,
        address: accounts[0],
        chainId: chainIdDecimal,
        isCorrectNetwork: chainIdDecimal === SEPOLIA_CHAIN_ID_DECIMAL,
        isConnecting: false,
        error: null,
      });
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      let errorMessage = 'Failed to connect wallet';
      
      if (err.code === 4001) {
        errorMessage = 'Connection rejected. Please approve the connection in MetaMask.';
      } else if (err.code === -32002) {
        errorMessage = 'Connection request pending. Please check MetaMask.';
      }

      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [isMetaMaskInstalled]);

  // Switch to Sepolia network
  const switchToSepolia = useCallback(async () => {
    if (!isMetaMaskInstalled || !window.ethereum?.request) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      // If the chain hasn't been added, add it
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          setState(prev => ({
            ...prev,
            error: 'Failed to add Sepolia network. Please add it manually in MetaMask.',
          }));
        }
      } else {
        console.error('Error switching network:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to switch network. Please switch to Sepolia manually.',
        }));
      }
    }
  }, [isMetaMaskInstalled]);

  // Disconnect wallet (just clears local state - MetaMask doesn't have a disconnect method)
  const disconnectWallet = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      chainId: null,
      isCorrectNetwork: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (!isMetaMaskInstalled || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const chainIdDecimal = parseInt(chainId, 16);
      setState(prev => ({
        ...prev,
        chainId: chainIdDecimal,
        isCorrectNetwork: chainIdDecimal === SEPOLIA_CHAIN_ID_DECIMAL,
      }));
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    // Check initial connection
    checkConnection();

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [isMetaMaskInstalled, checkConnection, disconnectWallet]);

  return {
    ...state,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    formatAddress,
  };
}
