import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { base, BRAND } from "./styles";
import { PageShell } from "./PageShell";
import type { ReportData } from "../report-types";

const s = StyleSheet.create({
  citation: {
    marginBottom: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: BRAND.blue600,
    borderLeftStyle: "solid",
  },
  citationTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: BRAND.gray900,
    marginBottom: 2,
  },
  citationBody: {
    fontSize: 8,
    color: BRAND.gray700,
    lineHeight: 1.5,
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: BRAND.gray100,
    borderRadius: 6,
  },
  disclaimerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: BRAND.gray900,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: BRAND.gray700,
    lineHeight: 1.5,
  },
});

export function DataSources({ data }: { data: ReportData }) {
  return (
    <PageShell suburb={data.suburb} pageNumber="7">
      <Text style={base.sectionTitle}>Data Sources &amp; Methodology</Text>
      <Text style={base.sectionSubtitle}>
        All data in this report is sourced from official Australian Bureau of Statistics publications.
      </Text>

      <View style={s.citation}>
        <Text style={s.citationTitle}>
          ABS Census of Population and Housing 2021 — General Community Profile (GCP)
        </Text>
        <Text style={s.citationBody}>
          Australian Bureau of Statistics (2022). Census of Population and Housing, 2021.
          General Community Profile, Statistical Area Level 2 (SA2). Canberra: ABS.{"\n"}
          Tables used: G01 (Selected Person Characteristics), G02 (Selected Medians and Averages),
          G04 (Age by Sex), G33 (Tenure Type and Landlord Type), G51 (Language Spoken at Home).{"\n"}
          Geography: ASGS Edition 3, 2021. SA2: {data.sa2Code} — {data.suburb}.{"\n"}
          URL: abs.gov.au/census · © Commonwealth of Australia, CC BY 4.0
        </Text>
      </View>

      <View style={s.citation}>
        <Text style={s.citationTitle}>
          ABS Socio-Economic Indexes for Areas (SEIFA) 2021
        </Text>
        <Text style={s.citationBody}>
          Australian Bureau of Statistics (2023). Socio-Economic Indexes for Areas (SEIFA), Australia, 2021.
          Statistical Area Level 2 (SA2). Canberra: ABS.{"\n"}
          Indices: IRSD, IRSAD, IER, IEO. Scores standardised to mean 1,000 (SD 100).
          Decile rankings based on national SA2 population distribution.{"\n"}
          URL: abs.gov.au/seifa · © Commonwealth of Australia, CC BY 4.0
        </Text>
      </View>

      <View style={s.citation}>
        <Text style={s.citationTitle}>
          ASGS Edition 3 — Australian Statistical Geography Standard
        </Text>
        <Text style={s.citationBody}>
          Australian Bureau of Statistics (2021). Australian Statistical Geography Standard (ASGS),
          Edition 3, July 2021 — June 2026. Canberra: ABS.{"\n"}
          Correspondence used: Postcode 2021 to SA2 2021. SA2 name: {data.suburb}.{"\n"}
          URL: abs.gov.au/asgs · © Commonwealth of Australia, CC BY 4.0
        </Text>
      </View>

      <View style={s.disclaimer}>
        <Text style={s.disclaimerTitle}>Disclaimer</Text>
        <Text style={s.disclaimerText}>
          This report has been prepared using publicly available data from the Australian Bureau of Statistics.
          DemoReport has made reasonable efforts to ensure the accuracy of this information, but does not warrant
          its completeness or suitability for any particular purpose. Census data reflects the situation at the
          time of enumeration ({data.censusYear}) and demographic conditions may have changed since that date.{"\n\n"}
          This report does not constitute planning advice, legal advice, or a professional valuation.
          It should be used in conjunction with advice from qualified professionals.
          DemoReport is not affiliated with or endorsed by the Australian Bureau of Statistics.{"\n\n"}
          Report generated: {data.generatedAt} · SA2 Code: {data.sa2Code}
        </Text>
      </View>
    </PageShell>
  );
}
