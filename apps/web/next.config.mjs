/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@ims-pro/ui', '@ims-pro/i18n', '@ims-pro/types'],
  images: {
    domains: ['localhost'],
  },
}

export default nextConfig
