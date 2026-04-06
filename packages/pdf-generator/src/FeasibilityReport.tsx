import React from "react";
import { Document } from "@react-pdf/renderer";
import { CoverPage } from "./pdf/CoverPage";
import { PopulationSection } from "./pdf/PopulationSection";
import { HousingSection } from "./pdf/HousingSection";
import { SeifaSection } from "./pdf/SeifaSection";
import { LanguageSection } from "./pdf/LanguageSection";
import { DataSources } from "./pdf/DataSources";
import type { ReportData } from "./report-types";

export function FeasibilityReport({ data }: { data: ReportData }) {
  return (
    <Document
      title={`DemoReport — ${data.suburb} ${data.state}`}
      author="DemoReport"
      subject={`Demographic Feasibility Report — ${data.suburb}, ${data.state}`}
      keywords="ABS, Census, SEIFA, demographics, feasibility, property development"
      creator="DemoReport (demoreport.com.au)"
    >
      <CoverPage data={data} />
      <PopulationSection data={data} />
      <HousingSection data={data} />
      <SeifaSection data={data} />
      <LanguageSection data={data} />
      <DataSources data={data} />
    </Document>
  );
}
