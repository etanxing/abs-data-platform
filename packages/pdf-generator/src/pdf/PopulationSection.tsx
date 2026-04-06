import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base } from "./styles";
import { PageShell } from "./PageShell";
import type { ReportData } from "../report-types";

function pct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
function num(n: number | null, pre = "", suf = "") {
  if (n == null) return "—";
  return `${pre}${n.toLocaleString()}${suf}`;
}

export function PopulationSection({ data }: { data: ReportData }) {
  const d = data.demographics;

  const rows = [
    ["Total usual resident population", num(d.totalPopulation)],
    ["Median age", d.medianAge != null ? `${d.medianAge} years` : "—"],
    ["Median weekly household income", num(d.medianHouseholdIncome, "$", "")],
    ["Median weekly personal income", num(d.medianPersonalIncome, "$", "")],
    ["Born overseas", pct(d.bornOverseas)],
    ["Speaks English only at home", pct(d.speaksEnglishOnly)],
    ["Indigenous (Aboriginal / Torres Strait Islander)", pct(d.indigenousPopulation)],
    ["Families with children", pct(d.familiesWithChildren)],
    ["Single-parent families", pct(d.singleParentFamilies)],
  ];

  // Age distribution bars
  const ageBands: [keyof typeof d.ageDistribution, string][] = [
    ["0_4",     "0–4 years"],
    ["5_14",    "5–14 years"],
    ["15_24",   "15–24 years"],
    ["25_34",   "25–34 years"],
    ["35_44",   "35–44 years"],
    ["45_54",   "45–54 years"],
    ["55_64",   "55–64 years"],
    ["65_74",   "65–74 years"],
    ["75_plus", "75+ years"],
  ];

  return (
    <PageShell suburb={data.suburb} pageNumber="2">
      <Text style={base.sectionTitle}>Population Overview</Text>
      <Text style={base.sectionSubtitle}>
        Key demographic characteristics for {data.suburb}, {data.state} · ABS Census {data.censusYear}
      </Text>

      {/* Executive summary */}
      <View style={base.infoBox}>
        <Text style={base.infoBoxText}>
          {data.suburb} ({data.state}) had a usual resident population of{" "}
          {num(d.totalPopulation)} at the {data.censusYear} Census.{" "}
          The median age was {d.medianAge ?? "unknown"} years and the median weekly{" "}
          household income was {num(d.medianHouseholdIncome, "$")}.{" "}
          {pct(d.bornOverseas)} of residents were born overseas,{" "}
          and {pct(d.speaksEnglishOnly)} speak English only at home.
        </Text>
      </View>

      {/* Stats table */}
      <Text style={[base.sectionTitle, { fontSize: 10, marginBottom: 8 }]}>Key Statistics</Text>
      {rows.map(([label, value], i) => (
        <View key={label} style={[base.tableRow, i % 2 === 1 ? base.tableRowShaded : {}]}>
          <Text style={base.tableCell}>{label}</Text>
          <Text style={base.tableCellBold}>{value}</Text>
        </View>
      ))}

      {/* Age distribution bars */}
      <Text style={[base.sectionTitle, { fontSize: 10, marginTop: 20, marginBottom: 10 }]}>
        Age Distribution
      </Text>
      {ageBands.map(([key, label]) => {
        const val = d.ageDistribution[key];
        const barWidth = val != null ? Math.min(val * 100, 100) : 0;
        return (
          <View key={key} style={base.barContainer}>
            <View style={base.barLabel}>
              <Text style={base.barLabelText}>{label}</Text>
              <Text style={base.barLabelText}>{pct(val)}</Text>
            </View>
            <View style={base.barTrack}>
              <View style={[base.barFill, { width: `${barWidth}%` }]} />
            </View>
          </View>
        );
      })}

      <Text style={base.caveat}>
        * Percentages are of usual resident population. Source: ABS Census of Population and Housing {data.censusYear}, TableBuilder SA2 level data.
      </Text>
    </PageShell>
  );
}
