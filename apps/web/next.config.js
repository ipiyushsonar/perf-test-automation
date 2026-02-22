/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@perf-test/types', '@perf-test/db', '@perf-test/test-runner'],
  serverExternalPackages: ['@libsql/client', 'ssh2'],
};

module.exports = nextConfig;
