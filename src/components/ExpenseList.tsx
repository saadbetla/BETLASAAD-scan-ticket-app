import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, Eye, Pencil, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CATEGORY_LABELS, ExpenseCategory, MONTHS } from "@/types/expense";
import { useExpenseStore, DbExpense } from "@/store/expenseStore";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExpenseListProps {
  onEdit?: (expense: DbExpense) => void;
}

export function ExpenseList({ onEdit }: ExpenseListProps) {
  const { expenses, toggleValidation, removeExpense, selectedMonth, selectedYear } = useExpenseStore();
  const [ticketPreviewUrl, setTicketPreviewUrl] = useState<string | null>(null);
  const [ticketExpense, setTicketExpense] = useState<DbExpense | null>(null);

  const formatExpenseDate = (day: number) => {
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    return `${dayStr}/${monthStr}/${selectedYear}`;
  };

  const getSignedUrl = async (photoUrl: string): Promise<string | null> => {
    if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(photoUrl, 60 * 10);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  const handleOpenTicket = async (expense: DbExpense) => {
    if (!expense.photo_url) return;
    const url = await getSignedUrl(expense.photo_url);
    if (!url) {
      toast.error("Impossible d'ouvrir le ticket");
      return;
    }
    setTicketExpense(expense);
    setTicketPreviewUrl(url);
  };

  const handleDownloadTicket = async (expense: DbExpense) => {
    if (!expense.photo_url) return;
    const url = await getSignedUrl(expense.photo_url);
    if (!url) {
      toast.error("Impossible de télécharger le ticket");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${formatExpenseDate(expense.date).replace(/\//g, "-")}.jpg`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCloseTicket = () => {
    setTicketExpense(null);
    setTicketPreviewUrl(null);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Aucune dépense</p>
        <p className="text-sm mt-1">Ajoutez votre première note de frais</p>
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => a.date - b.date);

  return (
    <>
      <div className="space-y-3">
        {sorted.map((expense, i) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              expense.validated
                ? "bg-accent/60 border-primary/30"
                : "bg-card border-border"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {formatExpenseDate(expense.date)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {CATEGORY_LABELS[expense.category as ExpenseCategory] || expense.category}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">
                  {expense.description}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {Number(expense.montant_ttc).toFixed(2)} € TTC
                  </span>
                  <span>{Number(expense.montant_ht).toFixed(2)} € HT</span>
                  {expense.chantier && <span>Chantier: {expense.chantier}</span>}
                </div>
                {/* Photo actions row */}
                <div className="flex items-center gap-1 mt-2">
                  {expense.photo_url && (
                    <>
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => void handleOpenTicket(expense)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Voir ticket
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => void handleDownloadTicket(expense)}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Enregistrer
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <Button size="icon" variant="outline" className="h-8 w-8"
                    onClick={() => onEdit(expense)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant={expense.validated ? "default" : "outline"} className="h-8 w-8"
                  onClick={() => toggleValidation(expense.id)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeExpense(expense.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={Boolean(ticketExpense && ticketPreviewUrl)} onOpenChange={(open) => !open && handleCloseTicket()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket - {ticketExpense ? formatExpenseDate(ticketExpense.date) : ""}</DialogTitle>
            <DialogDescription>
              {ticketExpense?.description || "Aperçu du ticket"}
            </DialogDescription>
          </DialogHeader>
          {ticketPreviewUrl && (
            <img
              src={ticketPreviewUrl}
              alt="Ticket de note de frais"
              className="w-full h-auto rounded-md border"
              loading="lazy"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
