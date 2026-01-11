-- ============================================
-- Seed automático: Tenant Master
-- ============================================

INSERT INTO tenants (
  id,
  type,
  name,
  status,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'master',
  'BRGestor Master',
  'active',
  now()
)
ON CONFLICT (id) DO NOTHING;
