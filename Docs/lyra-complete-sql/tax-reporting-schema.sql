-- ===========================================
-- LYRA DAC7 TAX REPORTING SCHEMA
-- HMRC compliance for UK platforms
-- ===========================================

-- =====================
-- 1. CREATOR TAX PROFILES
-- Required info for DAC7 reporting
-- =====================

CREATE TABLE IF NOT EXISTS creator_tax_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Required for DAC7
  legal_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,

  -- Tax identification
  national_insurance_number VARCHAR(20), -- UK NI number
  tax_identification_number VARCHAR(50), -- For non-UK
  tax_country VARCHAR(2) NOT NULL DEFAULT 'GB', -- ISO country code

  -- Address (required)
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  county VARCHAR(100),
  postcode VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL DEFAULT 'GB',

  -- Business details (if applicable)
  is_business BOOLEAN DEFAULT false,
  business_name VARCHAR(255),
  company_number VARCHAR(20), -- Companies House number
  vat_number VARCHAR(20),

  -- Verification
  id_verified BOOLEAN DEFAULT false,
  id_verified_at TIMESTAMPTZ,
  address_verified BOOLEAN DEFAULT false,
  address_verified_at TIMESTAMPTZ,

  -- Consent
  tax_reporting_consent BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_tax_profiles_creator ON creator_tax_profiles(creator_id);
CREATE INDEX idx_creator_tax_profiles_country ON creator_tax_profiles(tax_country);

-- =====================
-- 2. CREATOR EARNINGS
-- Track all earnings for reporting
-- =====================

CREATE TABLE IF NOT EXISTS creator_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id), -- Who paid

  -- Amounts
  gross_amount DECIMAL(10,2) NOT NULL, -- Total before fees
  platform_fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL, -- Creator receives

  -- Currency
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Type
  type VARCHAR(30) NOT NULL, -- 'subscription', 'ppv', 'message', 'tip', 'custom'
  reference_id VARCHAR(255), -- Content ID, subscription ID, etc.

  -- Payment tracking
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255), -- When paid out to creator

  -- Status
  status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'refunded', 'pending'

  -- Reporting
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  reported_to_hmrc BOOLEAN DEFAULT false,
  report_id UUID REFERENCES dac7_reports(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ
);

CREATE INDEX idx_creator_earnings_creator ON creator_earnings(creator_id);
CREATE INDEX idx_creator_earnings_tax_year ON creator_earnings(tax_year);
CREATE INDEX idx_creator_earnings_type ON creator_earnings(type);
CREATE INDEX idx_creator_earnings_created ON creator_earnings(created_at);
CREATE INDEX idx_creator_earnings_reported ON creator_earnings(reported_to_hmrc);

-- =====================
-- 3. DAC7 REPORTS
-- Annual HMRC submissions
-- =====================

CREATE TABLE IF NOT EXISTS dac7_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Report period
  tax_year INTEGER NOT NULL,
  quarter INTEGER, -- 1-4, if quarterly reporting

  -- Report details
  total_creators INTEGER NOT NULL,
  total_earnings DECIMAL(12,2) NOT NULL,
  total_platform_fees DECIMAL(12,2) NOT NULL,

  -- HMRC submission
  submission_status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'submitted', 'accepted', 'rejected'
  submitted_at TIMESTAMPTZ,
  hmrc_reference VARCHAR(100),
  hmrc_response TEXT,

  -- File
  report_file_url TEXT, -- Stored XML/CSV

  -- Meta
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),

  UNIQUE(tax_year, quarter)
);

CREATE INDEX idx_dac7_reports_year ON dac7_reports(tax_year);
CREATE INDEX idx_dac7_reports_status ON dac7_reports(submission_status);

-- =====================
-- 4. PAYOUT RECORDS
-- Track payments to creators
-- =====================

CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),

  -- Amounts
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Stripe
  stripe_transfer_id VARCHAR(255),
  stripe_payout_id VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

  -- Bank details (encrypted reference)
  bank_account_last4 VARCHAR(4),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX idx_creator_payouts_period ON creator_payouts(period_start, period_end);

-- =====================
-- RLS POLICIES
-- =====================

ALTER TABLE creator_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dac7_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

-- Creators manage own tax profile
CREATE POLICY "Creators manage own tax profile"
  ON creator_tax_profiles FOR ALL
  USING (auth.uid() = creator_id);

-- Creators view own earnings
CREATE POLICY "Creators view own earnings"
  ON creator_earnings FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators view own payouts
CREATE POLICY "Creators view own payouts"
  ON creator_payouts FOR SELECT
  USING (auth.uid() = creator_id);

-- Admin access (via service role) for reporting

-- =====================
-- FUNCTIONS
-- =====================

-- Function to calculate creator earnings for a period
CREATE OR REPLACE FUNCTION get_creator_earnings_summary(
  p_creator_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_gross DECIMAL,
  total_fees DECIMAL,
  total_net DECIMAL,
  subscription_earnings DECIMAL,
  ppv_earnings DECIMAL,
  message_earnings DECIMAL,
  other_earnings DECIMAL,
  transaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(gross_amount), 0) as total_gross,
    COALESCE(SUM(platform_fee), 0) as total_fees,
    COALESCE(SUM(net_amount), 0) as total_net,
    COALESCE(SUM(CASE WHEN type = 'subscription' THEN net_amount ELSE 0 END), 0) as subscription_earnings,
    COALESCE(SUM(CASE WHEN type = 'ppv' THEN net_amount ELSE 0 END), 0) as ppv_earnings,
    COALESCE(SUM(CASE WHEN type = 'message' THEN net_amount ELSE 0 END), 0) as message_earnings,
    COALESCE(SUM(CASE WHEN type NOT IN ('subscription', 'ppv', 'message') THEN net_amount ELSE 0 END), 0) as other_earnings,
    COUNT(*)::INTEGER as transaction_count
  FROM creator_earnings
  WHERE creator_id = p_creator_id
    AND status = 'completed'
    AND created_at >= p_start_date
    AND created_at < p_end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Function to get tax year summary for DAC7
CREATE OR REPLACE FUNCTION get_dac7_year_summary(p_tax_year INTEGER)
RETURNS TABLE (
  creator_id UUID,
  legal_name VARCHAR,
  ni_number VARCHAR,
  tax_country VARCHAR,
  total_earnings DECIMAL,
  platform_fees DECIMAL,
  transaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.creator_id,
    t.legal_name,
    t.national_insurance_number as ni_number,
    t.tax_country,
    SUM(e.net_amount) as total_earnings,
    SUM(e.platform_fee) as platform_fees,
    COUNT(*)::INTEGER as transaction_count
  FROM creator_earnings e
  JOIN creator_tax_profiles t ON e.creator_id = t.creator_id
  WHERE e.tax_year = p_tax_year
    AND e.status = 'completed'
  GROUP BY e.creator_id, t.legal_name, t.national_insurance_number, t.tax_country
  HAVING SUM(e.net_amount) > 0; -- Only include if they earned something
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate net_amount
CREATE OR REPLACE FUNCTION calculate_net_earnings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_amount = NEW.gross_amount - NEW.platform_fee;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER earnings_calculate_net
  BEFORE INSERT OR UPDATE ON creator_earnings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_net_earnings();
