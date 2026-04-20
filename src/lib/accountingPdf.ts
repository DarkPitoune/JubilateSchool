import type { AccountingMonth } from "../hooks/useQueries";
import { fullName } from "../types";

const euroFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

// jsPDF's built-in Helvetica renders U+202F / U+00A0 with weird spacing;
// collapse them to ASCII spaces for the PDF only.
const eur = (cents: number) =>
  euroFmt.format(cents / 100).replace(/[\u202F\u00A0]/g, " ");

async function newDoc() {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: unknown }).default as (
    doc: unknown,
    opts: unknown,
  ) => void;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  return { doc, autoTable };
}

function drawHeader(doc: any, subtitle: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(3, 3, 64); // #030340
  doc.text("Jubilate School", 40, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Rapport de comptabilité", 40, 70);
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, 40, 88);
}

function drawSummary(doc: any, row: AccountingMonth, y: number): number {
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const lines: Array<[string, string]> = [
    ["Total brut encaissé", eur(row.gross_cents)],
    ["Frais Stripe", `- ${eur(row.stripe_fees_cents)}`],
    ["Maintenance (1 %)", `- ${eur(row.maintenance_cents)}`],
    ["Dépenses exceptionnelles", `- ${eur(row.extraordinary_cents)}`],
    ["Net", eur(row.net_cents)],
  ];
  lines.forEach(([label, val], i) => {
    const yy = y + i * 20;
    if (label === "Net") {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(label, 40, yy);
    doc.text(val, 555, yy, { align: "right" });
  });
  return y + lines.length * 20;
}

function drawFooter(doc: any) {
  const pageCount = doc.internal.pages.length - 1;
  const generated = `Généré le ${dateTimeFmt.format(new Date())}`;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(generated, 40, 820);
    doc.text(`Page ${i} / ${pageCount}`, 555, 820, { align: "right" });
  }
}

export async function generateMonthlyReport(month: AccountingMonth): Promise<void> {
  const { doc, autoTable } = await newDoc();

  drawHeader(doc, `Mois : ${month.label}`);
  const afterSummaryY = drawSummary(doc, month, 120);

  const body = month.bookings
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((b) => [
      dateFmt.format(new Date(b.start_time)),
      fullName(b.profiles),
      eur(b.price_cents),
    ]);

  autoTable(doc, {
    startY: afterSummaryY + 20,
    head: [["Date du cours", "Élève", "Prix brut"]],
    body,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [3, 3, 64], textColor: [255, 255, 255] },
    columnStyles: {
      2: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  if (month.expenses.length > 0) {
    const docAny = doc as any;
    const lastY = docAny.lastAutoTable?.finalY ?? afterSummaryY + 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(3, 3, 64);
    doc.text("Dépenses exceptionnelles", 40, lastY + 30);
    autoTable(doc, {
      startY: lastY + 40,
      head: [["Date", "Libellé", "Montant"]],
      body: month.expenses
        .slice()
        .sort((a, b) => a.incurred_on.localeCompare(b.incurred_on))
        .map((e) => [
          dateFmt.format(new Date(`${e.incurred_on}T12:00:00`)),
          e.label,
          eur(e.amount_cents),
        ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [3, 3, 64], textColor: [255, 255, 255] },
      columnStyles: { 2: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc);
  doc.save(`jubilate-comptabilite-${month.key}.pdf`);
}

export async function generateLifetimeReport(
  months: AccountingMonth[],
  lifetime: AccountingMonth,
): Promise<void> {
  const { doc, autoTable } = await newDoc();

  const firstBookingDate = months.length
    ? dateFmt.format(
        new Date(
          months.reduce(
            (min, m) =>
              m.bookings.reduce(
                (mn, b) => (b.start_time < mn ? b.start_time : mn),
                min,
              ),
            months[0].bookings[0]?.start_time ?? new Date().toISOString(),
          ),
        ),
      )
    : "—";

  drawHeader(doc, `Période : depuis le ${firstBookingDate}`);
  const afterSummaryY = drawSummary(doc, lifetime, 120);

  const body = months.map((m) => [
    m.label,
    String(m.bookings.length),
    eur(m.gross_cents),
    eur(m.stripe_fees_cents),
    eur(m.maintenance_cents),
    eur(m.extraordinary_cents),
    eur(m.net_cents),
  ]);

  autoTable(doc, {
    startY: afterSummaryY + 20,
    head: [[
      "Mois", "Cours", "Brut", "Frais Stripe", "Maintenance", "Dépenses except.", "Net",
    ]],
    body,
    foot: [[
      { content: "Total", styles: { halign: "left" } },
      String(lifetime.bookings.length),
      eur(lifetime.gross_cents),
      eur(lifetime.stripe_fees_cents),
      eur(lifetime.maintenance_cents),
      eur(lifetime.extraordinary_cents),
      eur(lifetime.net_cents),
    ]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [3, 3, 64], textColor: [255, 255, 255] },
    footStyles: {
      fillColor: [240, 240, 245],
      textColor: [3, 3, 64],
      fontStyle: "bold",
      halign: "right",
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  if (lifetime.expenses.length > 0) {
    const docAny = doc as any;
    const lastY = docAny.lastAutoTable?.finalY ?? afterSummaryY + 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(3, 3, 64);
    doc.text("Détail des dépenses exceptionnelles", 40, lastY + 30);
    autoTable(doc, {
      startY: lastY + 40,
      head: [["Date", "Libellé", "Montant"]],
      body: lifetime.expenses
        .slice()
        .sort((a, b) => a.incurred_on.localeCompare(b.incurred_on))
        .map((e) => [
          dateFmt.format(new Date(`${e.incurred_on}T12:00:00`)),
          e.label,
          eur(e.amount_cents),
        ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [3, 3, 64], textColor: [255, 255, 255] },
      columnStyles: { 2: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });
  }

  drawFooter(doc);
  doc.save("jubilate-comptabilite-lifetime.pdf");
}
