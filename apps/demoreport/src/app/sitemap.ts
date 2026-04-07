import type { MetadataRoute } from "next";
import { SUBURBS } from "@/data/suburbs";

export const dynamic = "force-static";

const BASE_URL = "https://demoreport.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  const suburbRoutes: MetadataRoute.Sitemap = SUBURBS.map((suburb) => ({
    url: `${BASE_URL}/suburb/${suburb.slug}/`,
    lastModified: new Date("2024-12-01"),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date("2024-12-01"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/suburbs/`,
      lastModified: new Date("2024-12-01"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...suburbRoutes,
  ];
}
