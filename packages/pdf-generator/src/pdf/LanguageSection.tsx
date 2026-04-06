import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { base, BRAND } from "./styles";
import { PageShell } from "./PageShell";
import type { ReportData } from "../report-types";

function pct(n: number | null | undefined) {
  return n != null ? `${(n * 100).toFixed(1)}%` : "—";
}

export function LanguageSection({ data }: { data: ReportData }) {
  const d = data.demographics;
  const langs = d.topLanguages ?? [];

  return (
    <PageShell suburb={data.suburb} pageNumber="6">
      <Text style={base.sectionTitle}>Language &amp; Cultural Diversity</Text>
      <Text style={base.sectionSubtitle}>
        Languages spoken at home and cultural composition · ABS Census {data.censusYear}
      </Text>

      <View style={base.row}>
        <View style={base.statBox}>
          <Text style={base.statLabel}>Born Overseas</Text>
          <Text style={base.statValue}>{pct(d.bornOverseas)}</Text>
          <Text style={base.statSub}>of usual residents</Text>
        </View>
        <View style={base.statBox}>
          <Text style={base.statLabel}>English Only at Home</Text>
          <Text style={base.statValue}>{pct(d.speaksEnglishOnly)}</Text>
          <Text style={base.statSub}>speak English only</Text>
        </View>
        <View style={base.statBox}>
          <Text style={base.statLabel}>Indigenous</Text>
          <Text style={base.statValue}>{pct(d.indigenousPopulation)}</Text>
          <Text style={base.statSub}>Aboriginal / TSI</Text>
        </View>
      </View>

      <Text style={[base.sectionTitle, { fontSize: 10, marginTop: 20, marginBottom: 8 }]}>
        Top Languages Spoken at Home
      </Text>

      {langs.length === 0 ? (
        <Text style={[base.caveat, { marginTop: 0 }]}>Language data not available for this SA2.</Text>
      ) : (
        <>
          {/* Table header */}
          <View style={[base.tableRow, { backgroundColor: BRAND.blue900 }]}>
            <Text style={[base.tableCellBold, { color: BRAND.white, flex: 2 }]}>Language</Text>
            <Text style={[base.tableCellBold, { color: BRAND.white }]}>Speakers</Text>
            <Text style={[base.tableCellBold, { color: BRAND.white }]}>% of pop.</Text>
          </View>
          {langs.map((lang, i) => (
            <View key={lang.language} style={[base.tableRow, i % 2 === 1 ? base.tableRowShaded : {}]}>
              <Text style={[base.tableCell, { flex: 2 }]}>{lang.language}</Text>
              <Text style={base.tableCell}>{lang.count.toLocaleString()}</Text>
              <Text style={base.tableCellBold}>{pct(lang.pct)}</Text>
            </View>
          ))}

          {/* Visual bars */}
          <View style={{ marginTop: 16 }}>
            {langs.slice(0, 8).map((lang) => (
              <View key={lang.language} style={base.barContainer}>
                <View style={base.barLabel}>
                  <Text style={base.barLabelText}>{lang.language}</Text>
                  <Text style={base.barLabelText}>{pct(lang.pct)}</Text>
                </View>
                <View style={base.barTrack}>
                  <View style={[base.barFill, { width: `${Math.min(lang.pct * 100, 100)}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={base.caveat}>
        Source: ABS Census of Population and Housing {data.censusYear}, G51 Language Spoken at Home.
        Languages with fewer than 10 speakers may be suppressed for privacy.
        Top 10 languages by count shown.
      </Text>
    </PageShell>
  );
}
