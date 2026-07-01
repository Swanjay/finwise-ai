#!/bin/bash

# Script untuk menjalankan database migration
# Pastikan Anda sudah login ke Supabase CLI

echo "=== Database Migration Script ==="

# 1. Jalankan migration untuk invite_codes table
echo "1. Migrasi tabel invite_codes..."
supabase db push --schema sql/004_invite_codes.sql

echo "Migration selesai!"
echo "Pastikan tabel berikut sudah dibuat:"
echo "- invite_codes (code, plan_tier, is_active, max_uses, uses, created_by, notes, expires_at)"
echo "- users_plan (user_id, plan_tier, source_code, assigned_at)"

echo ""
echo "=== Setup Instructions ==="
echo "1. Pastikan Supabase CLI terinstall: npm install -g supabase"
echo "2. Login ke project: supabase login"
echo "3. Jalankan script ini: bash migrate.sh"