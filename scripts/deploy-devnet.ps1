# Solana DevNet Deployment Script

# Set error action preference
$ErrorActionPreference = "Stop"

# Check if Solana CLI is installed
try {
    $solanaVersion = solana --version
    Write-Host "✅ Solana CLI found: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Solana CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    exit 1
}

# Set Solana config to devnet
Write-Host "🔧 Configuring Solana CLI for devnet..." -ForegroundColor Cyan
solana config set --url https://api.devnet.solana.com

# Check wallet balance
$balance = solana balance
Write-Host "💰 Current wallet balance: $balance" -ForegroundColor Cyan

# Airdrop SOL if balance is low
if ($balance -lt 1) {
    Write-Host "⚠️  Low balance, requesting airdrop..." -ForegroundColor Yellow
    solana airdrop 2
}

# Build and deploy programs
$programs = @(
    @{ name = "fiat-bridge"; path = "./contracts/programs/fiat-bridge" },
    @{ name = "merchant-rewards"; path = "./contracts/programs/merchant-rewards" },
    @{ name = "kyc-verification"; path = "./contracts/programs/kyc-verification" }
)

foreach ($program in $programs) {
    $programName = $program.name
    $programPath = $program.path
    
    Write-Host "\n🚀 Building $programName..." -ForegroundColor Cyan
    
    # Build the program
    Set-Location $programPath
    cargo build-bpf --bpf-out-dir ./target/deploy
    
    # Deploy the program
    $soFile = "./target/deploy/${programName}.so"
    if (Test-Path $soFile) {
        Write-Host "📦 Deploying $programName..." -ForegroundColor Cyan
        $deployOutput = solana program deploy --program-id ./target/deploy/${programName}-keypair.json $soFile
        
        if ($LASTEXITCODE -eq 0) {
            $programId = ($deployOutput | Select-String -Pattern "Program Id: (\w+)").Matches.Groups[1].Value
            Write-Host "✅ $programName deployed successfully! Program ID: $programId" -ForegroundColor Green
            
            # Update program ID in the frontend config
            $frontendConfig = "../frontend/src/config/programIds.ts"
            if (Test-Path $frontendConfig) {
                (Get-Content $frontendConfig) -replace 
                    "export const ${programName.toUpperCase()}_PROGRAM_ID = '.*';", 
                    "export const ${programName.toUpperCase()}_PROGRAM_ID = '$programId';" | 
                    Set-Content $frontendConfig
                Write-Host "🔧 Updated program ID in frontend config" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Failed to deploy $programName" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Build output not found for $programName" -ForegroundColor Red
        exit 1
    }
    
    Set-Location "../../.."
}

Write-Host "\n🎉 All programs deployed successfully!" -ForegroundColor Green
