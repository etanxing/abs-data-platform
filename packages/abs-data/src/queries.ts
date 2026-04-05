import type { SuburbData } from "./types";

export async function getSuburbData(suburbName: string): Promise<SuburbData | null> {
  // TODO: Implement — fetch from API or D1 database
  void suburbName;
  return null;
}

export async function getPostcodeData(postcode: string): Promise<SuburbData[]> {
  // TODO: Implement — fetch all suburbs for a given postcode
  void postcode;
  return [];
}
