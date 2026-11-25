# PowerShell / android/build.ps1 / JDK 17 + Android SDK / signed test APK
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$sdkRoot=Join-Path $projectRoot '.android-tools/sdk'
$javaRoot=(Get-ChildItem (Join-Path $projectRoot '.android-tools/java') -Directory | Select-Object -First 1).FullName
if(-not $javaRoot){throw 'JDK 17 não encontrado em .android-tools/java'}
$env:JAVA_HOME=$javaRoot
$buildTools=Join-Path $sdkRoot 'build-tools/35.0.0'
$androidJar=Join-Path $sdkRoot 'platforms/android-35/android.jar'
$buildDir=Join-Path $PSScriptRoot 'build'
$outDir=Join-Path $projectRoot 'android-release'
New-Item -ItemType Directory -Force -Path $buildDir,(Join-Path $buildDir 'classes'),(Join-Path $buildDir 'dex'),$outDir | Out-Null
function CheckExit {if($LASTEXITCODE -ne 0){throw "Falha de compilação: $LASTEXITCODE"}}
& (Join-Path $buildTools 'aapt.exe') package -f -M (Join-Path $PSScriptRoot 'AndroidManifest.xml') -S (Join-Path $PSScriptRoot 'res') -I $androidJar -F (Join-Path $buildDir 'resources.apk');CheckExit
& (Join-Path $javaRoot 'bin/javac.exe') -encoding UTF-8 -source 8 -target 8 -classpath $androidJar -d (Join-Path $buildDir 'classes') (Join-Path $PSScriptRoot 'src/com/biscord/mobile/MainActivity.java');CheckExit
& (Join-Path $javaRoot 'bin/jar.exe') cf (Join-Path $buildDir 'classes.jar') -C (Join-Path $buildDir 'classes') .;CheckExit
& (Join-Path $buildTools 'd8.bat') --lib $androidJar --min-api 26 --output (Join-Path $buildDir 'dex') (Join-Path $buildDir 'classes.jar');CheckExit
Copy-Item -LiteralPath (Join-Path $buildDir 'resources.apk') -Destination (Join-Path $buildDir 'unsigned.apk') -Force
Push-Location (Join-Path $buildDir 'dex')
try{& (Join-Path $buildTools 'aapt.exe') add (Join-Path $buildDir 'unsigned.apk') classes.dex;CheckExit}finally{Pop-Location}
& (Join-Path $buildTools 'zipalign.exe') -f 4 (Join-Path $buildDir 'unsigned.apk') (Join-Path $buildDir 'aligned.apk');CheckExit
$key=Join-Path $projectRoot '.android-tools/biscord-test.keystore'
if(-not (Test-Path -LiteralPath $key)){& (Join-Path $javaRoot 'bin/keytool.exe') -genkeypair -keystore $key -storepass android -keypass android -alias biscord-test -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Vulpi Test, O=Vulpi, C=BR';CheckExit}
$apk=Join-Path $outDir 'Vulpi-1.0.2-Android.apk'
& (Join-Path $buildTools 'apksigner.bat') sign --ks $key --ks-key-alias biscord-test --ks-pass pass:android --key-pass pass:android --out $apk (Join-Path $buildDir 'aligned.apk');CheckExit
& (Join-Path $buildTools 'apksigner.bat') verify --verbose $apk;CheckExit
& (Join-Path $buildTools 'aapt.exe') dump badging $apk;CheckExit
Write-Output "APK gerado: $apk"
$downloadDir=Join-Path $projectRoot 'dist/downloads'
New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
Copy-Item -LiteralPath $apk -Destination (Join-Path $downloadDir 'Vulpi-Android.apk') -Force
