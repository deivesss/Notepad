<#
install-git.ps1
Script para instalar Git no Windows.
- Tenta usar winget se disponível
- Senão baixa o instalador do Git for Windows e executa em modo silencioso
- Se não estiver em modo administrador, tentará relançar com ele

Uso:
1. Abra PowerShell como Administrador
2. Execute: .\install-git.ps1
#>

function Test-IsAdmin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "Git já está instalado:" (git --version)
    return
}

if (-not (Test-IsAdmin)) {
    Write-Host "Necessário executar como Administrador. Tentando reiniciar com ele..."
    Start-Process -FilePath pwsh -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\"" -Verb RunAs
    exit
}

# Preferir winget quando disponível
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "winget detectado. Instalando Git via winget..."
    try {
        winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
    } catch {
        Write-Warning "Falha ao instalar via winget: $_"
    }
} else {
    Write-Host "winget não encontrado. Baixando instalador oficial do Git for Windows..."
    $tmp = [IO.Path]::Combine($env:TEMP, "Git-Installer.exe")
    $url = "https://github.com/git-for-windows/git/releases/latest/download/Git-64-bit.exe"
    try {
        Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -ErrorAction Stop
        Write-Host "Executando instalador (silencioso)..."
        Start-Process -FilePath $tmp -ArgumentList '/VERYSILENT','/NORESTART' -Wait
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Erro ao baixar/instalar Git: $_"
        exit 1
    }
}

# Verificar
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "Git instalado com sucesso:" (git --version)
    Write-Host "Configure seu usuário Git agora:"
    Write-Host "  git config --global user.name \"Seu Nome\""
    Write-Host "  git config --global user.email \"seu@email.com\""
} else {
    Write-Error "Parece que a instalação não finalizou corretamente. Reinicie o terminal e verifique 'git --version'."
}
