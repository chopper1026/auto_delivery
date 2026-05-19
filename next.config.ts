import type { NextConfig } from "next";

type ServerActionBodySizeLimit = NonNullable<
  NonNullable<NextConfig["experimental"]>["serverActions"]
>["bodySizeLimit"];

const adminUploadBodyLimit = (process.env.ADMIN_UPLOAD_BODY_LIMIT || "100mb") as ServerActionBodySizeLimit;

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: adminUploadBodyLimit,
    },
  },
};

export default nextConfig;
