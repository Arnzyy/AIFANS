// ===========================================
// API ROUTE: /api/creator/tax-profile/route.ts
// Creator tax profile management
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  getCreatorTaxProfile,
  updateCreatorTaxProfile,
  validateNINumber,
  creatorNeedsTaxProfile,
} from '@/lib/tax/tax-service';

// GET - Get creator's tax profile
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getCreatorTaxProfile(supabase, user.id);
    const needsProfile = await creatorNeedsTaxProfile(supabase, user.id);

    return NextResponse.json({
      profile,
      needs_attention: needsProfile.needsProfile,
      attention_reason: needsProfile.reason,
    });
  } catch (error) {
    console.error('Get tax profile error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST/PUT - Update tax profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'legal_name',
      'date_of_birth',
      'address_line1',
      'city',
      'postcode',
      'country',
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate NI number format if provided
    if (body.national_insurance_number && body.tax_country === 'GB') {
      if (!validateNINumber(body.national_insurance_number)) {
        return NextResponse.json(
          { error: 'Invalid National Insurance number format' },
          { status: 400 }
        );
      }
    }

    // Validate date of birth (must be 18+)
    const dob = new Date(body.date_of_birth);
    const age = Math.floor(
      (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (age < 18) {
      return NextResponse.json({ error: 'Must be 18 or older' }, { status: 400 });
    }

    // Update profile
    const profile = await updateCreatorTaxProfile(supabase, user.id, {
      legal_name: body.legal_name,
      date_of_birth: body.date_of_birth,
      national_insurance_number: body.national_insurance_number,
      tax_identification_number: body.tax_identification_number,
      tax_country: body.tax_country || 'GB',
      address_line1: body.address_line1,
      address_line2: body.address_line2,
      city: body.city,
      county: body.county,
      postcode: body.postcode,
      country: body.country || 'GB',
      is_business: body.is_business || false,
      business_name: body.business_name,
      company_number: body.company_number,
      vat_number: body.vat_number,
      tax_reporting_consent: body.tax_reporting_consent,
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Update tax profile error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
