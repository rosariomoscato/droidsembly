param([Parameter(Mandatory=$true)][string]$PlanFile)
$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe).Source
$loader = ([Uri](Join-Path $source 'node_modules\tsx\dist\loader.mjs')).AbsoluteUri
$script = Join-Path $PSScriptRoot 'opencodeBoxGate.ts'
& $node --import $loader $script --plan $PlanFile --check
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed. No secrets requested or cloud actions performed.' }
$a = Read-Host 'Dedicated Upstash Box key (protected)' -AsSecureString
$b = Read-Host 'Fine-grained GitHub token, selected test repository only (protected)' -AsSecureString
$pa=[IntPtr]::Zero
$pb=[IntPtr]::Zero
try {
  $pa=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($a)
  $pb=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($b)
  $info=[System.Diagnostics.ProcessStartInfo]::new()
  $info.FileName=$node
  $info.Arguments='--import "'+$loader+'" "'+$script+'" --plan "'+([IO.Path]::GetFullPath($PlanFile))+'" --execute-approved'
  $info.WorkingDirectory=$source
  $info.UseShellExecute=$false
  $keep=@('SystemRoot','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMDATA','HOMEDRIVE','HOMEPATH','USERNAME','OS','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS')
  foreach($name in @($info.EnvironmentVariables.Keys)){if($keep -notcontains $name){$info.EnvironmentVariables.Remove($name)}}
  $info.EnvironmentVariables['DS_TEST_UPSTASH_KEY']=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pa)
  $info.EnvironmentVariables['DS_TEST_GITHUB_TOKEN']=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pb)
  $p=[System.Diagnostics.Process]::new()
  $p.StartInfo=$info
  [void]$p.Start()
  $info.EnvironmentVariables.Remove('DS_TEST_UPSTASH_KEY')
  $info.EnvironmentVariables.Remove('DS_TEST_GITHUB_TOKEN')
  $p.WaitForExit()
  $result=$p.ExitCode
} finally {
  if($pa -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pa)}
  if($pb -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pb)}
  $a.Dispose()
  $b.Dispose()
}
if ($result -ne 0) {
  [Console]::WriteLine('STOP. Runner exit code: ' + $result + '. Read the safe stage/category above; no automatic retry.')
  [void](Read-Host 'Press Enter to close (do not enter credentials here)')
}
exit $result
