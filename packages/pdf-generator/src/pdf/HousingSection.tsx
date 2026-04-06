import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, BRAND } from "./styles";
import { PageShell } from "./PageShell";
import type { ReportData } from "../report-types";

function num(n: number | null, pre = "", suf = "") {
  return n != null ? `${pre}${n.toLocaleString()}${suf}` : "—";
}
function pct(n: number | null) {
  return n != null ? `${(n * 100).toFixed(1)}%` : "—";
}

export function HousingSection({ data }: { data: ReportData }) {
  const h = data.housing;

  const tenureRows = [
    ["Owner-occupied (outright + mortgage)", pct(h.ownerOccupied)],
    ["Renting (private market)", pct(h.renting)],
    ["Social / community housing", pct(h.socialHousing)],
    ["Other / not stated", (() => {
      const known = (h.ownerOccupied ?? 0) + (h.renting ?? 0) + (h.socialHousing ?? 0);
      return h.ownerOccupied != null ? pct(Math.max(0, 1 - known)) : "—";
    })()],
  ];

  const financeRows = [
    ["Median weekly rent", num(h.medianRentWeekly, "$", "")],
    ["Median monthly mortgage repayment", num(h.medianMortgageMonthly, "$", "")],
    ["Total dwellings", num(h.totalDwellings)],
    ["Median house price", num(h.medianHousePrice, "$", "") + (h.medianHousePrice == null ? " (not in Census data)" : "")],
  ];

  return (
    <PageShell suburb={data.suburb} pageNumber="4">
      <Text style={base.sectionTitle}>Housing Market</Text>
      <Text style={base.sectionSubtitle}>
        Dwelling tenure, rent, mortgage, and housing cost data · ABS Census {data.censusYear}
      </Text>

      <View style={base.infoBox}>
        <Text style={base.infoBoxText}>
          {data.suburb} had {num(h.totalDwellings)} dwellings at the {data.censusYear} Census.{" "}
          {pct(h.ownerOccupied)} of households were owner-occupied, while{" "}
          {pct(h.renting)} rented privately.{" "}
          The median weekly rent was {num(h.medianRentWeekly, "$")} and the median monthly mortgage repayment was{" "}
          {num(h.medianMortgageMonthly, "$")}.
        </Text>
      </View>

      <Text style={[base.sectionTitle, { fontSize: 10, marginBottom: 8 }]}>Tenure Type</Text>
      {tenureRows.map(([label, value], i) => (
        <View key={label} style={[base.tableRow, i % 2 === 1 ? base.tableRowShaded : {}]}>
          <Text style={base.tableCell}>{label}</Text>
          <Text style={base.tableCellBold}>{value}</Text>
        </View>
      ))}

      {/* Tenure visual */}
      <View style={{ marginTop: 16, marginBottom: 20 }}>
        {[
          { label: "Owner-occupied", val: h.ownerOccupied, color: BRAND.blue900 },
          { label: "Renting", val: h.renting, color: BRAND.blue600 },
          { label: "Social housing", val: h.socialHousing, color: BRAND.blue400 },
        ].map(({ label, val, color }) => (
          <View key={label} style={base.barContainer}>
            <View style={base.barLabel}>
              <Text style={base.barLabelText}>{label}</Text>
              <Text style={base.barLabelText}>{pct(val)}</Text>
            </View>
            <View style={base.barTrack}>
              <View style={[base.barFill, { width: `${(val ?? 0) * 100}%`, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={[base.sectionTitle, { fontSize: 10, marginBottom: 8 }]}>Housing Costs</Text>
      {financeRows.map(([label, value], i) => (
        <View key={label} style={[base.tableRow, i % 2 === 1 ? base.tableRowShaded : {}]}>
          <Text style={base.tableCell}>{label}</Text>
          <Text style={base.tableCellBold}>{value}</Text>
        </View>
      ))}

      <Text style={base.caveat}>
        Median house price is not collected in the ABS Census. Future editions will incorporate CoreLogic data.
        Tenure data from ABS Census G33. Median rent and mortgage from G02.
      </Text>
    </PageShell>
  );
}
