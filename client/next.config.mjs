const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: process.env.S3_DEFAULT_BUCKET,
                port: "",
                pathname: "/**",
            }
        ]
    }
};

export default nextConfig;
