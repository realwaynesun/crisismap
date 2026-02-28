import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['fast-xml-parser'],
  outputFileTracingRoot: __dirname,
}

export default nextConfig
