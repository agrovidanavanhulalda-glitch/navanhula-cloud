
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'lifetime';
