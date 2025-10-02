-- Create Coffee purchase record for jamie.watters.mail@icloud.com
-- Purchased on September 27, 2025 (5 days ago, within 30-day window)

INSERT INTO one_time_credits (
  user_id,
  credits_remaining,
  credits_total,
  product_type,
  purchased_at,
  refunded,
  created_at,
  updated_at
)
VALUES (
  24, -- Jamie's user ID
  73, -- Current credits remaining
  100, -- Total credits purchased
  'coffee',
  '2025-09-27 12:00:00+00', -- September 27, 2025
  false,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verify the insert
SELECT
  id,
  user_id,
  credits_remaining,
  product_type,
  purchased_at,
  refunded,
  EXTRACT(DAY FROM (NOW() - purchased_at)) as days_since_purchase,
  CASE
    WHEN (NOW() - purchased_at) <= INTERVAL '30 days' THEN 'ELIGIBLE ✅'
    ELSE 'NOT ELIGIBLE ❌'
  END as guarantee_status
FROM one_time_credits
WHERE user_id = 24;
