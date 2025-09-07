# Environment Setup Script for SolanaPay

# Check if .env file exists, if not create it
$envFile = ".\.env"
if (-not (Test-Path $envFile)) {
    New-Item -ItemType File -Path $envFile | Out-Null
    Write-Host "Created new .env file" -ForegroundColor Green
}

# Function to safely set environment variable
function Set-EnvVariable {
    param (
        [string]$name,
        [string]$description,
        [string]$defaultValue = ""
    )
    
    $currentValue = [System.Environment]::GetEnvironmentVariable($name, "User")
    if (-not $currentValue) {
        $value = Read-Host "Enter $description"
        if (-not $value -and $defaultValue) {
            $value = $defaultValue
        }
        if ($value) {
            [System.Environment]::SetEnvironmentVariable($name, $value, "User")
            Add-Content -Path $envFile -Value "$name=$value"
            Write-Host "✅ Set $name" -ForegroundColor Green
        }
    } else {
        Write-Host "✅ $name already set" -ForegroundColor Green
    }
}

Write-Host "\n🔧 Setting up SolanaPay environment variables" -ForegroundColor Cyan

# Solana Configuration
Set-EnvVariable -name "NEXT_PUBLIC_SOLANA_NETWORK" -description "Solana network (devnet/mainnet-beta)" -defaultValue "devnet"
Set-EnvVariable -name "NEXT_PUBLIC_RPC_URL" -description "Solana RPC URL" -defaultValue "https://api.devnet.solana.com"

# Circle API Configuration
Write-Host "\n🔑 Circle API Configuration" -ForegroundColor Cyan
Set-EnvVariable -name "NEXT_PUBLIC_CIRCLE_API_KEY" -description "Circle API Key"
Set-EnvVariable -name "NEXT_PUBLIC_CIRCLE_API_URL" -description "Circle API URL" -defaultValue "https://api-sandbox.circle.com"
Set-EnvVariable -name "NEXT_PUBLIC_CIRCLE_ENTITY_SECRET" -description "Circle Entity Secret"
Set-EnvVariable -name "NEXT_PUBLIC_CIRCLE_MASTER_WALLET_ID" -description "Circle Master Wallet ID"

# Web3Auth Configuration
Write-Host "\n🔐 Web3Auth Configuration" -ForegroundColor Cyan
Set-EnvVariable -name "NEXT_PUBLIC_WEB3AUTH_CLIENT_ID" -description "Web3Auth Client ID"

# Backend Configuration
Write-Host "\n⚙️ Backend Configuration" -ForegroundColor Cyan
Set-EnvVariable -name "NEXT_PUBLIC_API_URL" -description "Backend API URL" -defaultValue "http://localhost:3002/api"

Write-Host "\n🎉 Environment setup complete!" -ForegroundColor Green
Write-Host "Please restart your development server for changes to take effect." -ForegroundColor Yellow
