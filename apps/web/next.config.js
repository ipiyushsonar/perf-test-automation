/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@perf-test/types', '@perf-test/db'],
  serverExternalPackages: ['@libsql/client'],
};

module.exports = nextConfig;
