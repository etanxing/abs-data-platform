import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { base, BRAND } from "./styles";
import { PageShell } from "./PageShell";
import type { ReportData } from "../report-types";

const s = StyleSheet.create({
  indexCard: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  decileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  decileNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: BRAND.white,
  },
  indexBody: {
    flex: 1,
  },
  indexName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: BRAND.gray900,
    marginBottom: 1,
  },
  indexScore: {
    fontSize: 8,
    color: BRAND.gray500,
    marginBottom: 3,
  },
  decileBar: {
    height: 6,
    backgroundColor: BRAND.gray100,
    borderRadius: 3,
  },
  decileFill: {
    height: 6,
    borderRadius: 3,
  },
  interpretation: {
    fontSize: 8,
    color: BRAND.gray700,
    marginTop: 2,
  },
});

function decileColor(decile: number | null): string {
  if (decile == null) return BRAND.gray500;
  if (decile <= 2) return "#dc2626"; // red — most disadvantaged
  if (decile <= 4) return "#ea580c"; // orange
  if (decile <= 6) return BRAND.blue600;
  if (decile <= 8) return "#16a34a"; // green
  return "#15803d"; // dark green — least disadvantaged
}

function decileLabel(decile: number | null): string {
  if (decile == null) return "No data";
  if (decile <= 2) return "High disadvantage area";
  if (decile <= 4) return "Above-average disadvantage";
  if (decile <= 6) return "Average disadvantage";
  if (decile <= 8) return "Below-average disadvantage";
  return "Low disadvantage area";
}

const INDICES = [
  {
    key: "irsd" as const,
    decile: "irsdDecile" as const,
    name: "IRSD — Index of Relative Socio-economic Disadvantage",
    desc: "Summarises the relative disadvantage of an area. Low scores indicate areas with greater disadvantage.",
  },
  {
    key: "irsad" as const,
    decile: "irsadDecile" as const,
    name: "IRSAD — Index of Relative Socio-economic Advantage and Disadvantage",
    desc: "Summarises both advantage and disadvantage. Captures both ends of the socio-economic spectrum.",
  },
  {
    key: "ier" as const,
    decile: "ierDecile" as const,
    name: "IER — Index of Economic Resources",
    desc: "Focuses on financial aspects: income, housing costs, and wealth indicators.",
  },
  {
    key: "ieo" as const,
    decile: "ieoDecile" as const,
    name: "IEO — Index of Education and Occupation",
    desc: "Reflects educational attainment and skill levels of residents' occupations.",
  },
];

export function SeifaSection({ data }: { data: ReportData }) {
  const seifa = data.seifa;

  return (
    <PageShell suburb={data.suburb} pageNumber="5">
      <Text style={base.sectionTitle}>SEIFA Analysis</Text>
      <Text style={base.sectionSubtitle}>
        Socio-Economic Indexes for Areas 2021 — National decile rankings (1 = most disadvantaged, 10 = least)
      </Text>

      <View style={base.infoBox}>
        <Text style={base.infoBoxText}>
          SEIFA scores compare {data.suburb} to all other SA2s in Australia.
          A decile of 1 means the area is in the bottom 10% nationally (highest disadvantage).
          A decile of 10 means the area is in the top 10% (lowest disadvantage).
          The IRSD decile for this area is{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{seifa.irsdDecile ?? "not available"}</Text>,
          indicating {decileLabel(seifa.irsdDecile).toLowerCase()}.
        </Text>
      </View>

      {INDICES.map(({ key, decile: decileKey, name, desc }) => {
        const score = seifa[key];
        const decile = seifa[decileKey];
        const color = decileColor(decile);
        const barWidth = decile != null ? `${decile * 10}%` : "0%";

        return (
          <View key={key} style={[s.indexCard, { backgroundColor: BRAND.gray100 }]}>
            <View style={[s.decileCircle, { backgroundColor: color }]}>
              <Text style={s.decileNum}>{decile ?? "—"}</Text>
            </View>
            <View style={s.indexBody}>
              <Text style={s.indexName}>{name}</Text>
              <Text style={s.indexScore}>Score: {score ?? "—"}</Text>
              <View style={s.decileBar}>
                <View style={[s.decileFill, { width: barWidth, backgroundColor: color }]} />
              </View>
              <Text style={s.interpretation}>{decileLabel(decile)} · {desc}</Text>
            </View>
          </View>
        );
      })}

      <Text style={base.caveat}>
        Source: ABS SEIFA 2021. Scores are standardised to a mean of 1,000 and standard deviation of 100.
        Deciles are based on the population of all SA2s in Australia. SEIFA is produced every five years
        following the national Census of Population and Housing.
      </Text>
    </PageShell>
  );
}
