# push_contributions.ps1
$totalCommits = 80
$batchSize = 10
$repoPath = "c:\Hackahon project\Pixie\PIXIE"

Set-Location $repoPath

# Initial add of all files if they are not tracked
git add .
git commit -m "Initial commit: Project structure and files"

# Create or clear heartbeat file
"Commit History Start" > heartbeat.txt

for ($i = 2; $i -le $totalCommits; $i++) {
    "Contribution increment $i at $(Get-Date)" >> heartbeat.txt
    git add heartbeat.txt
    git commit -m "Contribution increment $i"
    
    if ($i % $batchSize -eq 0) {
        Write-Host "Pushing batch up to $i..."
        git push origin main
    }
}

# Final push if not already pushed
git push origin main
Write-Host "Completed 80 commits and pushed to GitHub."
