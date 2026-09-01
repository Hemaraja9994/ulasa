/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ULASA performs no server-side computation at runtime. Every measure, parser
  // and report generator executes in the clinician's browser. This keeps the
  // hosted deployment inside any provider's free tier and means audio and
  // transcripts never leave the device. See docs/ADDENDUM_A_FREE_TIER.md.
  outputFileTracingIncludes: {},
};
export default nextConfig;
