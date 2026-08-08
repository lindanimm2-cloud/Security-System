import type { NextConfig } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const hasRealApi = Boolean(apiUrl && !/localhost|127\.0\.0\.1/.test(apiUrl));

/** Always bake demo ON for pitch deploys unless a real remote API is configured. */
const demoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'false' && hasRealApi ? 'false' : 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_DEMO_MODE: demoMode,
  },
};

export default nextConfig;
