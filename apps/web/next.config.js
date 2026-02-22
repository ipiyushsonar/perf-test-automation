/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@perf-test/types', '@perf-test/db', '@perf-test/test-runner'],
  serverExternalPackages: [
    '@libsql/client',
    'ssh2',
    'cpu-features',
  ],
  webpack(config, { isServer }) {
    // Prevent webpack from trying to bundle native Node addons (.node files).
    // These are loaded at runtime by ssh2/cpu-features and must not be parsed.
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Tell webpack to treat ssh2 and its native sub-deps as external so it
    // never walks into their source during the server bundle.
    if (isServer) {
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean);

      config.externals = [
        ...existingExternals,
        'ssh2',
        'cpu-features',
        ({ request }, callback) => {
          if (/\.node$/.test(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
};

module.exports = nextConfig;
