import type { SuburbData } from "@abs/data";

export interface ReportOptions {
  title?: string;
  includeSeifa?: boolean;
  includeHousing?: boolean;
}

export interface GeneratedReport {
  buffer: Uint8Array;
  filename: string;
}

// TODO: Implement with @react-pdf/renderer
export async function generateFeasibilityReport(
  data: SuburbData,
  options: ReportOptions = {}
): Promise<GeneratedReport> {
  void data;
  void options;
  throw new Error("generateFeasibilityReport: not yet implemented");
}

// TODO: Implement with @react-pdf/renderer
export async function generateNeedsAssessment(
  data: SuburbData[],
  options: ReportOptions = {}
): Promise<GeneratedReport> {
  void data;
  void options;
  throw new Error("generateNeedsAssessment: not yet implemented");
}
