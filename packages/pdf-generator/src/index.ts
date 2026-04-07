import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { FeasibilityReport } from "./FeasibilityReport";
import type { ReportData } from "./report-types";

export type { ReportData };

export interface GeneratedReport {
  buffer: Uint8Array;
  filename: string;
}

/**
 * Generate a DemoReport Feasibility Report PDF.
 *
 * @param data  Full report data (demographics, SEIFA, housing, language)
 * @returns     PDF as Uint8Array and a suggested filename
 *
 * Uses pdf() from @react-pdf/renderer — compatible with Cloudflare Workers
 * when wrangler resolves the browser build (conditions = ["browser"]).
 */
export async function generateFeasibilityReport(
  data: ReportData,
): Promise<GeneratedReport> {
  // Cast required: TypeScript can't infer that FeasibilityReport renders a Document
  const element = React.createElement(FeasibilityReport, { data }) as React.ReactElement<DocumentProps>;

  // pdf().toBlob() uses the browser-compatible code path (no Node.js APIs)
  const blob = await pdf(element).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const slug = data.suburb
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const filename = `demoreport-${slug}-${data.state.toLowerCase()}-${data.censusYear}.pdf`;

  return { buffer, filename };
}

/**
 * Stub — Phase 3 will implement a multi-suburb comparison report.
 */
export async function generateNeedsAssessment(
  data: ReportData[],
): Promise<GeneratedReport> {
  if (data.length === 0) throw new Error("generateNeedsAssessment: data array is empty");
  // For now, generate a feasibility report for the first suburb
  return generateFeasibilityReport(data[0]);
}
