# Script para testar webhook WAHA
param(
    [string]$TenantId = "a0000000",
    [string]$Phone = "5511999999999"
)

$webhookUrl = "https://uoogxqtbasbvcmtgxzcu.supabase.co/functions/v1/waha-webhook"

$payload = @{
    event = "message"
    session = "tenant_$($TenantId.Substring(0,8))"
    payload = @{
        from = "${Phone}@c.us"
        body = "Teste de mensagem para IA"
        fromMe = $false
    }
} | ConvertTo-Json -Depth 10

Write-Host "Enviando webhook de teste..." -ForegroundColor Cyan
Write-Host $payload

$response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop

Write-Host "`nResposta:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10
