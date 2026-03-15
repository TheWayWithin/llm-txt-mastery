-- Fix auth_users primary key sequence
-- Sequence was out of sync causing duplicate key errors on insert
SELECT setval(
  pg_get_serial_sequence('auth_users', 'id'),
  COALESCE((SELECT MAX(id) FROM auth_users), 0) + 1,
  false
);
