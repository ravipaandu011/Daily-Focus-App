<#
.SYNOPSIS
    Builds an Android Debug or Release APK for a React Native / Expo project,
    moves it to a single output directory, and optionally delivers it to Telegram.

.EXAMPLE
    .\build-apk.ps1
    .\build-apk.ps1 -Configuration Release -Architectures arm64-v8a
    .\build-apk.ps1 -Configuration Release -Architectures arm64-v8a -SendTelegram
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Debug',

    [string]$ProjectName = '',

    [string]$OutputDir = '',

    [string]$Architectures = '',

    [switch]$KeepGradleApk,

    [switch]$SendTelegram
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ConfigVariable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
        $value = [Environment]::GetEnvironmentVariable($Name, 'User')
    }

    if ($null -eq $value) {
        return ''
    }

    return $value.Trim()
}

function Get-JsonPropertyValue {
    param(
        [Parameter(Mandatory = $false)]
        [object]$Object,

        [Parameter(Mandatory = $true)]
        [string]$PropertyName
    )

    if ($null -eq $Object) {
        return $null
    }

    $prop = $Object.PSObject.Properties[$PropertyName]
    if ($null -eq $prop) {
        return $null
    }

    return $prop.Value
}

function ConvertTo-SafeFileName {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RawName
    )

    $sanitized = $RawName.Trim()
    foreach ($invalidChar in [System.IO.Path]::GetInvalidFileNameChars()) {
        $sanitized = $sanitized.Replace([string]$invalidChar, '-')
    }

    $sanitized = [regex]::Replace($sanitized, '-{2,}', '-')
    $sanitized = $sanitized.Trim(' ', '.', '-')

    if ([string]::IsNullOrWhiteSpace($sanitized)) {
        return 'app'
    }

    if ($sanitized -match '^(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)') {
        $sanitized = "$sanitized-app"
    }

    return $sanitized
}

function Resolve-ProjectName {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,

        [string]$OverrideName = ''
    )

    if (-not [string]::IsNullOrWhiteSpace($OverrideName)) {
        return (ConvertTo-SafeFileName -RawName $OverrideName)
    }

    $packageJsonPath = Join-Path $ProjectRoot 'package.json'
    if (Test-Path -LiteralPath $packageJsonPath -PathType Leaf) {
        try {
            $pkg = Get-Content -LiteralPath $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $pkgName = Get-JsonPropertyValue -Object $pkg -PropertyName 'name'
            if ($pkgName -is [string] -and -not [string]::IsNullOrWhiteSpace($pkgName)) {
                $unscoped = ($pkgName.Trim() -replace '^@[^/]+/', '')
                if (-not [string]::IsNullOrWhiteSpace($unscoped)) {
                    return (ConvertTo-SafeFileName -RawName $unscoped)
                }
            }
        }
        catch {
            Write-Warning "Could not parse package.json while detecting project name: $($_.Exception.Message)"
        }
    }

    $appJsonPath = Join-Path $ProjectRoot 'app.json'
    if (Test-Path -LiteralPath $appJsonPath -PathType Leaf) {
        try {
            $appConfig = Get-Content -LiteralPath $appJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $expoObj = Get-JsonPropertyValue -Object $appConfig -PropertyName 'expo'
            $candidates = @(
                (Get-JsonPropertyValue -Object $appConfig -PropertyName 'name'),
                (Get-JsonPropertyValue -Object $expoObj -PropertyName 'slug'),
                (Get-JsonPropertyValue -Object $expoObj -PropertyName 'name')
            )
            foreach ($candidate in $candidates) {
                if ($candidate -is [string] -and -not [string]::IsNullOrWhiteSpace($candidate)) {
                    return (ConvertTo-SafeFileName -RawName $candidate)
                }
            }
        }
        catch {
            Write-Warning "Could not parse app.json while detecting project name: $($_.Exception.Message)"
        }
    }

    foreach ($settingsFileName in @('settings.gradle', 'settings.gradle.kts')) {
        $settingsPath = Join-Path $ProjectRoot (Join-Path 'android' $settingsFileName)
        if (Test-Path -LiteralPath $settingsPath -PathType Leaf) {
            try {
                $settingsText = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8
                if ($settingsText -match "(?m)^\s*rootProject\.name\s*=\s*[`"']([^`"']+)[`"']") {
                    if (-not [string]::IsNullOrWhiteSpace($Matches[1])) {
                        return (ConvertTo-SafeFileName -RawName $Matches[1])
                    }
                }
            }
            catch {
                Write-Warning "Could not inspect $settingsFileName while detecting project name: $($_.Exception.Message)"
            }
        }
    }

    $folderName = Split-Path -Leaf $ProjectRoot
    return (ConvertTo-SafeFileName -RawName $folderName)
}

function Get-JavaMajorVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$JavaExePath
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $JavaExePath
    $psi.Arguments = '-version'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $proc = $null
    try {
        $proc = [System.Diagnostics.Process]::Start($psi)
        $stdOut = $proc.StandardOutput.ReadToEnd()
        $stdErr = $proc.StandardError.ReadToEnd()
        $proc.WaitForExit()
        $combined = "$stdOut`n$stdErr"
        if ($combined -match 'version\s+"(\d+)(?:\.(\d+))?') {
            $first = [int]$Matches[1]
            if ($first -eq 1 -and $Matches[2]) {
                return [int]$Matches[2]
            }
            return $first
        }
    }
    finally {
        if ($null -ne $proc) {
            $proc.Dispose()
        }
    }

    return 0
}

function Resolve-JavaEnvironment {
    $javaHome = Get-ConfigVariable -Name 'JAVA_HOME'
    if ([string]::IsNullOrWhiteSpace($javaHome)) {
        $machineJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine')
        if (-not [string]::IsNullOrWhiteSpace($machineJavaHome)) {
            $javaHome = $machineJavaHome.Trim()
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($javaHome)) {
        $javaHome = $javaHome.Trim().Trim('"')
        $javaExe = Join-Path $javaHome 'bin\java.exe'
        if (-not (Test-Path -LiteralPath $javaHome -PathType Container) -or -not (Test-Path -LiteralPath $javaExe -PathType Leaf)) {
            throw "JAVA_HOME points to '$javaHome', but '$javaExe' was not found. Install JDK 17+ and set JAVA_HOME."
        }

        $major = Get-JavaMajorVersion -JavaExePath $javaExe
        if ($major -gt 0 -and $major -lt 17) {
            throw "JDK 17+ is required, but JAVA_HOME ('$javaHome') is Java $major."
        }

        # Prepend JAVA_HOME\bin in-process only so Gradle and child tools prefer it over other JDKs on PATH.
        $env:JAVA_HOME = $javaHome
        $javaBin = Join-Path $javaHome 'bin'
        $pathEntries = @($env:PATH -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $alreadyFirst = ($pathEntries.Count -gt 0) -and ($pathEntries[0].TrimEnd('\') -ieq $javaBin.TrimEnd('\'))
        if (-not $alreadyFirst) {
            $filteredEntries = @($pathEntries | Where-Object { $_.TrimEnd('\') -ine $javaBin.TrimEnd('\') })
            $env:PATH = (@($javaBin) + $filteredEntries) -join ';'
        }

        return [PSCustomObject]@{
            JavaHome = $javaHome
            JavaExe  = $javaExe
            Major    = $major
        }
    }

    $javaCmd = Get-Command 'java.exe' -ErrorAction SilentlyContinue
    if ($null -eq $javaCmd) {
        throw "JAVA_HOME is not set and java.exe was not found on PATH. Install JDK 17+ and set JAVA_HOME."
    }

    $majorFromPath = Get-JavaMajorVersion -JavaExePath $javaCmd.Source
    if ($majorFromPath -gt 0 -and $majorFromPath -lt 17) {
        throw "JDK 17+ is required, but '$($javaCmd.Source)' is Java $majorFromPath. Install JDK 17+ and set JAVA_HOME."
    }

    Write-Warning "JAVA_HOME is not set; using java.exe from PATH ($($javaCmd.Source)). Setting JAVA_HOME to JDK 17+ is recommended."
    return [PSCustomObject]@{
        JavaHome = ''
        JavaExe  = $javaCmd.Source
        Major    = $majorFromPath
    }
}

function Resolve-AndroidSdkPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AndroidDir
    )

    foreach ($varName in @('ANDROID_HOME', 'ANDROID_SDK_ROOT')) {
        $candidate = Get-ConfigVariable -Name $varName
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            $machineVal = [Environment]::GetEnvironmentVariable($varName, 'Machine')
            if (-not [string]::IsNullOrWhiteSpace($machineVal)) {
                $candidate = $machineVal.Trim()
            }
        }

        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            $cleanCandidate = $candidate.Trim().Trim('"')
            if (Test-Path -LiteralPath $cleanCandidate -PathType Container) {
                if ([string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) {
                    $env:ANDROID_HOME = $cleanCandidate
                }
                return $cleanCandidate
            }
        }
    }

    $localPropsPath = Join-Path $AndroidDir 'local.properties'
    if (Test-Path -LiteralPath $localPropsPath -PathType Leaf) {
        $lines = Get-Content -LiteralPath $localPropsPath -Encoding UTF8
        foreach ($line in $lines) {
            if ($line -match '^\s*sdk\.dir\s*=\s*(.+)$') {
                $rawSdkDir = $Matches[1].Trim()
                $unescaped = $rawSdkDir -replace '\\\\', '\' -replace '\\:', ':' -replace '\\=', '='
                if (Test-Path -LiteralPath $unescaped -PathType Container) {
                    if ([string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) {
                        $env:ANDROID_HOME = $unescaped
                    }
                    return $unescaped
                }
            }
        }
    }

    throw "Android SDK not found. Set ANDROID_HOME (or ANDROID_SDK_ROOT) or configure sdk.dir in android\local.properties."
}

function Test-AndroidProjectReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $androidDir = Join-Path $ProjectRoot 'android'
    if (-not (Test-Path -LiteralPath $androidDir -PathType Container)) {
        throw "Native 'android\' directory not found at '$androidDir'. For Expo projects run 'npx expo prebuild --platform android --no-install'; for React Native CLI restore the android\ folder."
    }

    $requiredFiles = @(
        (Join-Path $androidDir 'gradlew.bat'),
        (Join-Path $androidDir 'gradle\wrapper\gradle-wrapper.jar'),
        (Join-Path $androidDir 'gradle\wrapper\gradle-wrapper.properties')
    )

    foreach ($file in $requiredFiles) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Required Gradle wrapper file missing: '$file'. Ensure the android\ Gradle wrapper is complete."
        }
    }

    return $androidDir
}

function Resolve-OutputDirectory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,

        [string]$OutputDirOverride = ''
    )

    if (-not [string]::IsNullOrWhiteSpace($OutputDirOverride)) {
        $trimmed = $OutputDirOverride.Trim().Trim('"')
        if ([System.IO.Path]::IsPathRooted($trimmed)) {
            return [System.IO.Path]::GetFullPath($trimmed)
        }
        return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $trimmed))
    }

    $envOutputDir = Get-ConfigVariable -Name 'APK_OUTPUT_DIR'
    if (-not [string]::IsNullOrWhiteSpace($envOutputDir)) {
        $trimmedEnv = $envOutputDir.Trim().Trim('"')
        if ([System.IO.Path]::IsPathRooted($trimmedEnv)) {
            return [System.IO.Path]::GetFullPath($trimmedEnv)
        }
        return [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $trimmedEnv))
    }

    $parentDir = Split-Path -Parent $ProjectRoot
    if (-not [string]::IsNullOrWhiteSpace($parentDir)) {
        $sharedLocalApks = Join-Path $parentDir "Local Apk's"
        if (Test-Path -LiteralPath $sharedLocalApks -PathType Container) {
            return [System.IO.Path]::GetFullPath($sharedLocalApks)
        }

        $sharedApk = Join-Path $parentDir "apk"
        if (Test-Path -LiteralPath $sharedApk -PathType Container) {
            return [System.IO.Path]::GetFullPath($sharedApk)
        }
    }

    return [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'apk'))
}

function Get-GradleBlockText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [string]$BlockPattern
    )

    $match = [regex]::Match($Text, "$BlockPattern\s*\{")
    if (-not $match.Success) {
        return ''
    }

    $startIdx = $match.Index + $match.Length - 1
    $depth = 0
    for ($i = $startIdx; $i -lt $Text.Length; $i++) {
        $ch = $Text[$i]
        if ($ch -eq '{') {
            $depth++
        }
        elseif ($ch -eq '}') {
            $depth--
            if ($depth -eq 0) {
                return $Text.Substring($startIdx + 1, $i - $startIdx - 1)
            }
        }
    }

    return ''
}

function Test-ReleaseSigningConfigured {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AndroidDir
    )

    $gradlePath = $null
    foreach ($candidateName in @('build.gradle', 'build.gradle.kts')) {
        $candidate = Join-Path $AndroidDir (Join-Path 'app' $candidateName)
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $gradlePath = $candidate
            break
        }
    }

    if ($null -eq $gradlePath) {
        return $false
    }

    $rawText = Get-Content -LiteralPath $gradlePath -Raw -Encoding UTF8
    $cleanText = [regex]::Replace($rawText, '(?s)/\*.*?\*/', '')
    $cleanText = [regex]::Replace($cleanText, '(?m)(^|\s)//.*$', '$1')

    $signingConfigsBlock = Get-GradleBlockText -Text $cleanText -BlockPattern '\bsigningConfigs'
    $buildTypesBlock = Get-GradleBlockText -Text $cleanText -BlockPattern '\bbuildTypes'
    $releaseBuildTypeBlock = ''
    if (-not [string]::IsNullOrWhiteSpace($buildTypesBlock)) {
        $releaseBuildTypeBlock = Get-GradleBlockText -Text $buildTypesBlock -BlockPattern '(?:\brelease|\b(?:create|getByName)\(["'']release["'']\))'
    }

    $hasReleaseSigningDef = $signingConfigsBlock -match '(?:\brelease\s*\{|\b(?:create|getByName)\(["'']release["'']\)\s*\{)'
    $usesDebugSigning = $releaseBuildTypeBlock -match 'signingConfig\s*(?:=|\s)\s*signingConfigs\.(?:debug|getByName\(["'']debug["'']\))'
    $hasAnySigningAssignment = $releaseBuildTypeBlock -match 'signingConfig\s*(?:=|\s)'

    if ($usesDebugSigning -or (-not $hasReleaseSigningDef) -or (-not $hasAnySigningAssignment)) {
        return $false
    }

    return $true
}

function Find-GeneratedApk {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AndroidDir,

        [Parameter(Mandatory = $true)]
        [string]$Variant
    )

    $apkVariantDir = Join-Path $AndroidDir (Join-Path 'app\build\outputs\apk' $Variant)
    if (-not (Test-Path -LiteralPath $apkVariantDir -PathType Container)) {
        throw "APK output directory not found: '$apkVariantDir'."
    }

    $allApks = @(Get-ChildItem -LiteralPath $apkVariantDir -Filter '*.apk' -File -Recurse)
    if ($allApks.Count -eq 0) {
        throw "No .apk files were found under '$apkVariantDir'."
    }

    $signedApks = @($allApks | Where-Object { $_.Name -notlike '*-unsigned.apk' })
    if ($signedApks.Count -eq 0) {
        $unsignedList = ($allApks | ForEach-Object { $_.Name }) -join ', '
        throw "Gradle only produced unsigned APK(s) in '$apkVariantDir' ($unsignedList). Check signingConfig for '$Variant' in android\app\build.gradle(.kts)."
    }

    $expectedDefault = "app-$Variant.apk"
    $exactMatch = @($signedApks | Where-Object { $_.Name -ieq $expectedDefault })
    if ($exactMatch.Count -eq 1 -and $signedApks.Count -eq 1) {
        return $exactMatch[0]
    }

    return ($signedApks | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1)
}

function Format-FileSizeMb {
    param(
        [Parameter(Mandatory = $true)]
        [long]$Bytes
    )

    return ('{0:F2}' -f ($Bytes / 1MB))
}

function Remove-TokenFromText {
    param(
        [string]$Text,
        [string]$Token
    )

    if ([string]::IsNullOrEmpty($Text) -or [string]::IsNullOrEmpty($Token)) {
        return $Text
    }

    return $Text.Replace($Token, '***REDACTED***')
}

function Confirm-TelegramResponseBody {
    param(
        [string]$ResponseBody,
        [int]$StatusCode,
        [string]$MethodName,
        [string]$Token
    )

    $parsed = $null
    try {
        $parsed = $ResponseBody | ConvertFrom-Json
    }
    catch {
        $parsed = $null
    }

    $okFlag = $false
    if ($null -ne $parsed) {
        $okProp = Get-JsonPropertyValue -Object $parsed -PropertyName 'ok'
        $okFlag = ($okProp -eq $true)
    }

    if (($StatusCode -lt 200) -or ($StatusCode -ge 300) -or (-not $okFlag)) {
        $desc = Get-JsonPropertyValue -Object $parsed -PropertyName 'description'
        if ([string]::IsNullOrWhiteSpace($desc)) {
            $desc = Remove-TokenFromText -Text $ResponseBody -Token $Token
        }
        throw "Telegram $MethodName failed (HTTP $StatusCode): $desc"
    }
}

function Format-CurlConfigValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    return $Value.Replace('\', '\\').Replace('"', '\"')
}

function Invoke-TelegramCurlUpload {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CurlExePath,

        [Parameter(Mandatory = $true)]
        [string]$ApiBase,

        [Parameter(Mandatory = $true)]
        [string]$Token,

        [Parameter(Mandatory = $true)]
        [string]$ChatId,

        [Parameter(Mandatory = $true)]
        [string]$Caption,

        [Parameter(Mandatory = $true)]
        [string]$ApkPath,

        [Parameter(Mandatory = $true)]
        [string]$FileName,

        [bool]$ForceIpv4 = $true
    )

    $endpointUri = "$ApiBase/bot$Token/sendDocument"
    $tempRespPath = [System.IO.Path]::GetTempFileName()
    $escUri = Format-CurlConfigValue -Value $endpointUri
    $escRespPath = Format-CurlConfigValue -Value $tempRespPath
    $escChatId = Format-CurlConfigValue -Value $ChatId
    $escCaption = Format-CurlConfigValue -Value $Caption
    $escApkPath = Format-CurlConfigValue -Value $ApkPath
    $escFileName = Format-CurlConfigValue -Value $FileName

    $configLines = @(
        "url = `"$escUri`""
        'show-error'
        'max-time = 600'
        'write-out = "%{http_code}"'
        "output = `"$escRespPath`""
        "form = `"chat_id=$escChatId`""
        "form = `"caption=$escCaption`""
        "form = `"document=@\`"$escApkPath\`";filename=\`"$escFileName\`";type=application/vnd.android.package-archive`""
    )
    if ($ForceIpv4) {
        $configLines = @('ipv4') + $configLines
    }
    $configPayload = $configLines -join "`n"

    $curlExitCode = 0
    $httpCodeText = ''
    $responseBody = ''
    $prevErrorAction = $ErrorActionPreference

    try {
        $ErrorActionPreference = 'Continue'
        $httpCodeOutput = $configPayload | & $CurlExePath --config -
        $curlExitCode = $LASTEXITCODE
        $httpCodeText = ($httpCodeOutput | Out-String).Trim()
    }
    catch {
        $safeMsg = Remove-TokenFromText -Text $_.Exception.Message -Token $Token
        throw "Telegram sendDocument curl invocation failed: $safeMsg"
    }
    finally {
        $ErrorActionPreference = $prevErrorAction
        if (Test-Path -LiteralPath $tempRespPath -PathType Leaf) {
            $responseBody = Get-Content -LiteralPath $tempRespPath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $tempRespPath -Force -ErrorAction SilentlyContinue
        }
    }

    if ($curlExitCode -ne 0) {
        $safeBody = Remove-TokenFromText -Text $responseBody -Token $Token
        throw "Telegram sendDocument failed (curl exit code $curlExitCode). $safeBody"
    }

    $statusCode = 0
    if ($httpCodeText -match '(\d{3})$') {
        $statusCode = [int]$Matches[1]
    }
    Confirm-TelegramResponseBody -ResponseBody $responseBody -StatusCode $statusCode -MethodName 'sendDocument' -Token $Token
}

function Invoke-TelegramApiRequest {
    param(
        [Parameter(Mandatory = $true)]
        [System.Net.Http.HttpClient]$HttpClient,

        [Parameter(Mandatory = $true)]
        [string]$ApiBase,

        [Parameter(Mandatory = $true)]
        [string]$Token,

        [Parameter(Mandatory = $true)]
        [string]$MethodName,

        [Parameter(Mandatory = $true)]
        [System.Net.Http.HttpContent]$Content
    )

    $endpointUri = "$ApiBase/bot$Token/$MethodName"
    $response = $null
    $responseBody = ''

    try {
        $response = $HttpClient.PostAsync($endpointUri, $Content).GetAwaiter().GetResult()
        $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    }
    catch {
        $safeMsg = Remove-TokenFromText -Text $_.Exception.Message -Token $Token
        throw "Telegram $MethodName request failed: $safeMsg"
    }

    Confirm-TelegramResponseBody -ResponseBody $responseBody -StatusCode ([int]$response.StatusCode) -MethodName $MethodName -Token $Token
}

function Resolve-MtprotoUploaderPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot
    )

    $envScript = Get-ConfigVariable -Name 'TELEGRAM_MTPROTO_SCRIPT'
    if (-not [string]::IsNullOrWhiteSpace($envScript)) {
        $cleanPath = $envScript.Trim().Trim('"')
        if (Test-Path -LiteralPath $cleanPath -PathType Leaf) {
            return [System.IO.Path]::GetFullPath($cleanPath)
        }
    }

    $parentDir = Split-Path -Parent $ProjectRoot
    if (-not [string]::IsNullOrWhiteSpace($parentDir)) {
        $sharedScript = Join-Path $parentDir 'telegram-uploader\send-apk.mjs'
        if (Test-Path -LiteralPath $sharedScript -PathType Leaf) {
            return [System.IO.Path]::GetFullPath($sharedScript)
        }
    }

    $localScript = Join-Path $ProjectRoot 'telegram-uploader\send-apk.mjs'
    if (Test-Path -LiteralPath $localScript -PathType Leaf) {
        return [System.IO.Path]::GetFullPath($localScript)
    }

    return ''
}

function Invoke-TelegramMtprotoUpload {
    param(
        [Parameter(Mandatory = $true)]
        [string]$NodeExePath,

        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,

        [Parameter(Mandatory = $true)]
        [string]$ApiId,

        [Parameter(Mandatory = $true)]
        [string]$ApiHash,

        [Parameter(Mandatory = $true)]
        [string]$Token,

        [Parameter(Mandatory = $true)]
        [string]$ChatId,

        [Parameter(Mandatory = $true)]
        [string]$ApkPath,

        [Parameter(Mandatory = $true)]
        [string]$Caption,

        [int]$Workers = 4
    )

    $prevApiId = $env:TELEGRAM_API_ID
    $prevApiHash = $env:TELEGRAM_API_HASH
    $prevToken = $env:TELEGRAM_BOT_TOKEN
    $prevChatId = $env:TELEGRAM_CHAT_ID
    $prevErrorAction = $ErrorActionPreference

    $exitCode = 0
    try {
        $env:TELEGRAM_API_ID = $ApiId
        $env:TELEGRAM_API_HASH = $ApiHash
        $env:TELEGRAM_BOT_TOKEN = $Token
        $env:TELEGRAM_CHAT_ID = $ChatId

        $ErrorActionPreference = 'Continue'
        & $NodeExePath $ScriptPath '--file' $ApkPath '--caption' $Caption '--workers' ([string]$Workers)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $prevErrorAction
        $env:TELEGRAM_API_ID = $prevApiId
        $env:TELEGRAM_API_HASH = $prevApiHash
        $env:TELEGRAM_BOT_TOKEN = $prevToken
        $env:TELEGRAM_CHAT_ID = $prevChatId
    }

    if ($exitCode -ne 0) {
        throw "Telegram MTProto uploader failed with exit code $exitCode."
    }
}

function Send-TelegramDelivery {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProjectRoot,

        [Parameter(Mandatory = $true)]
        [string]$ApkPath,

        [Parameter(Mandatory = $true)]
        [string]$ProjectName,

        [Parameter(Mandatory = $true)]
        [string]$Configuration,

        [string]$Architectures,

        [Parameter(Mandatory = $true)]
        [long]$FileSizeBytes
    )

    $token = Get-ConfigVariable -Name 'TELEGRAM_BOT_TOKEN'
    $chatId = Get-ConfigVariable -Name 'TELEGRAM_CHAT_ID'

    if ([string]::IsNullOrWhiteSpace($token) -or [string]::IsNullOrWhiteSpace($chatId)) {
        throw "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set (process or User environment variables) when using -SendTelegram."
    }

    if ($token -notmatch '^(\d+):(.+)$') {
        throw "TELEGRAM_BOT_TOKEN format is invalid. Expected '<bot_id>:<secret>'."
    }

    $botId = $Matches[1]
    if ($chatId -eq $botId) {
        throw "TELEGRAM_CHAT_ID ($chatId) matches the bot's own numeric ID from TELEGRAM_BOT_TOKEN (getMe). Set TELEGRAM_CHAT_ID to your target chat.id from getUpdates."
    }

    $customApiBase = Get-ConfigVariable -Name 'TELEGRAM_API_BASE'
    if ([string]::IsNullOrWhiteSpace($customApiBase)) {
        $apiBase = 'https://api.telegram.org'
        $isStandardApi = $true
    }
    else {
        $apiBase = $customApiBase.TrimEnd('/')
        $isStandardApi = ($apiBase -ieq 'https://api.telegram.org')
    }

    $apkShareUrl = Get-ConfigVariable -Name 'APK_SHARE_URL'

    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
    $servicePoint = [System.Net.ServicePointManager]::FindServicePoint([Uri]$apiBase)
    $servicePoint.Expect100Continue = $false
    $servicePoint.UseNagleAlgorithm = $false
    Add-Type -AssemblyName System.Net.Http

    $maxStandardBytes = 52428800L
    $maxMtprotoBytes = 2147483648L
    $uploadBufferBytes = 262144
    $fileName = Split-Path -Leaf $ApkPath
    $sizeMb = Format-FileSizeMb -Bytes $FileSizeBytes
    $archSummary = if ([string]::IsNullOrWhiteSpace($Architectures)) { 'default' } else { $Architectures }
    $caption = "Android APK: $ProjectName ($Configuration) | ABI: $archSummary | Size: $sizeMb MB | File: $fileName"

    $apiId = Get-ConfigVariable -Name 'TELEGRAM_API_ID'
    $apiHash = Get-ConfigVariable -Name 'TELEGRAM_API_HASH'
    $mtprotoScript = Resolve-MtprotoUploaderPath -ProjectRoot $ProjectRoot
    $nodeCmd = Get-Command 'node.exe' -ErrorAction SilentlyContinue
    $canUseMtproto = $isStandardApi -and ($apiId -match '^\d+$') -and (-not [string]::IsNullOrWhiteSpace($apiHash)) -and (-not [string]::IsNullOrWhiteSpace($mtprotoScript)) -and ($null -ne $nodeCmd) -and ($FileSizeBytes -le $maxMtprotoBytes)

    if ($canUseMtproto) {
        Write-Host ("Uploading {0} ({1} MB) via MTProto..." -f $fileName, $sizeMb)
        try {
            Invoke-TelegramMtprotoUpload -NodeExePath $nodeCmd.Source -ScriptPath $mtprotoScript -ApiId $apiId -ApiHash $apiHash -Token $token -ChatId $chatId -ApkPath $ApkPath -Caption $caption -Workers 4
            return
        }
        catch {
            $safeMtprotoErr = Remove-TokenFromText -Text (Remove-TokenFromText -Text $_.Exception.Message -Token $token) -Token $apiHash
            Write-Warning "MTProto upload failed ($safeMtprotoErr). Falling back to Bot HTTP API."
        }
    }

    $httpClient = New-Object System.Net.Http.HttpClient
    $httpClient.Timeout = [TimeSpan]::FromMinutes(10)

    try {
        if (($FileSizeBytes -le $maxStandardBytes) -or (-not $isStandardApi)) {
            Write-Host ("Uploading {0} ({1} MB)..." -f $fileName, $sizeMb)

            $uploadTimer = [System.Diagnostics.Stopwatch]::StartNew()
            $curlCmd = Get-Command 'curl.exe' -ErrorAction SilentlyContinue

            if ($null -ne $curlCmd) {
                Invoke-TelegramCurlUpload -CurlExePath $curlCmd.Source -ApiBase $apiBase -Token $token -ChatId $chatId -Caption $caption -ApkPath $ApkPath -FileName $fileName -ForceIpv4 $isStandardApi
            }
            else {
                $fileStream = $null
                $fileContent = $null
                $chatIdContent = $null
                $captionContent = $null
                $form = $null

                try {
                    $form = New-Object System.Net.Http.MultipartFormDataContent
                    $chatIdContent = New-Object System.Net.Http.StringContent($chatId, [System.Text.Encoding]::UTF8)
                    $captionContent = New-Object System.Net.Http.StringContent($caption, [System.Text.Encoding]::UTF8)

                    $fileStream = New-Object System.IO.FileStream($ApkPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read, $uploadBufferBytes, [System.IO.FileOptions]::SequentialScan)
                    $fileContent = New-Object System.Net.Http.StreamContent($fileStream, $uploadBufferBytes)
                    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/vnd.android.package-archive')

                    $form.Add($chatIdContent, 'chat_id')
                    $form.Add($captionContent, 'caption')
                    $form.Add($fileContent, 'document', $fileName)

                    Invoke-TelegramApiRequest -HttpClient $httpClient -ApiBase $apiBase -Token $token -MethodName 'sendDocument' -Content $form
                }
                finally {
                    if ($null -ne $fileContent) { $fileContent.Dispose() }
                    if ($null -ne $fileStream) { $fileStream.Dispose() }
                    if ($null -ne $captionContent) { $captionContent.Dispose() }
                    if ($null -ne $chatIdContent) { $chatIdContent.Dispose() }
                    if ($null -ne $form) { $form.Dispose() }
                }
            }

            $uploadTimer.Stop()
            $elapsedSec = [math]::Max($uploadTimer.Elapsed.TotalSeconds, 0.01)
            $speedMbPerSec = ($FileSizeBytes / 1MB) / $elapsedSec
            Write-Host ("Telegram upload succeeded: {0} delivered via sendDocument in {1:F1}s ({2:F2} MB/s)." -f $fileName, $elapsedSec, $speedMbPerSec)
        }
        else {
            $lines = @(
                "Android APK Build Ready: $ProjectName ($Configuration)",
                "File: $fileName ($sizeMb MB)",
                "Architectures: $archSummary",
                "Local Path: $ApkPath",
                "Note: APK exceeds the 50 MB Telegram Bot API limit (52,428,800 bytes), so the file was not uploaded."
            )
            if (-not [string]::IsNullOrWhiteSpace($apkShareUrl)) {
                $lines += "Share URL: $apkShareUrl"
            }
            $lines += "Tip: Use -Architectures arm64-v8a for a smaller APK, or configure TELEGRAM_API_BASE for a local Bot API server."

            $messageText = $lines -join "`n"
            $payloadJson = @{
                chat_id = $chatId
                text    = $messageText
            } | ConvertTo-Json -Compress

            $jsonContent = $null
            try {
                $jsonContent = New-Object System.Net.Http.StringContent($payloadJson, [System.Text.Encoding]::UTF8, 'application/json')
                Invoke-TelegramApiRequest -HttpClient $httpClient -ApiBase $apiBase -Token $token -MethodName 'sendMessage' -Content $jsonContent
            }
            finally {
                if ($null -ne $jsonContent) { $jsonContent.Dispose() }
            }

            Write-Host "Telegram summary notice sent (APK size $sizeMb MB exceeds standard 50 MB Bot API limit)."
        }
    }
    finally {
        if ($null -ne $httpClient) { $httpClient.Dispose() }
    }
}

try {
    $projectRoot = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($projectRoot) -or -not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
        throw "Could not resolve project root from script location."
    }

    $androidDir = Test-AndroidProjectReady -ProjectRoot $projectRoot
    $javaInfo = Resolve-JavaEnvironment
    $sdkPath = Resolve-AndroidSdkPath -AndroidDir $androidDir
    $resolvedProjectName = Resolve-ProjectName -ProjectRoot $projectRoot -OverrideName $ProjectName
    $resolvedOutputDir = Resolve-OutputDirectory -ProjectRoot $projectRoot -OutputDirOverride $OutputDir

    $variant = $Configuration.ToLowerInvariant()
    $gradleTask = "assemble$Configuration"

    $cleanArchs = ''
    if (-not [string]::IsNullOrWhiteSpace($Architectures)) {
        $archList = @($Architectures.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        if ($archList.Count -eq 0) {
            throw "Invalid -Architectures value '$Architectures'. Provide one or more comma-separated ABIs (e.g. arm64-v8a)."
        }
        $cleanArchs = $archList -join ','
    }

    if ($Configuration -eq 'Release') {
        $hasReleaseSigning = Test-ReleaseSigningConfigured -AndroidDir $androidDir
        if (-not $hasReleaseSigning) {
            Write-Warning "Release build is using debug signing (signingConfigs.debug) or lacks a release signingConfig in android\app\build.gradle(.kts). Do NOT publish this APK to Google Play; configure a production keystore via local gradle.properties or environment variables."
        }
    }

    Write-Host "Project Root : $projectRoot"
    Write-Host "Project Name : $resolvedProjectName"
    Write-Host "Configuration: $Configuration ($gradleTask)"
    if (-not [string]::IsNullOrWhiteSpace($cleanArchs)) {
        Write-Host "Architectures: $cleanArchs"
    }
    if (-not [string]::IsNullOrWhiteSpace($javaInfo.JavaHome)) {
        Write-Host "JAVA_HOME    : $($javaInfo.JavaHome) (Java $($javaInfo.Major))"
    }
    Write-Host "Android SDK  : $sdkPath"
    Write-Host "Output Dir   : $resolvedOutputDir"

    $gradleArgs = @($gradleTask, '-Pexpo.useLegacyPackaging=true')
    if (-not [string]::IsNullOrWhiteSpace($cleanArchs)) {
        $gradleArgs += "-PreactNativeArchitectures=$cleanArchs"
    }

    $gradleExitCode = 0
    $prevErrorAction = $ErrorActionPreference
    Push-Location -LiteralPath $androidDir
    try {
        $ErrorActionPreference = 'Continue'
        & ".\gradlew.bat" @gradleArgs
        $gradleExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $prevErrorAction
        Pop-Location
    }

    if ($gradleExitCode -ne 0) {
        Write-Error -Message "Gradle build failed with exit code $gradleExitCode." -ErrorAction Continue
        exit $gradleExitCode
    }

    $sourceApk = Find-GeneratedApk -AndroidDir $androidDir -Variant $variant

    if (-not (Test-Path -LiteralPath $resolvedOutputDir -PathType Container)) {
        [System.IO.Directory]::CreateDirectory($resolvedOutputDir) | Out-Null
    }

    $targetFileName = "$resolvedProjectName-$variant.apk"
    $destinationApkPath = Join-Path $resolvedOutputDir $targetFileName

    if ([System.IO.Path]::GetFullPath($sourceApk.FullName) -ine [System.IO.Path]::GetFullPath($destinationApkPath)) {
        if ($KeepGradleApk) {
            Copy-Item -LiteralPath $sourceApk.FullName -Destination $destinationApkPath -Force
        }
        else {
            Move-Item -LiteralPath $sourceApk.FullName -Destination $destinationApkPath -Force
        }
    }

    $finalApkInfo = Get-Item -LiteralPath $destinationApkPath
    $sizeMb = Format-FileSizeMb -Bytes $finalApkInfo.Length

    Write-Host "Resolved Output Dir : $resolvedOutputDir"
    Write-Host "Output APK Path     : $($finalApkInfo.FullName)"
    Write-Host "Output APK Size     : $sizeMb MB ($($finalApkInfo.Length) bytes)"

    if ($SendTelegram) {
        Send-TelegramDelivery -ProjectRoot $projectRoot -ApkPath $finalApkInfo.FullName -ProjectName $resolvedProjectName -Configuration $Configuration -Architectures $cleanArchs -FileSizeBytes $finalApkInfo.Length
    }
}
catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
}
