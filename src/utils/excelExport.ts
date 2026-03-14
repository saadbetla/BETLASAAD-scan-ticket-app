import * as XLSX from '@e965/xlsx';
import { Expense, UserProfile, MONTHS, ExpenseCategory } from '@/types/expense';

export function generateExcel(
  expenses: Expense[],
  profile: UserProfile,
  month: number,
  year: number
) {
  const wb = XLSX.utils.book_new();
  const monthName = MONTHS[month].toUpperCase();

  // Build rows matching the template structure
  const rows: any[][] = [];

  // Header
  rows.push(['', 'NOM', profile.nom]);
  rows.push(['', 'PRENOM', profile.prenom]);
  rows.push(['', 'FONCTION', profile.fonction]);
  rows.push([]);
  rows.push([]);
  rows.push([]);
  rows.push([`FICHE DE REMBOURSEMENT DE FRAIS DU MOIS DE ${monthName} ${year}`]);
  rows.push([]);
  rows.push([]);

  // Column headers
  rows.push([
    'DATE', 'MONTANT DE LA FACTURE', '', '', '', '',
    'Fournisseurs', 'Voyages et déplacements', '', '',
    'Invitations', 'Carburant', 'Matériel et outillages', 'N° Chantier'
  ]);
  rows.push([
    '', 'TTC', 'TVA 20%', 'TVA 10%', 'TVA 5,5%', 'HT',
    '', 'Repas', 'Péage/parking', 'Hotel', '', '', '', ''
  ]);

  // Day rows
  let totalTTC = 0, totalTVA20 = 0, totalTVA10 = 0, totalTVA55 = 0, totalHT = 0;

  for (let day = 1; day <= 31; day++) {
    const dayExpenses = expenses.filter((e) => e.date === day);
    const row: any[] = new Array(14).fill('');
    row[0] = day;

    if (dayExpenses.length > 0) {
      const ttc = dayExpenses.reduce((s, e) => s + e.montantTTC, 0);
      const t20 = dayExpenses.reduce((s, e) => s + e.tva20, 0);
      const t10 = dayExpenses.reduce((s, e) => s + e.tva10, 0);
      const t55 = dayExpenses.reduce((s, e) => s + e.tva55, 0);
      const ht = dayExpenses.reduce((s, e) => s + e.montantHT, 0);

      row[1] = ttc;
      row[2] = t20;
      row[3] = t10;
      row[4] = t55;
      row[5] = ht;

      totalTTC += ttc;
      totalTVA20 += t20;
      totalTVA10 += t10;
      totalTVA55 += t55;
      totalHT += ht;

      // Category columns
      const catMap: Record<ExpenseCategory, number> = {
        fournisseurs: 6,
        repas: 7,
        peage_parking: 8,
        hotel: 9,
        invitations: 10,
        carburant: 11,
        materiel: 12,
      };

      dayExpenses.forEach((e) => {
        const col = catMap[e.category];
        row[col] = (row[col] || 0) + e.montantHT;
      });

      row[13] = dayExpenses.map((e) => e.chantier).filter(Boolean).join(', ');
    } else {
      row[5] = 0;
    }

    rows.push(row);
  }

  // Totals
  rows.push(['TOTAUX', totalTTC, totalTVA20, totalTVA10, totalTVA55, totalHT]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, MONTHS[month]);

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NDF_${profile.nom}_${profile.prenom}_${MONTHS[month]}_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
