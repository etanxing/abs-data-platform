import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://demoreport.com.au";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/report/", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
