# Dokumentasi Invite Code System

## 1. Database Schema

### Tables:
```sql
CREATE TABLE invite_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('pro', 'premium')),
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users_plan (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'premium')),
  source_code TEXT REFERENCES invite_codes(code),
  assigned_at TIMESTAMP DEFAULT NOW()
);
```

## 2. API Routes

### GET /api/invite-codes/users
```json
{
  "ok": true,
  "users": [
    {
      "user_id": "...",
      "plan_tier": "pro",
      "source_code": "PRO_A1B2",
      "assigned_at": "2026-07-01T...",
      "email": "user@example.com"
    }
  ]
}
```

### GET /api/invite-codes/validate/:code
```json
{
  "valid": true,
  "code": "PRO_A1B2",
  "plan_tier": "pro",
  "created_by": "admin@finny.biz.id"
}
```

### POST /api/invite-codes
```json
{
  "quantity": 5,
  "planTier": "pro",
  "maxUses": 1,
  "notes": "For family members",
  "expiresDays": 30
}
```

## 3. Login Flow dengan Invite Code

### Register
1. Input email + password
2. Optional: Masukkan kode invite (PRO_ atau PREM_)
3. Jika valid → plan langsung upgrade ke `pro` atau `premium`
4. Jika tidak → plan default `basic`

### Login
1. Input email + password
2. Optional: Masukkan kode invite
3. Jika valid → upgrade plan

## 4. Admin Panel
- `/admin/invite-codes`
- Generate bulk kode
- Filter user berdasarkan plan tier
- Lihat statistik penggunaan

## 5. Plan Tier Features
| Plan | Features | Monthly Price |
|---|---|---|
| **Basic** | 50 transaksi, 1 wallet, 5 kategori | FREE |
| **Pro** | Unlimited transaksi, budget, reports | Rp 10.000 |
| **Premium** | Pro + AI Advisor, receipt scan | Rp 20.000 |

## 6. Manual SQL untuk Check Data
```sql
-- Lihat semua kode aktif
SELECT * FROM invite_codes WHERE is_active = true ORDER BY created_at DESC;

-- Lihat user plan
SELECT u.email, up.plan_tier, ic.code FROM users_plan up
JOIN auth.users u ON up.user_id = u.id
LEFT JOIN invite_codes ic ON up.source_code = ic.code;

-- Upgrade user manual
UPDATE users_plan SET plan_tier = 'pro', source_code = 'PRO_TEST' WHERE user_id = '...';

-- Reset user ke basic
UPDATE users_plan SET plan_tier = 'basic', source_code = NULL WHERE user_id = '...';
```