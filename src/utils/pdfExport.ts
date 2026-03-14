import jsPDF from 'jspdf';
import { Expense, UserProfile, MONTHS, CATEGORY_LABELS } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';

export async function generatePDF(
  expenses: Expense[],
  profile: UserProfile,
  month: number,
  year: number
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Title page
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Notes de Frais', pageWidth / 2, 40, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text(`${MONTHS[month]} ${year}`, pageWidth / 2, 52, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nom: ${profile.nom}`, margin, 75);
  pdf.text(`Prénom: ${profile.prenom}`, margin, 83);
  pdf.text(`Fonction: ${profile.fonction}`, margin, 91);

  // Summary table
  let y = 110;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Récapitulatif des dépenses', margin, y);
  y += 8;

  const validatedExpenses = expenses.filter((e) => e.validated);

  pdf.setFont('helvetica', 'normal');
  validatedExpenses.forEach((expense) => {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(
      `${formatExpenseDate(expense.date, month, year)} - ${CATEGORY_LABELS[expense.category]} - ${expense.montantTTC.toFixed(2)}€ TTC - ${expense.description}`,
      margin,
      y
    );
    y += 6;
  });

  const total = validatedExpenses.reduce((s, e) => s + e.montantTTC, 0);
  y += 4;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total TTC: ${total.toFixed(2)}€`, margin, y);

  // Photo pages
  for (const expense of validatedExpenses) {
    if (!expense.photoUrl) continue;

    pdf.addPage();
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      `${formatExpenseDate(expense.date, month, year)} - ${CATEGORY_LABELS[expense.category]}`,
      margin,
      20
    );
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${expense.description} - ${expense.montantTTC.toFixed(2)}€ TTC`, margin, 28);

    try {
      const photoSource = await resolveReceiptUrl(expense.photoUrl);
      if (!photoSource) {
        throw new Error('Impossible de résoudre l’URL de la photo');
      }

      const response = await fetch(photoSource);
      if (!response.ok) {
        throw new Error(`Erreur de téléchargement image: ${response.status}`);
      }

      const imageBlob = await response.blob();
      const blobUrl = URL.createObjectURL(imageBlob);

      try {
        const img = await loadImage(blobUrl, false);
        const maxW = contentWidth;
        const maxH = 220;
        let w = img.width;
        let h = img.height;
        const ratio = Math.min(maxW / w, maxH / h);
        w *= ratio;
        h *= ratio;

        // Conversion locale en JPEG (évite les problèmes CORS/canvas tainted)
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas context non disponible');
        }

        ctx.drawImage(img, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg', 0.9);

        pdf.addImage(imgData, 'JPEG', margin, 35, w, h);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('Photo load error:', err);
      pdf.text('[Photo non disponible]', margin, 40);
    }
  }

  pdf.save(`NDF_${profile.nom}_${profile.prenom}_${MONTHS[month]}_${year}.pdf`);
}

async function resolveReceiptUrl(photoPathOrUrl: string): Promise<string | null> {
  if (/^https?:\/\//i.test(photoPathOrUrl)) {
    return photoPathOrUrl;
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(photoPathOrUrl, 60 * 10);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = supabase.storage
    .from('receipts')
    .getPublicUrl(photoPathOrUrl);

  return publicData?.publicUrl || null;
}

function formatExpenseDate(day: number, month: number, year: number): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

function loadImage(src: string, useCrossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCrossOrigin) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
