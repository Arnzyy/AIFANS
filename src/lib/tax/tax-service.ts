// ===========================================
// LYRA DAC7 TAX REPORTING SERVICE
// HMRC compliance for UK platforms
// ===========================================

// Supabase client type (using any for compatibility with server client)
type SupabaseClient = any;

// ===========================================
// TYPES
// ===========================================

export interface CreatorTaxProfile {
  id: string;
  creator_id: string;
  legal_name: string;
  date_of_birth: string;
  national_insurance_number?: string;
  tax_identification_number?: string;
  tax_country: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  is_business: boolean;
  business_name?: string;
  company_number?: string;
  vat_number?: string;
  id_verified: boolean;
  address_verified: boolean;
  tax_reporting_consent: boolean;
}

export interface EarningsSummary {
  total_gross: number;
  total_fees: number;
  total_net: number;
  subscription_earnings: number;
  ppv_earnings: number;
  message_earnings: number;
  other_earnings: number;
  transaction_count: number;
}

export interface DAC7ReportEntry {
  creator_id: string;
  legal_name: string;
  ni_number?: string;
  tax_country: string;
  total_earnings: number;
  platform_fees: number;
  transaction_count: number;
}

// ===========================================
// TAX PROFILE MANAGEMENT
// ===========================================

/**
 * Get or create tax profile for creator
 */
export async function getCreatorTaxProfile(
  supabase: SupabaseClient,
  creatorId: string
): Promise<CreatorTaxProfile | null> {
  const { data } = await supabase
    .from('creator_tax_profiles')
    .select('*')
    .eq('creator_id', creatorId)
    .single();

  return data as CreatorTaxProfile | null;
}

/**
 * Update creator tax profile
 */
export async function updateCreatorTaxProfile(
  supabase: SupabaseClient,
  creatorId: string,
  profile: Partial<CreatorTaxProfile>
): Promise<CreatorTaxProfile | null> {
  const { data, error } = await supabase
    .from('creator_tax_profiles')
    .upsert(
      {
        creator_id: creatorId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'creator_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Tax profile update error:', error);
    return null;
  }

  return data as CreatorTaxProfile;
}

/**
 * Validate UK National Insurance number format
 */
export function validateNINumber(ni: string): boolean {
  // UK NI format: XX 00 00 00 X
  const niRegex = /^[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/i;
  return niRegex.test(ni.replace(/\s/g, ''));
}

// ===========================================
// EARNINGS TRACKING
// ===========================================

/**
 * Record a creator earning
 */
export async function recordEarning(
  supabase: SupabaseClient,
  earning: {
    creator_id: string;
    user_id?: string;
    gross_amount: number;
    platform_fee: number;
    type: 'subscription' | 'ppv' | 'message' | 'tip' | 'custom';
    reference_id?: string;
    stripe_payment_intent_id?: string;
  }
): Promise<boolean> {
  const { error } = await supabase.from('creator_earnings').insert({
    ...earning,
    net_amount: earning.gross_amount - earning.platform_fee,
    currency: 'GBP',
    tax_year: new Date().getFullYear(),
    status: 'completed',
  });

  if (error) {
    console.error('Record earning error:', error);
    return false;
  }

  return true;
}

/**
 * Get earnings summary for a creator
 */
export async function getCreatorEarningsSummary(
  supabase: SupabaseClient,
  creatorId: string,
  startDate: Date,
  endDate: Date
): Promise<EarningsSummary | null> {
  const { data, error } = await supabase.rpc('get_creator_earnings_summary', {
    p_creator_id: creatorId,
    p_start_date: startDate.toISOString().split('T')[0],
    p_end_date: endDate.toISOString().split('T')[0],
  });

  if (error) {
    console.error('Earnings summary error:', error);
    return null;
  }

  return data?.[0] as EarningsSummary;
}

// ===========================================
// DAC7 REPORTING
// ===========================================

/**
 * Generate DAC7 report data for a tax year
 */
export async function generateDAC7Report(
  supabase: SupabaseClient,
  taxYear: number
): Promise<DAC7ReportEntry[]> {
  const { data, error } = await supabase.rpc('get_dac7_year_summary', {
    p_tax_year: taxYear,
  });

  if (error) {
    console.error('DAC7 report generation error:', error);
    return [];
  }

  return data as DAC7ReportEntry[];
}

/**
 * Export DAC7 report as CSV
 */
export function exportDAC7AsCSV(
  entries: DAC7ReportEntry[],
  taxYear: number
): string {
  const headers = [
    'Creator ID',
    'Legal Name',
    'NI Number',
    'Tax Country',
    'Total Earnings (GBP)',
    'Platform Fees (GBP)',
    'Transaction Count',
  ];

  const rows = entries.map((e) => [
    e.creator_id,
    e.legal_name,
    e.ni_number || 'N/A',
    e.tax_country,
    e.total_earnings.toFixed(2),
    e.platform_fees.toFixed(2),
    e.transaction_count.toString(),
  ]);

  const csv = [
    `LYRA Platform - DAC7 Report - Tax Year ${taxYear}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    '',
    `Total Creators: ${entries.length}`,
    `Total Earnings: £${entries
      .reduce((sum, e) => sum + e.total_earnings, 0)
      .toFixed(2)}`,
  ];

  return csv.join('\n');
}

/**
 * Generate DAC7 XML for HMRC submission
 * Based on HMRC DAC7 XML schema
 */
export function generateDAC7XML(
  entries: DAC7ReportEntry[],
  taxYear: number,
  platformDetails: {
    name: string;
    tin: string; // Tax Identification Number
    address: string;
    country: string;
  }
): string {
  const timestamp = new Date().toISOString();

  // Simplified XML structure - actual HMRC schema is more complex
  const reportableItems = entries
    .map(
      (e) => `
    <ReportableSeller>
      <Identity>
        <Name>${escapeXML(e.legal_name)}</Name>
        <TIN issuedBy="${e.tax_country}">${e.ni_number || 'UNKNOWN'}</TIN>
      </Identity>
      <Address>
        <CountryCode>${e.tax_country}</CountryCode>
      </Address>
      <Consideration>
        <Amount currCode="GBP">${e.total_earnings.toFixed(2)}</Amount>
        <NumberOfTransactions>${e.transaction_count}</NumberOfTransactions>
      </Consideration>
      <Fees>
        <Amount currCode="GBP">${e.platform_fees.toFixed(2)}</Amount>
      </Fees>
    </ReportableSeller>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DAC7_Report xmlns="urn:oecd:ties:dac7:v1">
  <MessageHeader>
    <SendingEntityIN>${platformDetails.tin}</SendingEntityIN>
    <Timestamp>${timestamp}</Timestamp>
    <ReportingPeriod>${taxYear}</ReportingPeriod>
  </MessageHeader>
  <PlatformOperator>
    <Name>${escapeXML(platformDetails.name)}</Name>
    <TIN>${platformDetails.tin}</TIN>
    <Address>
      <AddressFix>${escapeXML(platformDetails.address)}</AddressFix>
      <CountryCode>${platformDetails.country}</CountryCode>
    </Address>
  </PlatformOperator>
  <ReportableSellers>
    ${reportableItems}
  </ReportableSellers>
  <Summary>
    <TotalSellers>${entries.length}</TotalSellers>
    <TotalConsideration currCode="GBP">${entries
      .reduce((sum, e) => sum + e.total_earnings, 0)
      .toFixed(2)}</TotalConsideration>
  </Summary>
</DAC7_Report>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Save DAC7 report to database
 */
export async function saveDAC7Report(
  supabase: SupabaseClient,
  report: {
    tax_year: number;
    total_creators: number;
    total_earnings: number;
    total_platform_fees: number;
    report_file_url?: string;
  },
  generatedBy: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('dac7_reports')
    .insert({
      ...report,
      submission_status: 'draft',
      generated_at: new Date().toISOString(),
      generated_by: generatedBy,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Save DAC7 report error:', error);
    return null;
  }

  return data.id;
}

/**
 * Get reportable creators (those above threshold)
 * DAC7 threshold: €2,000 or 30 transactions
 */
export async function getReportableCreators(
  supabase: SupabaseClient,
  taxYear: number
): Promise<DAC7ReportEntry[]> {
  const allEntries = await generateDAC7Report(supabase, taxYear);

  // DAC7 reporting threshold
  const EUR_THRESHOLD = 2000;
  const TRANSACTION_THRESHOLD = 30;
  const GBP_EUR_RATE = 0.85; // Approximate, should use actual rate
  const GBP_THRESHOLD = EUR_THRESHOLD * GBP_EUR_RATE;

  return allEntries.filter(
    (e) =>
      e.total_earnings >= GBP_THRESHOLD ||
      e.transaction_count >= TRANSACTION_THRESHOLD
  );
}

// ===========================================
// CREATOR DASHBOARD HELPERS
// ===========================================

/**
 * Get creator's earnings breakdown for dashboard
 */
export async function getCreatorDashboardEarnings(
  supabase: SupabaseClient,
  creatorId: string
): Promise<{
  today: EarningsSummary | null;
  thisWeek: EarningsSummary | null;
  thisMonth: EarningsSummary | null;
  thisYear: EarningsSummary | null;
  allTime: EarningsSummary | null;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const veryOldDate = new Date(2020, 0, 1);

  const [today, thisWeek, thisMonth, thisYear, allTime] = await Promise.all([
    getCreatorEarningsSummary(supabase, creatorId, startOfDay, now),
    getCreatorEarningsSummary(supabase, creatorId, startOfWeek, now),
    getCreatorEarningsSummary(supabase, creatorId, startOfMonth, now),
    getCreatorEarningsSummary(supabase, creatorId, startOfYear, now),
    getCreatorEarningsSummary(supabase, creatorId, veryOldDate, now),
  ]);

  return { today, thisWeek, thisMonth, thisYear, allTime };
}

/**
 * Check if creator needs to complete tax profile
 */
export async function creatorNeedsTaxProfile(
  supabase: SupabaseClient,
  creatorId: string
): Promise<{
  needsProfile: boolean;
  reason?: string;
}> {
  // Check earnings
  const thisYear = await getCreatorEarningsSummary(
    supabase,
    creatorId,
    new Date(new Date().getFullYear(), 0, 1),
    new Date()
  );

  if (!thisYear || thisYear.total_net < 100) {
    return { needsProfile: false };
  }

  // Check if profile exists
  const profile = await getCreatorTaxProfile(supabase, creatorId);

  if (!profile) {
    return {
      needsProfile: true,
      reason:
        "You've earned over £100 this year. Please complete your tax profile for HMRC reporting.",
    };
  }

  if (!profile.tax_reporting_consent) {
    return {
      needsProfile: true,
      reason: 'Please review and consent to tax reporting requirements.',
    };
  }

  if (!profile.national_insurance_number && profile.tax_country === 'GB') {
    return {
      needsProfile: true,
      reason:
        'Please add your National Insurance number for UK tax reporting.',
    };
  }

  return { needsProfile: false };
}
