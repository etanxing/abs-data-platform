import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
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
 * Note: Uses @react-pdf/renderer. In Cloudflare Workers, ensure
 * `nodejs_compat` is enabled in wrangler.toml.
 */
export async function generateFeasibilityReport(
  data: ReportData,
): Promise<GeneratedReport> {
  // Cast required: TypeScript can't infer that FeasibilityReport renders a Document
  const element = React.createElement(FeasibilityReport, { data }) as React.ReactElement<DocumentProps>;
  const nodeBuffer = await renderToBuffer(element);

  // renderToBuffer returns a Node.js Buffer; coerce to Uint8Array for portability
  const buffer =
    nodeBuffer instanceof Uint8Array
      ? nodeBuffer
      : new Uint8Array(nodeBuffer.buffer, nodeBuffer.byteOffset, nodeBuffer.byteLength);

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
