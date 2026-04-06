import React from "react";
import { Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { BRAND } from "./styles";
import type { ReportData } from "../report-types";

const s = StyleSheet.create({
  page: {
    backgroundColor: BRAND.blue900,
    padding: 0,
  },
  topStripe: {
    height: 6,
    backgroundColor: BRAND.blue600,
  },
  body: {
    flex: 1,
    paddingHorizontal: 52,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 60,
  },
  brandBox: {
    width: 28,
    height: 28,
    backgroundColor: BRAND.blue600,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  brandBoxText: {
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  brandName: {
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  titleSection: {
    flex: 1,
    justifyContent: "center",
  },
  tag: {
    color: BRAND.blue400,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  suburbName: {
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 40,
    marginBottom: 4,
    lineHeight: 1.1,
  },
  stateLine: {
    color: BRAND.blue400,
    fontSize: 14,
    marginBottom: 32,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 8,
  },
  metaItem: {
    color: BRAND.blue100,
    fontSize: 9,
  },
  metaValue: {
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  divider: {
    height: 1,
    backgroundColor: BRAND.blue700,
    marginVertical: 32,
  },
  statGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40,
  },
  statBlock: {
    flex: 1,
    backgroundColor: BRAND.blue700,
    borderRadius: 8,
    padding: 14,
  },
  statBlockLabel: {
    color: BRAND.blue400,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statBlockValue: {
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    color: BRAND.blue400,
    fontSize: 7.5,
  },
  footerRight: {
    color: BRAND.blue400,
    fontSize: 7.5,
  },
});

function fmt(n: number | null, pre = "", suf = "") {
  if (n == null) return "—";
  return `${pre}${n.toLocaleString()}${suf}`;
}

export function CoverPage({ data }: { data: ReportData }) {
  const date = new Date(data.generatedAt).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Page size="A4" style={s.page}>
      <View style={s.topStripe} />
      <View style={s.body}>
        {/* Brand */}
        <View style={s.brand}>
          <View style={s.brandBox}>
            <Text style={s.brandBoxText}>DR</Text>
          </View>
          <Text style={s.brandName}>DemoReport</Text>
        </View>

        {/* Title */}
        <View style={s.titleSection}>
          <Text style={s.tag}>Demographic Feasibility Report</Text>
          <Text style={s.suburbName}>{data.suburb}</Text>
          <Text style={s.stateLine}>
            {data.state}{data.lga ? ` · ${data.lga}` : ""}{data.postcode ? ` · ${data.postcode}` : ""}
          </Text>

          <View style={s.metaRow}>
            <View>
              <Text style={s.metaItem}>SA2 Code</Text>
              <Text style={s.metaValue}>{data.sa2Code}</Text>
            </View>
            <View>
              <Text style={s.metaItem}>Census Year</Text>
              <Text style={s.metaValue}>{data.censusYear}</Text>
            </View>
            <View>
              <Text style={s.metaItem}>Generated</Text>
              <Text style={s.metaValue}>{date}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Key stats */}
        <View style={s.statGrid}>
          <View style={s.statBlock}>
            <Text style={s.statBlockLabel}>Population</Text>
            <Text style={s.statBlockValue}>{fmt(data.demographics.totalPopulation)}</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statBlockLabel}>Median Age</Text>
            <Text style={s.statBlockValue}>{data.demographics.medianAge ?? "—"} yrs</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statBlockLabel}>Household Income</Text>
            <Text style={s.statBlockValue}>{fmt(data.demographics.medianHouseholdIncome, "$", "/wk")}</Text>
          </View>
          <View style={s.statBlock}>
            <Text style={s.statBlockLabel}>SEIFA IRSD Decile</Text>
            <Text style={s.statBlockValue}>{data.seifa.irsdDecile ?? "—"} / 10</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerLeft}>
            Data source: ABS Census of Population and Housing {data.censusYear} · SEIFA {data.censusYear}
          </Text>
          <Text style={s.footerRight}>demoreport.com.au</Text>
        </View>
      </View>
    </Page>
  );
}
