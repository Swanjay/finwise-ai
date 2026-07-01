# Test Script: Invite Code Flow Testing
# Jalankan setelah migration selesai

echo "=== Invite Code Flow Test ==="

# 1. Generate test code via API
echo "1. Menghasilkan kode test..."
curl -X POST "https://finwise.my.id/api/invite-codes" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 1,
    "planTier": "pro",
    "maxUses": 1,
    "notes": "Test code for deployment"
  }' | jq

echo ""
echo "2. Validasi kode (ganti dengan kode yang dihasilkan):"
# Ganti PRO_TEST dengan kode yang dihasilkan
curl -X GET "https://finwise.my.id/api/invite-codes/validate/PRO_TEST" | jq

echo ""
echo "=== Test Selesai ==="
echo "Pastikan response valid: {\"valid\":true,\"code\":\"PRO_TEST\",\"plan_tier\":\"pro\"}"