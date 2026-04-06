import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { base } from "./styles";

interface Props {
  suburb: string;
  pageNumber: string;
  children: React.ReactNode;
}

export function PageShell({ suburb, pageNumber, children }: Props) {
  return (
    <Page size="A4" style={base.page}>
      {/* Header */}
      <View style={base.pageHeader}>
        <Text style={base.pageHeaderBrand}>DEMOREPORT</Text>
        <Text style={base.pageHeaderRight}>{suburb} — ABS Census 2021</Text>
      </View>

      {children}

      {/* Footer */}
      <View style={base.pageFooter} fixed>
        <Text>DemoReport · demoreport.com.au</Text>
        <Text>{pageNumber}</Text>
        <Text>ABS Census 2021 · SEIFA 2021</Text>
      </View>
    </Page>
  );
}
