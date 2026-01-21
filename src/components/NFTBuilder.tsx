import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { useWallet } from '@/contexts/WalletContext';
import { useNFTContract } from '@/hooks/useNFTContract';
import { 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Image as ImageIcon,
  Palette,
  Type,
  FileText,
  Link as LinkIcon,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

interface NFTFormData {
  name: string;
  description: string;
  imageUrl: string;
  externalUrl: string;
}

export function NFTBuilder() {
  const { isConnected, isCorrectNetwork } = useWallet();
  const { isMinting, transactionHash, tokenId, error, success, mintNFT, resetMintState, addNFTToWallet, fetchAllNFTs, fetchMyNFTs } = useNFTContract();
  const [isAddingToWallet, setIsAddingToWallet] = useState(false);
  
  const [formData, setFormData] = useState<NFTFormData>({
    name: '',
    description: '',
    imageUrl: '',
    externalUrl: '',
  });

  const canMint = isConnected && isCorrectNetwork && !isMinting && formData.name.trim();

  const handleInputChange = (field: keyof NFTFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMint = () => {
    mintNFT(
      formData.name,
      formData.description,
      formData.imageUrl,
      formData.externalUrl
    );
  };

  const handleReset = () => {
    resetMintState();
    setFormData({ name: '', description: '', imageUrl: '', externalUrl: '' });
    // Refresh the galleries
    fetchAllNFTs();
    fetchMyNFTs();
  };

  const handleAddToWallet = async () => {
    if (tokenId === null) return;
    setIsAddingToWallet(true);
    try {
      const result = await addNFTToWallet(tokenId, formData.imageUrl);
      if (result) {
        toast.success(
          `NFT #${tokenId} info copied! In MetaMask: Settings > NFTs > Import NFT`,
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
      setIsAddingToWallet(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8 max-w-2xl w-full animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Palette className="w-8 h-8 text-primary" />
        </div>
      </div>

      <h2 className="text-2xl font-display font-bold text-center text-foreground mb-2">
        Build Your NFT
      </h2>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Upload your image and create a unique NFT on the blockchain
      </p>

      {!success ? (
        <div className="space-y-6">
          {/* Image Upload Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <ImageIcon className="w-4 h-4 text-primary" />
              NFT Image
            </label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => handleInputChange('imageUrl', url)}
              disabled={isMinting}
            />
          </div>

          {/* Name Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Type className="w-4 h-4 text-primary" />
              NFT Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="My Awesome NFT"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              disabled={isMinting}
              maxLength={50}
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <FileText className="w-4 h-4 text-primary" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell the story behind your NFT..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              disabled={isMinting}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {formData.description.length}/500
            </p>
          </div>

          {/* Advanced: Token URI (Collapsible) */}
          <details className="group">
            <summary className="flex items-center gap-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <LinkIcon className="w-4 h-4" />
              Advanced Options
            </summary>
            <div className="mt-3 pl-6">
              <label className="text-xs text-muted-foreground mb-2 block">
                Custom Token URI (Optional)
              </label>
              <input
                type="url"
                value={formData.externalUrl}
                onChange={(e) => handleInputChange('externalUrl', e.target.value)}
                placeholder="ipfs://... (leave empty to auto-generate)"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                disabled={isMinting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a custom IPFS metadata URL, or we'll generate one automatically
              </p>
            </div>
          </details>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-fade-in">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Minting Failed</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Pending Transaction */}
          {isMinting && transactionHash && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 animate-fade-in">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium text-primary">Transaction Pending...</p>
                  <p className="text-xs text-primary/80 mt-1">Waiting for confirmation</p>
                </div>
              </div>
              <a
                href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Track on Etherscan
              </a>
            </div>
          )}

          {/* Mint Button */}
          <Button
            variant="mint"
            size="xl"
            onClick={handleMint}
            disabled={!canMint}
            className="w-full"
          >
            {isMinting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Your NFT...
              </>
            ) : !isConnected ? (
              'Connect Wallet First'
            ) : !isCorrectNetwork ? (
              'Switch to Sepolia'
            ) : !formData.name.trim() ? (
              'Enter NFT Name'
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create NFT
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Success State */
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-xl bg-success/10 border border-success/20 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-xl font-bold text-success mb-2">NFT Created Successfully!</h3>
            {tokenId !== null && (
              <p className="text-success/80 mb-4">Token ID: #{tokenId}</p>
            )}
            
            {formData.imageUrl && (
              <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden mb-4 border border-success/30">
                <img src={formData.imageUrl} alt={formData.name} className="w-full h-full object-cover" />
              </div>
            )}
            
            <p className="font-medium text-foreground">{formData.name}</p>
            {formData.description && (
              <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
            )}
          </div>

          {transactionHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View Transaction on Etherscan
            </a>
          )}

          {/* Add to MetaMask Button */}
          <Button
            variant="default"
            size="xl"
            onClick={handleAddToWallet}
            disabled={isAddingToWallet || tokenId === null}
            className="w-full gap-2"
          >
            {isAddingToWallet ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adding to MetaMask...
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                Add NFT to MetaMask
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="xl"
            onClick={handleReset}
            className="w-full"
          >
            Create Another NFT
          </Button>
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground mt-6">
        Gas fees are paid in Sepolia testnet ETH • No real money required
      </p>
    </div>
  );
}
