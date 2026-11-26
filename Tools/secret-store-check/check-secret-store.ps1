param([string]$Folder = '', [string]$Repo = '', [string]$Work = '')
# Exercises BaSecretStore (switch + conversion of stored values) against a throwaway LocalDB instance.
# All values are fake; the shared tool database is never used. Prints PASS / FAIL lines and counts only. See README.md.
$ErrorActionPreference = 'Stop'
if (-not $Repo) { $Repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }
if (-not $Folder) { $Folder = Join-Path $Repo 'BADesign\bin' }
if (-not $Work) { $Work = Join-Path $env:TEMP 'BaSecretCheck' }
[void][System.Reflection.Assembly]::LoadFrom((Join-Path $Folder 'Newtonsoft.Json.dll'))
[void][System.Reflection.Assembly]::LoadFrom((Join-Path $Folder 'BADesign.dll'))
$Store = [BADesign.Helpers.Security.BaSecretStore]
$Secret = [BADesign.Helpers.Security.BaSecret]
$JobSecrets = [BADesign.Helpers.BaJobSecrets]
$JobView = [BADesign.Helpers.BaJobView]

$instance = 'BaSecretCheck'
$dbName = 'BaSecretCheckDb'
$master = 'Server=(localdb)\' + $instance + ';Integrated Security=true;Database=master'
$app = 'Server=(localdb)\' + $instance + ';Integrated Security=true;Database=' + $dbName
$script:failures = 0
$script:checks = 0

function Check([string]$Name, [bool]$Ok, [string]$Detail = '') {
    $script:checks++
    if (-not $Ok) { $script:failures++ }
    Write-Output (('{0} {1} {2}' -f $(if ($Ok) { 'PASS' } else { 'FAIL' }), $Name, $Detail).TrimEnd())
}
function Same([string]$A, [string]$B) { return [string]::Equals($A, $B, [StringComparison]::Ordinal) }

function Invoke-NonQuery([string]$ConnectionString, [string]$Sql, [hashtable]$Parameters = @{}) {
    $conn = New-Object System.Data.SqlClient.SqlConnection $ConnectionString
    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $Sql
        foreach ($key in $Parameters.Keys) {
            $value = $Parameters[$key]
            if ($null -eq $value) { $value = [DBNull]::Value }
            [void]$cmd.Parameters.AddWithValue($key, $value)
        }
        return $cmd.ExecuteNonQuery()
    } finally { $conn.Dispose() }
}
function Invoke-Scalar([string]$ConnectionString, [string]$Sql) {
    $conn = New-Object System.Data.SqlClient.SqlConnection $ConnectionString
    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $Sql
        return $cmd.ExecuteScalar()
    } finally { $conn.Dispose() }
}
function Read-Pairs([string]$Sql) {
    $result = @{}
    $conn = New-Object System.Data.SqlClient.SqlConnection $app
    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $Sql
        $r = $cmd.ExecuteReader()
        while ($r.Read()) {
            $result[[string]$r.GetValue(0)] = $(if ($r.IsDBNull(1)) { $null } else { $r.GetString(1) })
        }
        $r.Dispose()
    } finally { $conn.Dispose() }
    return $result
}
function Invoke-ScriptFile([string]$Path, [int]$OnlyBatches = 0) {
    $text = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
    $batches = [regex]::Split($text, '(?im)^\s*GO\s*$') | Where-Object { $_.Trim().Length -gt 0 }
    $index = 0
    foreach ($batch in $batches) {
        $index++
        if ($OnlyBatches -gt 0 -and $index -gt $OnlyBatches) { break }
        [void](Invoke-NonQuery $app $batch)
    }
}
function Read-State() {
    return @{
        Servers  = Read-Pairs 'SELECT Id, Password FROM BaDatabaseServer'
        Settings = Read-Pairs 'SELECT [Key], [Value] FROM BaAppSetting'
        Jobs     = Read-Pairs 'SELECT Id, Payload FROM BaJob'
    }
}
function Same-State($A, $B) {
    foreach ($table in 'Servers', 'Settings', 'Jobs') {
        if ($A[$table].Count -ne $B[$table].Count) { return $false }
        foreach ($key in $A[$table].Keys) {
            if (-not (Same $A[$table][$key] $B[$table][$key])) { return $false }
        }
    }
    return $true
}

cmd /c ('sqllocaldb stop ' + $instance + ' -k >nul 2>&1')
cmd /c ('sqllocaldb delete ' + $instance + ' >nul 2>&1')
if (Test-Path $Work) { Remove-Item -Recurse -Force $Work }
[void](New-Item -ItemType Directory -Force $Work)
cmd /c ('sqllocaldb create ' + $instance + ' -s >nul 2>&1')

try {
    $dataFile = Join-Path $Work ($dbName + '.mdf')
    $logFile = Join-Path $Work ($dbName + '_log.ldf')
    [void](Invoke-NonQuery $master ("CREATE DATABASE [$dbName] ON (NAME = N'data', FILENAME = N'$dataFile') LOG ON (NAME = N'log', FILENAME = N'$logFile')"))
    Invoke-ScriptFile (Join-Path $Repo 'BADesign\Scripts\AddBaAppSetting.sql') 1
    Invoke-ScriptFile (Join-Path $Repo 'BADesign\Scripts\AddBaDatabaseSearch.sql')
    Invoke-ScriptFile (Join-Path $Repo 'BADesign\Scripts\AddBaJob.sql')

    # ---- seed (fake values only) ----
    $fake = 'TEST-not-a-real-secret'
    $accented = [string][char]0x1EBF
    $passwords = New-Object System.Collections.Generic.List[string]
    for ($i = 1; $i -le 15; $i++) { $passwords.Add('TEST-pw-' + $i) }
    $passwords.Add(('p' * 100))
    $passwords.Add(($accented * 30))
    $passwords.Add('TEST;pw=with"quotes'' and spaces ')
    $passwords.Add(('q' * 127))
    $passwords.Add(('r' * 128))
    foreach ($pw in $passwords) {
        [void](Invoke-NonQuery $app 'INSERT INTO BaDatabaseServer (ServerName, Port, Username, Password) VALUES (@s, NULL, @u, @p)' @{ '@s' = 'TEST-SERVER'; '@u' = 'test'; '@p' = $pw })
    }
    $settings = [ordered]@{
        'SftpPassword' = 'TEST-sftp-secret'; 'EmailServer_Password' = 'TEST-mail-secret'; 'Telegram_BotToken' = '';
        'EmailServer_Username' = 'test@example.com'; 'App_ResetPasswordDefault' = '1'
    }
    foreach ($key in $settings.Keys) {
        [void](Invoke-NonQuery $app 'INSERT INTO BaAppSetting ([Key], [Value]) VALUES (@k, @v)' @{ '@k' = $key; '@v' = $settings[$key] })
    }
    $conn = 'Server=TEST-SERVER;Database=TEST_DB;User Id=test;Password=' + $fake
    $secretJobs = 0
    function Add-Job([string]$Type, $Payload, [string]$Status = 'Completed') {
        [void](Invoke-NonQuery $app 'INSERT INTO BaJob (JobType, StartedByUserId, Status, Payload) VALUES (@t, 1, @s, @p)' @{ '@t' = $Type; '@s' = $Status; '@p' = $Payload })
    }
    for ($i = 0; $i -lt 59; $i++) {
        Add-Job 'HRHelperUpdateUser' ('{"connectionString":"' + $conn + '","userIds":[' + $i + ',2],"isUpdatePassword":true,"password":"' + $fake + '","methodHash":1,"isUpdateEmail":true,"email":"test@example.com","ignoreWindowsAD":false}'); $secretJobs++
    }
    Add-Job 'HRHelperUpdateUser' ('{"connectionString":"' + $conn + '","userIds":[1],"isUpdatePassword":false,"password":"","methodHash":1,"isUpdateEmail":true,"email":"test@example.com","ignoreWindowsAD":false}') 'Pending'; $secretJobs++
    for ($i = 0; $i -lt 30; $i++) { Add-Job 'HRHelperUpdateUserSignature' ('{"connectionString":"' + $conn + '","userIds":[' + $i + ']}'); $secretJobs++ }
    for ($i = 0; $i -lt 39; $i++) {
        Add-Job 'HRHelperUpdateEmployee' ('{"connectionString":"' + $conn + '","companyID":2,"employeeIds":[101,102],"updPersonal":true,"personalEmail":"a@example.com","updBasic":true,"basicSalary":15000000.50}'); $secretJobs++
    }
    $manyIds = (1..11000 | ForEach-Object { 100000 + $_ }) -join ','
    Add-Job 'HRHelperUpdateEmployee' ('{"connectionString":"' + $conn + '","companyID":null,"employeeIds":[' + $manyIds + '],"updPersonal":false,"personalEmail":"","updBasic":false,"basicSalary":0.0}'); $secretJobs++
    for ($i = 0; $i -lt 20; $i++) {
        Add-Job 'HRHelperUpdateOther' ('{"connectionString":"' + $conn + '","tenantID":1,"companyID":2,"isUpdateAll":true,"commonEmail":"c@example.com","outgoingServer":"smtp.example.com","serverPort":587,"userName":"mailer","password":"' + $fake + '","enableSSL":true,"sslPort":null}'); $secretJobs++
    }
    for ($i = 0; $i -lt 12; $i++) {
        Add-Job 'HRHelperMultiDbReset' ('{"databaseCount":2,"email":"test@example.com","phone":"0900000000","emailToNull":false,"phoneToNull":false,"databaseNames":["TEST_DB","TEST_DB_2"],"connectionStrings":[{"DatabaseName":"TEST_DB","ConnectionString":"' + $conn + '"},{"DatabaseName":"TEST_DB_2","ConnectionString":"' + $conn + ';Connect Timeout=5"}]}'); $secretJobs++
    }
    for ($i = 0; $i -lt 5; $i++) { Add-Job 'HRHelperMultiDbReset' '{"sanitize":{"email":"test@example.com","phone":"0900000000","password":"1","keepRealSalary":false},"serverId":3,"databaseNames":["TEST_DB"],"databaseCount":1,"email":"test@example.com","phone":"0900000000"}' }
    for ($i = 0; $i -lt 10; $i++) { Add-Job 'Restore' '{"withReplace":true,"withAutoReset":true,"emailForReset":"test@example.com","passwordForReset":"1","lang":"vi"}' }
    for ($i = 0; $i -lt 3; $i++) { Add-Job 'HRHelperMultiDbAnalyze' '{"multiGuid":"0f8fad5bd9cb469fa16570867728950e","list":[{"database":"TEST_DB","status":"NotReset","reason":"x"}]}' }
    Add-Job 'HRHelperDeleteEmployee' '[{"localId":"E001","name":"Test"}]'
    Add-Job 'HRHelperDeleteEmployee' '[{"localId":"E002","name":null}]'
    Add-Job 'Backup' '{"lang":"vi"}'
    Add-Job 'HRHelperUpdateUser' $null
    $expected = 20 + 2 + $secretJobs
    $original = Read-State
    Write-Output ('seeded: servers=' + $original.Servers.Count + ' settings=' + $original.Settings.Count + ' jobs=' + $original.Jobs.Count + ' stored secrets=' + $expected)

    # ---- switch off (default) ----
    $status = $Store::Status($app)
    Check 'status while off' ((-not $status.On) -and $status.PlainCount -eq $expected -and $status.ProtectedCount -eq 0) ('plain=' + $status.PlainCount + ' protected=' + $status.ProtectedCount)
    Check 'ForStorage while off keeps plain text' (Same ($Store::ForStorage($app, $fake)) $fake)
    Check 'PayloadForStorage while off keeps the payload' (Same ($Store::PayloadForStorage($app, $original.Jobs['1'])) $original.Jobs['1'])

    # ---- column too narrow: refuse, change nothing ----
    $message = ''
    try { [void]$Store::Switch($app, $true, 1) } catch { $message = $_.Exception.GetBaseException().Message }
    Check 'narrow column: switch on is refused and names the script' ($message -like '*AddStoredSecretEncryption.sql*')
    Check 'narrow column: nothing changed' ((Same-State $original (Read-State)) -and -not $Store::IsOn($app))

    $widen = Join-Path $Repo 'BADesign\Scripts\AddStoredSecretEncryption.sql'
    Invoke-ScriptFile $widen
    Invoke-ScriptFile $widen
    $bytes = Invoke-Scalar $app "SELECT COL_LENGTH('dbo.BaDatabaseServer', 'Password')"
    $nullable = Invoke-Scalar $app "SELECT CAST(COLUMNPROPERTY(OBJECT_ID('dbo.BaDatabaseServer'), 'Password', 'AllowsNull') AS INT)"
    Check 'widening script (run twice): column is NVARCHAR(1024) NOT NULL' ($bytes -eq 2048 -and $nullable -eq 0) ('bytes=' + $bytes)
    Check 'widening script: data untouched' (Same-State $original (Read-State))

    # ---- a failure in the middle rolls everything back ----
    [void](Invoke-NonQuery $app "ALTER TABLE BaJob ADD CONSTRAINT CK_BaJob_Tmp CHECK (Payload NOT LIKE N'%enc:v1:%')")
    $failed = $false
    try { [void]$Store::Switch($app, $true, 1) } catch { $failed = $true }
    Check 'failure while converting jobs: the call fails' $failed
    Check 'failure while converting jobs: servers, settings and switch rolled back' ((Same-State $original (Read-State)) -and -not $Store::IsOn($app))
    [void](Invoke-NonQuery $app 'ALTER TABLE BaJob DROP CONSTRAINT CK_BaJob_Tmp')

    # ---- switch on ----
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = $Store::Switch($app, $true, 1)
    $watch.Stop()
    Write-Output ('switch on took ' + [math]::Round($watch.Elapsed.TotalMilliseconds) + ' ms for ' + $result.ChangedCount + ' values')
    Check 'switch on: every stored secret changed' ($result.On -and $result.ChangedCount -eq $expected -and $result.ProtectedCount -eq $expected -and $result.PlainCount -eq 0) ('changed=' + $result.ChangedCount)
    $on = Read-State
    $bad = 0
    foreach ($id in $original.Servers.Keys) {
        $stored = $on.Servers[$id]
        if (-not $stored.StartsWith('enc:v1:') -or -not (Same ($Secret::Reveal($stored)) $original.Servers[$id])) { $bad++ }
    }
    Check 'switch on: 20 server passwords protected and readable' ($bad -eq 0) ('bad=' + $bad)
    $longest = ($on.Servers.Values | Measure-Object -Property Length -Maximum).Maximum
    Check 'switch on: longest protected password fits' ($longest -le 1024) ('longest=' + $longest)
    $okSettings = $on.Settings['SftpPassword'].StartsWith('enc:v1:') -and $on.Settings['EmailServer_Password'].StartsWith('enc:v1:') `
        -and (Same ($Secret::Reveal($on.Settings['SftpPassword'])) 'TEST-sftp-secret') -and (Same ($Secret::Reveal($on.Settings['EmailServer_Password'])) 'TEST-mail-secret') `
        -and (Same $on.Settings['Telegram_BotToken'] '') -and (Same $on.Settings['EmailServer_Username'] 'test@example.com') -and (Same $on.Settings['App_ResetPasswordDefault'] '1') `
        -and (Same $on.Settings['Security_EncryptStoredSecrets'] '1')
    Check 'switch on: secret settings protected, other settings untouched, switch row = 1' $okSettings
    $badSecretJobs = 0; $badOtherJobs = 0; $leaks = 0
    foreach ($id in $original.Jobs.Keys) {
        $before = $original.Jobs[$id]; $after = $on.Jobs[$id]
        if ($null -ne $before -and $before.Contains('onnectionString')) {
            if ($after.Contains($fake) -or $after.Contains('Password=') -or $after.Contains('TEST-SERVER')) { $leaks++ }
            $sameForRunner = [Newtonsoft.Json.Linq.JToken]::DeepEquals([Newtonsoft.Json.Linq.JObject]::Parse($before), $JobSecrets::Read($after))
            $sameForBrowser = Same ($JobView::Payload($before)) ($JobView::Payload($after))
            if (-not $sameForRunner -or -not $sameForBrowser) { $badSecretJobs++ }
        } elseif (-not (Same $before $after)) { $badOtherJobs++ }
    }
    Check 'switch on: no job payload still holds a connection string or password in clear' ($leaks -eq 0) ('leaks=' + $leaks)
    Check 'switch on: job runners and the browser view get the same values as before' ($badSecretJobs -eq 0) ('bad=' + $badSecretJobs)
    Check 'switch on: restore / sanitize / analyze / delete / backup payloads untouched' ($badOtherJobs -eq 0) ('bad=' + $badOtherJobs)

    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $status = $Store::Status($app)
    $watch.Stop()
    Write-Output ('status took ' + [math]::Round($watch.Elapsed.TotalMilliseconds) + ' ms')
    Check 'status while on' ($status.On -and $status.ProtectedCount -eq $expected -and $status.PlainCount -eq 0) ('plain=' + $status.PlainCount + ' protected=' + $status.ProtectedCount)
    $stored = $Store::ForStorage($app, $fake)
    Check 'ForStorage while on protects' ($stored.StartsWith('enc:v1:') -and (Same ($Secret::Reveal($stored)) $fake))
    $storedPayload = $Store::PayloadForStorage($app, $original.Jobs['1'])
    Check 'PayloadForStorage while on protects' ((-not $storedPayload.Contains($fake)) -and [Newtonsoft.Json.Linq.JToken]::DeepEquals([Newtonsoft.Json.Linq.JObject]::Parse($original.Jobs['1']), $JobSecrets::Read($storedPayload)))
    $again = $Store::Switch($app, $true, 1)
    Check 'switch on again: nothing left to change' ($again.ChangedCount -eq 0 -and (Same-State $on (Read-State)))

    # ---- an old copy writes plain text while the switch is on ----
    [void](Invoke-NonQuery $app 'INSERT INTO BaDatabaseServer (ServerName, Port, Username, Password) VALUES (@s, NULL, @u, @p)' @{ '@s' = 'TEST-SERVER-2'; '@u' = 'test'; '@p' = 'TEST-late-plain' })
    $status = $Store::Status($app)
    Check 'late plain value is counted' ($status.PlainCount -eq 1 -and $status.ProtectedCount -eq $expected)
    $again = $Store::Switch($app, $true, 1)
    Check 'late plain value is converted by pressing on again' ($again.ChangedCount -eq 1 -and $again.PlainCount -eq 0)
    [void](Invoke-NonQuery $app "DELETE FROM BaDatabaseServer WHERE ServerName = N'TEST-SERVER-2'")

    # ---- rows read inside the transaction stay locked until it ends ----
    $holder = New-Object System.Data.SqlClient.SqlConnection $app
    $holder.Open()
    $tx = $holder.BeginTransaction()
    $cmd = $holder.CreateCommand(); $cmd.Transaction = $tx
    $cmd.CommandText = "SELECT Id, Password FROM BaDatabaseServer WITH (UPDLOCK) WHERE ISNULL(Password, N'') <> N''"
    $r = $cmd.ExecuteReader(); while ($r.Read()) { }; $r.Dispose()
    $blocked = $false
    try { [void](Invoke-NonQuery $app 'SET LOCK_TIMEOUT 1500; UPDATE BaDatabaseServer SET UpdatedAt = SYSDATETIME() WHERE Id = 1') } catch { $blocked = ($_.Exception.GetBaseException().Number -eq 1222) }
    $tx.Rollback(); $holder.Dispose()
    $freed = (Invoke-NonQuery $app 'SET LOCK_TIMEOUT 1500; UPDATE BaDatabaseServer SET UpdatedAt = NULL WHERE Id = 1') -eq 1
    Check 'scan with UPDLOCK blocks another writer until the transaction ends' ($blocked -and $freed)

    # ---- switch off ----
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = $Store::Switch($app, $false, 1)
    $watch.Stop()
    Write-Output ('switch off took ' + [math]::Round($watch.Elapsed.TotalMilliseconds) + ' ms for ' + $result.ChangedCount + ' values')
    Check 'switch off: every stored secret changed back' ((-not $result.On) -and $result.ChangedCount -eq $expected -and $result.PlainCount -eq $expected -and $result.ProtectedCount -eq 0) ('changed=' + $result.ChangedCount)
    $off = Read-State
    $switchRow = $off.Settings['Security_EncryptStoredSecrets']
    $off.Settings.Remove('Security_EncryptStoredSecrets')
    Check 'switch off: every value is exactly the original text, switch row = 0' ((Same-State $original $off) -and (Same $switchRow '0'))
    $status = $Store::Status($app)
    Check 'status after switching off' ((-not $status.On) -and $status.PlainCount -eq $expected -and $status.ProtectedCount -eq 0)

    Write-Output ('RESULT checks=' + $script:checks + ' failures=' + $script:failures)
}
finally {
    [System.Data.SqlClient.SqlConnection]::ClearAllPools()
    cmd /c ('sqllocaldb stop ' + $instance + ' -k >nul 2>&1')
    cmd /c ('sqllocaldb delete ' + $instance + ' >nul 2>&1')
    if (Test-Path $Work) { Remove-Item -Recurse -Force $Work -ErrorAction SilentlyContinue }
    Write-Output ('cleanup: instance deleted, work folder present=' + (Test-Path $Work))
}
