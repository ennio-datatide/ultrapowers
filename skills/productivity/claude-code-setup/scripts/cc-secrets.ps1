# cc-secrets.ps1: per-service secrets for Claude Code on Windows.
# The Windows counterpart of envchain on macOS. Secrets live in an encrypted
# Microsoft SecretStore vault; every run asks for the vault password, which is
# the approval step. Written for Windows PowerShell 5.1 (powershell.exe).
#
#   cc-secrets.ps1 init                      one-time setup, choose the vault password
#   cc-secrets.ps1 set <service> <VAR>       store a secret (value typed hidden)
#   cc-secrets.ps1 list                      show stored names, never values
#   cc-secrets.ps1 remove <service> <VAR>    delete a secret
#   cc-secrets.ps1 run <service> <command>   run a command with that service's secrets
#
# No param() block on purpose: arguments such as "-H" must reach the wrapped
# command untouched instead of being parsed as parameters of this script.

$ErrorActionPreference = 'Stop'
$Vault = 'ClaudeSecrets'
$Modules = 'Microsoft.PowerShell.SecretManagement', 'Microsoft.PowerShell.SecretStore'
$StorePath = Join-Path $env:LOCALAPPDATA 'Microsoft\PowerShell\secretmanagement\localstore'

$Action = $args[0]
$Rest = @($args | Select-Object -Skip 1)

function Show-Usage {
    Write-Host 'Usage:'
    Write-Host '  cc-secrets.ps1 init'
    Write-Host '  cc-secrets.ps1 set <service> <VAR>'
    Write-Host '  cc-secrets.ps1 list'
    Write-Host '  cc-secrets.ps1 remove <service> <VAR>'
    Write-Host '  cc-secrets.ps1 run <service> <command> [args...]'
}

function Import-SecretModules {
    foreach ($m in $Modules) {
        if (-not (Get-Module -ListAvailable -Name $m)) {
            throw "Module $m is not installed. Run: cc-secrets.ps1 init"
        }
    }
    Import-Module $Modules
}

function Unlock-Vault {
    # The unlock only lasts for this process, so every invocation asks again.
    # Get-Credential opens a Windows dialog in PowerShell 5.1, which also works
    # when this script is started by Claude Code without an interactive console.
    $cred = Get-Credential -UserName 'ClaudeSecrets vault' -Message 'Approve access to your stored secrets by entering the vault password.'
    if (-not $cred) {
        Write-Error 'Cancelled. No secrets were read.'
        exit 1
    }
    Unlock-SecretStore -Password $cred.Password
}

function Require-Args($count, $usage) {
    if ($Rest.Count -lt $count) {
        Write-Host "Usage: cc-secrets.ps1 $usage"
        exit 2
    }
}

switch ($Action) {
    'init' {
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        if (-not (Get-PackageProvider -ListAvailable -Name NuGet -ErrorAction SilentlyContinue)) {
            Install-PackageProvider -Name NuGet -Scope CurrentUser -Force | Out-Null
        }
        foreach ($m in $Modules) {
            if (-not (Get-Module -ListAvailable -Name $m)) {
                Install-Module -Name $m -Scope CurrentUser -Force -AllowClobber
            }
        }
        Import-Module $Modules
        if (-not (Get-SecretVault -Name $Vault -ErrorAction SilentlyContinue)) {
            Register-SecretVault -Name $Vault -ModuleName Microsoft.PowerShell.SecretStore
        }
        if (Test-Path $StorePath) {
            $password = Read-Host -AsSecureString 'Current vault password'
        } else {
            Write-Host 'Choose a vault password. You will type it each time a secret is used, so pick one you can remember. It cannot be recovered.'
            $password = Read-Host -AsSecureString 'New vault password'
            $confirm = Read-Host -AsSecureString 'Repeat it'
            $a = [Net.NetworkCredential]::new('', $password).Password
            $b = [Net.NetworkCredential]::new('', $confirm).Password
            if ($a -ne $b) { throw 'The two passwords do not match. Nothing was changed.' }
        }
        # Interaction None: the store never prompts by itself. This script
        # always asks explicitly, so nothing can hang waiting on a hidden prompt.
        Set-SecretStoreConfiguration -Scope CurrentUser -Authentication Password -PasswordTimeout 300 -Interaction None -Password $password -Confirm:$false
        Write-Host "Ready. Vault '$Vault' is set up."
    }
    'set' {
        Require-Args 2 'set <service> <VAR>'
        if ($env:CLAUDECODE) {
            Write-Host 'Stop: run this yourself in your own PowerShell window, not through Claude Code. Otherwise the secret could end up in the conversation.'
            exit 1
        }
        if ($Rest.Count -gt 2) {
            Write-Host 'Do not put the secret itself on the command line. Give only the service and the name; you will be asked for the value and it stays hidden.'
            exit 2
        }
        if ($Rest[1] -cnotmatch '^[A-Z][A-Z0-9_]*$') {
            Write-Host 'The second word must be the NAME of the secret in capitals, like RESEND_API_KEY. If you pasted the secret itself, treat it as exposed and create a new one at the service.'
            exit 2
        }
        Import-SecretModules
        Unlock-Vault
        $name = "$($Rest[0])/$($Rest[1])"
        $value = Read-Host -AsSecureString "Value for $name (hidden)"
        Set-Secret -Vault $Vault -Name $name -SecureStringSecret $value
        Write-Host "Stored $name."
    }
    'list' {
        Import-SecretModules
        Unlock-Vault
        Get-SecretInfo -Vault $Vault | Sort-Object Name | ForEach-Object { Write-Host $_.Name }
    }
    'remove' {
        Require-Args 2 'remove <service> <VAR>'
        Import-SecretModules
        Unlock-Vault
        $name = "$($Rest[0])/$($Rest[1])"
        Remove-Secret -Vault $Vault -Name $name
        Write-Host "Removed $name."
    }
    'run' {
        Require-Args 2 'run <service> <command> [args...]'
        Import-SecretModules
        Unlock-Vault
        $service = $Rest[0]
        $command = $Rest[1]
        $commandArgs = @($Rest | Select-Object -Skip 2)
        $infos = @(Get-SecretInfo -Vault $Vault -Name "$service/*")
        if ($infos.Count -eq 0) {
            Write-Error "No secrets are stored for '$service'. Add one with: cc-secrets.ps1 set $service <VAR>"
            exit 1
        }
        foreach ($info in $infos) {
            $var = $info.Name.Substring($service.Length + 1)
            $value = Get-Secret -Vault $Vault -Name $info.Name -AsPlainText
            [Environment]::SetEnvironmentVariable($var, $value, 'Process')
        }
        $ErrorActionPreference = 'Continue'
        & $command @commandArgs
        exit $LASTEXITCODE
    }
    default {
        Show-Usage
        exit 2
    }
}
