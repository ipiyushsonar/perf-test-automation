/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@perf-test/types', '@perf-test/db', '@perf-test/test-runner'],
  serverExternalPackages: [
    '@libsql/client',
    'ssh2',
    'cpu-features',
    'canvas',
    'chart.js',
  ],
  outputFileTracingExcludes: {
    '*': [
      '**/.next/cache/**/*',
      '**/.next/static/**/*',
      '**/node_modules/@swc/core-linux-x64-gnu/**/*',
      '**/node_modules/@swc/core-linux-x64-musl/**/*',
      '**/node_modules/@esbuild/linux-x64/**/*',
    ],
  },
  webpack(config, { isServer }) {
    // Prevent webpack from trying to bundle native Node addons (.node files).
    // These are loaded at runtime by ssh2/cpu-features/canvas and must not be parsed.
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Tell webpack to treat ssh2, canvas, chart.js and their native sub-deps as external so it
    // never walks into their source during the server bundle.
    if (isServer) {
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean);

      config.externals = [
        ...existingExternals,
        'ssh2',
        'cpu-features',
        'canvas',
        'chart.js',
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
