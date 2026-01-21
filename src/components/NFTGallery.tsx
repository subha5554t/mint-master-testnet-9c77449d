import { useEffect, useState } from 'react';
import { useNFTContract, NFTData } from '@/hooks/useNFTContract';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { 
  Grid3X3, 
  User, 
  Loader2, 
  Image as ImageIcon, 
  ExternalLink,
  RefreshCw,
  Layers,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'all' | 'mine';

export function NFTGallery() {
  const { isConnected, formatAddress } = useWallet();
  const { 
    allNFTs, 
    myNFTs, 
    isLoadingNFTs, 
    fetchAllNFTs, 
    fetchMyNFTs, 
    totalSupply,
    isContractDeployed,
    addNFTToWallet,
    contractAddress
  } = useNFTContract();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    if (isConnected && isContractDeployed) {
      fetchMyNFTs();
    }
  }, [isConnected, isContractDeployed, fetchMyNFTs]);

  const displayNFTs = activeTab === 'all' ? allNFTs : myNFTs;

  const handleRefresh = () => {
    fetchAllNFTs();
    if (isConnected) fetchMyNFTs();
    toast.success('Refreshing NFT gallery...');
  };

  if (!isContractDeployed) {
    return (
      <section id="gallery" className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Layers className="w-4 h-4" />
              NFT Gallery
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Explore the Collection
            </h2>
          </div>
          
          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Contract Not Deployed</h3>
            <p className="text-muted-foreground text-sm">
              Deploy the smart contract first to start viewing NFTs in the gallery.
              Follow the deployment guide in README.md.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Layers className="w-4 h-4" />
            NFT Gallery
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Explore the Collection
          </h2>
          <p className="text-muted-foreground">
            {totalSupply} NFT{totalSupply !== 1 ? 's' : ''} minted so far
          </p>
        </div>

        {/* Tabs and Refresh */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 max-w-4xl mx-auto">
          <div className="flex gap-2 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              All NFTs ({allNFTs.length})
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              disabled={!isConnected}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'mine'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <User className="w-4 h-4" />
              My NFTs ({myNFTs.length})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingNFTs}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingNFTs ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {isLoadingNFTs && displayNFTs.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoadingNFTs && displayNFTs.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {activeTab === 'mine' ? 'No NFTs Yet' : 'No NFTs Minted'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {activeTab === 'mine' 
                ? 'Mint your first NFT to see it here!' 
                : 'Be the first to mint an NFT in this collection!'}
            </p>
          </div>
        )}

        {/* NFT Grid */}
        {displayNFTs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {displayNFTs.map((nft) => (
              <NFTCard 
                key={nft.tokenId} 
                nft={nft} 
                formatAddress={formatAddress}
                contractAddress={contractAddress}
                addNFTToWallet={addNFTToWallet}
                isOwned={activeTab === 'mine'}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface NFTCardProps {
  nft: NFTData;
  formatAddress: (addr: string) => string;
  contractAddress: string;
  addNFTToWallet: (tokenId: number, imageUrl?: string) => Promise<boolean>;
  isOwned: boolean;
}

function NFTCard({ nft, formatAddress, contractAddress, addNFTToWallet, isOwned }: NFTCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [wasAdded, setWasAdded] = useState(false);

  const handleAddToWallet = async () => {
    setIsAdding(true);
    try {
      const result = await addNFTToWallet(nft.tokenId, nft.imageUrl);
      if (result) {
        setWasAdded(true);
        toast.success(
          `NFT #${nft.tokenId} info copied! In MetaMask: Settings > NFTs > Import NFT`, 
          { duration: 5000 }
        );
      }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4001) {
        toast.error('Request cancelled by user');
      } else {
        toast.error('Failed to add NFT. Try importing manually in MetaMask.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
      {/* Image */}
      <div className="aspect-square bg-secondary relative overflow-hidden">
        {nft.imageUrl && !imageError ? (
          <img
            src={nft.imageUrl}
            alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <ImageIcon className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
        )}
        
        {/* Token ID Badge */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium">
          #{nft.tokenId}
        </div>

        {/* Owned Badge */}
        {isOwned && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-primary/90 backdrop-blur-sm text-xs font-medium text-primary-foreground">
            Owned
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate mb-1">
          {nft.name || 'Untitled'}
        </h3>
        
        {nft.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {nft.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {formatAddress(nft.creator)}
          </span>
          
          <a
            href={`https://sepolia.etherscan.io/token/${contractAddress}?a=${nft.tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            View
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Add to Wallet Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddToWallet}
          disabled={isAdding || wasAdded}
          className="w-full gap-2"
        >
          {wasAdded ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Added to MetaMask
            </>
          ) : isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Add to MetaMask
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
