/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  // ULASA performs no server-side computation at runtime. Every measure, parser
  // and report generator executes in the clinician's browser. This keeps the
  // hosted deployment inside any provider's free tier and means audio and
  // transcripts never leave the device. See docs/ADDENDUM_A_FREE_TIER.md.
  outputFileTracingIncludes: {},
  // In-browser Whisper (transformers.js) only needs its web build; keep the
  // Node-only backends out of the client bundle.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};
export default nextConfig;
