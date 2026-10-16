export interface EnvValidationResult {
  valid: boolean;
  issues: string[];
  config: {
    supabaseUrlConfigured: boolean;
    supabaseKeyConfigured: boolean;
    supabaseKeyType: 'ANON' | 'PUBLISHABLE' | 'MISSING';
    serviceRoleConfigured: boolean;
    jwtSecretConfigured: boolean;
    adminEmailConfigured: boolean;
    nodeEnv: string;
    siteUrl: string;
  };
}

export function validateAuthEnvironment(): EnvValidationResult {
  const issues: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const effectiveKey = anonKey || pubKey;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.JWT_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL;

  // Supabase URL Check
  if (!supabaseUrl) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL is missing.');
  } else {
    try {
      const url = new URL(supabaseUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        issues.push('NEXT_PUBLIC_SUPABASE_URL must be a valid http or https URL.');
      }
    } catch {
      issues.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL format.');
    }
  }

  // Supabase Key Check
  let supabaseKeyType: 'ANON' | 'PUBLISHABLE' | 'MISSING' = 'MISSING';
  if (anonKey) {
    supabaseKeyType = 'ANON';
  } else if (pubKey) {
    supabaseKeyType = 'PUBLISHABLE';
  } else {
    issues.push('Neither NEXT_PUBLIC_SUPABASE_ANON_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is configured.');
  }

  // JWT Secret Check
  if (!jwtSecret || jwtSecret.length < 16) {
    issues.push('JWT_SECRET should be configured with at least 16 characters for token signing.');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maxlith-main.vercel.app';

  return {
    valid: issues.length === 0,
    issues,
    config: {
      supabaseUrlConfigured: !!supabaseUrl,
      supabaseKeyConfigured: !!effectiveKey,
      supabaseKeyType,
      serviceRoleConfigured: !!serviceKey,
      jwtSecretConfigured: !!jwtSecret,
      adminEmailConfigured: !!adminEmail,
      nodeEnv: process.env.NODE_ENV || 'development',
      siteUrl,
    },
  };
}
