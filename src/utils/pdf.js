import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportTablePDF(title, columns, rows) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: rows,
    theme: "striped",
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}
