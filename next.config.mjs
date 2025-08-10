/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === 'development' 
        ? ['localhost:3000'] 
        : [process.env.VERCEL_URL, process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean)
    }
  },
  images: {
    domains: process.env.NODE_ENV === 'development' 
      ? ['localhost'] 
      : ['images.unsplash.com', 'via.placeholder.com']
  },
  // Optimize for Vercel deployment
  swcMinify: true,
  compress: true
};

export default nextConfig;