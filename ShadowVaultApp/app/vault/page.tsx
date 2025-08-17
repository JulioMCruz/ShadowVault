"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Download,
  Upload,
  Settings,
  Sparkles,
  ArrowLeft,
  Filter,
  Star,
  AlertTriangle,
  Globe,
  Zap,
  Clock,
  Database,
  Info,
  Heart,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useAccount, useSignMessage } from "wagmi"
import {
  deriveEncryptionKeyFromSignature,
  getVaultItemsFromEnvio,
  retrieveAndDecryptVaultItem
} from "@/lib/encryption"

import { Skeleton } from "@/components/ui/skeleton"
import { VaultStorageService, initializeSampleData, type VaultEntry } from "@/lib/vault-storage"
import { toast } from "@/hooks/use-toast"

export default function VaultPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [passwords, setPasswords] = useState<VaultEntry[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load vault entries from localStorage on component mount
  useEffect(() => {
    console.log('[Vault] Loading vault entries from localStorage...')
    
    // Debug: Check what's in localStorage
    const rawData = localStorage.getItem('shadowvault_entries')
    console.log('[Vault] Raw localStorage data:', rawData)
    
    // initializeSampleData() // Initialize sample data if empty - disabled for testing
    const entries = VaultStorageService.getEntries()
    setPasswords(entries)
    console.log('[Vault] Loaded', entries.length, 'entries:', entries)
    if (entries.length === 0) {
      console.log('[Vault] No entries found - vault is empty')
    }
  }, [refreshTrigger])

  // Refresh vault data
  const refreshVault = () => {
    setRefreshTrigger(prev => prev + 1)
    toast({
      title: "Vault Refreshed",
      description: "Vault data reloaded from localStorage"
    })
  }

  const clearVault = () => {
    if (confirm('Clear all vault data? This will delete all stored passwords.')) {
      console.log('[Vault] Clearing all localStorage data...')
      
      // Clear using service
      VaultStorageService.clearAll()
      
      // Also manually clear in case there's cached data
      localStorage.removeItem('shadowvault_entries')
      localStorage.removeItem('shadowvault_stats')
      
      // Clear component state
      setPasswords([])
      
      console.log('[Vault] All data cleared')
      setRefreshTrigger(prev => prev + 1)
      toast({
        title: "Vault Cleared",
        description: "All vault data has been deleted"
      })
    }
  }

  const debugStorage = () => {
    console.group('🔍 LocalStorage Debug')
    console.log('Raw localStorage data:')
    console.log('shadowvault_entries:', localStorage.getItem('shadowvault_entries'))
    console.log('shadowvault_stats:', localStorage.getItem('shadowvault_stats'))
    
    const entries = VaultStorageService.getEntries()
    console.log('Parsed entries:', entries)
    console.log('Current passwords state:', passwords)
    
    // Check if any entries look like sample data
    const sampleDataEntries = entries.filter(entry => 
      entry.name === 'Netflix' || entry.name === 'GitHub' || entry.name === 'LinkedIn'
    )
    console.log('Sample data entries found:', sampleDataEntries.length)
    
    console.groupEnd()
    
    toast({
      title: "Debug Info Logged",
      description: "Check console for localStorage details"
    })
  }

  const initializeSampleForTesting = () => {
    if (confirm('Initialize sample data for testing?')) {
      initializeSampleData()
      setRefreshTrigger(prev => prev + 1)
      toast({
        title: "Sample Data Added",
        description: "Test data has been initialized"
      })
    }
  }

  const networkColors = {
    ethereum: "bg-blue-100 text-blue-800",
    polygon: "bg-purple-100 text-purple-800",
    zircuit: "bg-green-100 text-green-800",
    arbitrum: "bg-orange-100 text-orange-800",
    optimism: "bg-red-100 text-red-800",
  };

  const categoryIcons = {
    social: "👥",
    work: "💼",
    finance: "💰",
    entertainment: "🎬",
    shopping: "🛒",
  };

  const filteredPasswords = passwords.filter(
    (password) =>
      password.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      password.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      password.url.toLowerCase().includes(searchQuery.toLowerCase()),
  )


  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyPassword = async (password: VaultEntry) => {
    setCopyingId(password.id)
    try {
      // Update last accessed time
      VaultStorageService.updateLastAccessed(password.id)
      
      // In a real implementation, this would decrypt from Walrus
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await navigator.clipboard.writeText(password.password)
      
      toast({
        title: "Password Copied",
        description: `${password.name} password copied to clipboard`
      })
      
      // Refresh to show updated "last accessed" time
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy password to clipboard",
        variant: "destructive"
      })
    } finally {
      setCopyingId(null)
    }
  }

  const toggleFavorite = (id: string) => {
    VaultStorageService.toggleFavorite(id)
    setRefreshTrigger(prev => prev + 1)
    toast({
      title: "Updated",
      description: "Favorite status updated"
    })
  }

  const deleteEntry = (id: string, name: string) => {
    if (confirm(`Delete password for ${name}?`)) {
      VaultStorageService.deleteEntry(id)
      setRefreshTrigger(prev => prev + 1)
      toast({
        title: "Deleted",
        description: `${name} password deleted`
      })
    }
  }

  const logWalrusInfo = (password: VaultEntry) => {
    console.group(`🐋 Walrus Info for ${password.name}`)
    
    // Log the full entry data
    console.log('📄 Full Entry Data:', password)
    
    // Log Walrus metadata if available
    if (password.walrusMetadata) {
      console.log('🗄️ Walrus Metadata:', password.walrusMetadata)
      console.log('📋 Blob ID:', password.walrusMetadata.blobId)
      console.log('🔗 IPFS CID:', password.walrusMetadata.ipfsCid)
      console.log('⏰ Uploaded At:', password.walrusMetadata.uploadedAt)
      console.log('🔐 Encryption Key:', password.walrusMetadata.encryptionKey ? 'Present' : 'Not Available')
    } else {
      console.log('⚠️ No Walrus metadata found - entry may not be uploaded to Walrus yet')
      
      // Simulate what the Walrus JSON would look like
      const mockWalrusData = {
        blobId: `walrus_${password.id}_${Date.now()}`,
        ipfsCid: `Qm${Math.random().toString(36).substr(2, 44)}`,
        storageEpoch: Math.floor(Date.now() / 1000),
        encryptedPayload: {
          name: password.name,
          username: password.username,
          password: "[ENCRYPTED]",
          url: password.url,
          metadata: {
            category: password.category,
            network: password.network,
            aiStrength: password.aiStrength
          }
        },
        uploadedAt: new Date().toISOString()
      }
      console.log('🔮 Mock Walrus Data Structure:', mockWalrusData)
    }
    
    // Log storage stats
    const stats = VaultStorageService.getStats()
    console.log('📊 Storage Stats:', stats)
    
    console.groupEnd()
    
    toast({
      title: "Walrus Info Logged",
      description: `Check console for ${password.name} details`
    })
  }


  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return "text-green-600"
    if (strength >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getStrengthLabel = (strength: number) => {
    if (strength >= 80) return "Strong"
    if (strength >= 60) return "Medium"
    return "Weak"
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Password Vault</h1>
                <p className="text-sm text-muted-foreground">{filteredPasswords.length} passwords secured</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refreshVault}>
                <Database className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={clearVault} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              <Button variant="outline" onClick={debugStorage}>
                <Info className="w-4 h-4 mr-2" />
                Debug
              </Button>
              <Link href="/vault/add">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Password
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search passwords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Password Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-1/2" />
              </CardContent>
            </Card>
          ))}
          {error && <p className="text-red-500 col-span-full">Error fetching data, showing mock data instead: {error.message}</p>}
          {filteredPasswords.map((password) => (
            <Card key={password.id} className="relative hover:shadow-lg transition-shadow">
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite(password.id)}
                  className="h-8 w-8 p-0"
                >
                  <Heart 
                    className={`w-4 h-4 ${password.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteEntry(password.id, password.name)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <CardHeader className="pb-3 pr-20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[password.category]}</span>
                    {password.name}
                  </CardTitle>
                  {password.needsUpdate && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={networkColors[password.network]}>
                    <Globe className="w-3 h-3 mr-1" />
                    {password.network}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {password.url}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Username */}
                <div>
                  <label className="text-xs text-muted-foreground">Username</label>
                  <p className="text-sm font-medium truncate">{password.username}</p>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs text-muted-foreground">Password</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono flex-1 truncate">
                      {showPasswords[password.id] ? password.password : "••••••••••••"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => togglePasswordVisibility(password.id)}>
                      {showPasswords[password.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* AI Strength Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      AI Strength Score
                    </label>
                    <span className={`text-sm font-bold ${getStrengthColor(password.aiStrength)}`}>
                      {password.aiStrength}/100 ({getStrengthLabel(password.aiStrength)})
                    </span>
                  </div>
                  <Progress value={password.aiStrength} className="h-2" />
                  {password.needsUpdate && (
                    <p className="text-xs text-orange-600 mt-1">AI recommends updating this password</p>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {password.lastAccessed}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => copyPassword(password)}
                      disabled={copyingId === password.id}
                      className="bg-secondary hover:bg-secondary/90 flex-1"
                    >
                      {copyingId === password.id ? (
                        <>
                          <Globe className="w-3 h-3 mr-1 animate-spin" />
                          Retrieving...
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => logWalrusInfo(password)}
                      className="flex-1"
                    >
                      <Info className="w-3 h-3 mr-1" />
                      Walrus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredPasswords.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No passwords found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search terms" : "Start by adding your first password"}
            </p>
            <Link href="/vault/add">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Password
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// Add this function to demonstrate decryption
async function loadAndDecryptVaultItems(userAddress: string) {
  console.log('[Vault] Starting to load and decrypt vault items...')

  try {
    // Step 1: Get vault items from Envio (ZircuitObject[])
    const zircuitObjects = await getVaultItemsFromEnvio(userAddress)
    console.log('[Vault] Retrieved', zircuitObjects.length, 'vault items from Envio')

    // Step 2: For each item, derive encryption key and decrypt
    const decryptedItems = []

    for (const zircuitObject of zircuitObjects) {
      console.log('[Vault] Processing item:', zircuitObject.ipfsCid)

      // Step 2.1: Derive encryption key from wallet signature
      const message = "Generate encryption key for ShadowVault session"
      // Note: In real implementation, you'd need to get the signature again
      // For demo, we'll use a mock signature
      const mockSignature = "0x" + "a".repeat(130) // Mock signature

      const { rawKey } = await deriveEncryptionKeyFromSignature(mockSignature, userAddress)
      console.log('[Vault] Encryption key derived for item')

      // Step 2.2: Retrieve and decrypt VaultItemCipher from IPFS
      const { vaultItem, decryptedPassword } = await retrieveAndDecryptVaultItem(
        zircuitObject.ipfsCid,
        rawKey
      )

      console.log('[Vault] Item decrypted successfully:', {
        site: vaultItem.site,
        username: vaultItem.username,
        password: decryptedPassword.slice(0, 8) + '...', // Only show first 8 chars for security
        category: vaultItem.meta.category,
        network: vaultItem.meta.network
      })

      decryptedItems.push({
        ...vaultItem,
        decryptedPassword,
        zircuitObject
      })
    }

    console.log('[Vault] All items decrypted successfully')
    return decryptedItems

  } catch (error) {
    console.error('[Vault] Error loading and decrypting vault items:', error)
    throw error
  }
}

// Example usage in a component:
function VaultDecryptionDemo() {
  const { address } = useAccount()
  const [decryptedItems, setDecryptedItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleLoadVault = async () => {
    if (!address) {
      console.error('No wallet address available')
      return
    }

    setIsLoading(true)
    try {
      const items = await loadAndDecryptVaultItems(address)
      setDecryptedItems(items)
      console.log('[Vault] Vault loaded successfully with', items.length, 'items')
    } catch (error) {
      console.error('[Vault] Failed to load vault:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleLoadVault}
        disabled={isLoading || !address}
        className="w-full"
      >
        {isLoading ? 'Loading Vault...' : 'Load & Decrypt Vault Items'}
      </Button>

      {decryptedItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Decrypted Items:</h3>
          {decryptedItems.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{item.site}</h4>
                  <p className="text-sm text-muted-foreground">{item.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Password: {item.decryptedPassword.slice(0, 8)}...
                  </p>
                </div>
                <Badge variant="secondary">{item.meta.category}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
