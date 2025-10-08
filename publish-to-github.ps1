# publish-to-github.ps1
# Use este script no PowerShell para inicializar o repositório git local e enviá-lo ao GitHub.
# Repositório alvo: notepad-online (público)

# Nome do repositório no GitHub. Espaços convertidos para hífen automaticamente.
$repoName = "notepad-online"
Write-Host "Nome do repositório: $repoName"

# Verifica se git está instalado
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git não encontrado. Instale Git (https://git-scm.com/) e execute novamente."
  exit 1
}

# Inicializa git se necessário
if (-not (Test-Path .git)) {
  Write-Host "Inicializando repositório git local..."
  git init
  git add .
  git commit -m "Initial commit"
} else {
  Write-Host "Repositório git já inicializado. Pulando init/commit inicial."
}

# Se gh (GitHub CLI) estiver disponível, usar para criar e push automático
if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "GitHub CLI detectado. Criando repositório remoto e fazendo push..."
  gh repo create $repoName --public --source=. --remote=origin --push
  Write-Host "Repositorio criado e push realizado com sucesso."
  exit 0
}

Write-Host "GitHub CLI (gh) não detectado. Você pode criar o repositório manualmente no GitHub (https://github.com/new) com o nome '$repoName' e então colar a URL remota abaixo."

$remoteUrl = Read-Host "Cole a URL remota (ex: https://github.com/seuUsuario/$repoName.git) ou ENTER para cancelar"
if (-not $remoteUrl) {
  Write-Host "Operação cancelada. Após criar o repositório remoto, execute estes comandos manualmente:"
  Write-Host "  git branch -M main; git remote add origin https://github.com/<user>/$repoName.git; git push -u origin main"
  exit 0
}

# Adiciona/atualiza remote e faz push
try {
  # cria branch main e configura remote
  git branch -M main
  if ((git remote) -like '*origin*') {
    git remote set-url origin $remoteUrl
  } else {
    git remote add origin $remoteUrl
  }
  git push -u origin main
  Write-Host "Push realizado com sucesso para $remoteUrl"
} catch {
  Write-Error "Erro ao dar push: $_"
  exit 1
}
