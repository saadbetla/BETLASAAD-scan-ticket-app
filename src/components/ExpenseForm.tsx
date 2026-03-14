import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoCapture } from "./PhotoCapture";
import { useExpenseStore, DbExpense } from "@/store/expenseStore";
import { ExpenseCategory, CATEGORY_LABELS } from "@/types/expense";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExpenseFormProps {
  onClose: () => void;
  editExpense?: DbExpense | null;
}

export function ExpenseForm({ onClose, editExpense }: ExpenseFormProps) {
  const { user } = useAuth();
  const { addExpense, updateExpense, selectedMonth, selectedYear } = useExpenseStore();
  const isEditing = Boolean(editExpense);

  const [date, setDate] = useState(editExpense ? String(editExpense.date) : "");
  const [montantTTC, setMontantTTC] = useState(editExpense ? Number(editExpense.montant_ttc).toFixed(2) : "");
  const [tvaRate, setTvaRate] = useState<"20" | "10" | "5.5">(
    editExpense
      ? Number(editExpense.tva_10) > 0 ? "10" : Number(editExpense.tva_55) > 0 ? "5.5" : "20"
      : "20"
  );
  const [tvaMode, setTvaMode] = useState<"auto" | "manual">("auto");
  const [tvaManual, setTvaManual] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(
    (editExpense?.category as ExpenseCategory) || "repas"
  );
  const [description, setDescription] = useState(editExpense?.description || "");
  const [chantier, setChantier] = useState(editExpense?.chantier || "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [keepExistingPhoto, setKeepExistingPhoto] = useState(Boolean(editExpense?.photo_url));
  const [extracting, setExtracting] = useState(false);

  const handleExtractFromPhoto = async (photoData: string) => {
    setPhoto(photoData);
    setKeepExistingPhoto(false);
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-receipt", {
        body: { imageBase64: photoData },
      });
      if (error) throw error;
      if (data.montantTTC) setMontantTTC(Number(data.montantTTC).toFixed(2));
      if (data.tvaRate) setTvaRate(data.tvaRate as any);
      if (data.tvaAmount != null) {
        setTvaMode("manual");
        setTvaManual(Number(data.tvaAmount).toFixed(2));
      }
      if (data.description) setDescription(data.description);
      if (data.date) setDate(String(data.date));
      toast.success("Informations extraites du ticket !");
    } catch {
      toast.info("Extraction non disponible, remplissez manuellement");
    } finally {
      setExtracting(false);
    }
  };

  const uploadPhoto = async (photoData: string): Promise<string | null> => {
    if (!user) return null;
    const fileName = `${user.id}/${Date.now()}.jpg`;
    const base64Data = photoData.split(",")[1];
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)), {
        contentType: "image/jpeg",
      });
    if (!uploadError && uploadData) {
      return uploadData.path;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const ttc = parseFloat(montantTTC);
    if (!date || isNaN(ttc) || ttc <= 0) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const dayNum = parseInt(date);
    if (dayNum < 1 || dayNum > 31) {
      toast.error("Jour invalide (1-31)");
      return;
    }

    let tvaAmount: number;
    let ht: number;

    if (tvaMode === "manual" && tvaManual) {
      tvaAmount = parseFloat(tvaManual);
      ht = ttc - tvaAmount;
    } else {
      const rate = parseFloat(tvaRate) / 100;
      ht = ttc / (1 + rate);
      tvaAmount = ttc - ht;
    }

    // Handle photo
    let photoUrl: string | null = null;
    if (photo) {
      photoUrl = await uploadPhoto(photo);
    } else if (keepExistingPhoto && editExpense?.photo_url) {
      photoUrl = editExpense.photo_url;
    }

    const expenseData = {
      user_id: user.id,
      date: dayNum,
      month: selectedMonth,
      year: selectedYear,
      montant_ttc: parseFloat(ttc.toFixed(2)),
      tva_20: tvaRate === "20" ? parseFloat(tvaAmount.toFixed(2)) : 0,
      tva_10: tvaRate === "10" ? parseFloat(tvaAmount.toFixed(2)) : 0,
      tva_55: tvaRate === "5.5" ? parseFloat(tvaAmount.toFixed(2)) : 0,
      montant_ht: parseFloat(ht.toFixed(2)),
      category,
      description: description.trim() || CATEGORY_LABELS[category],
      photo_url: photoUrl,
      chantier: chantier.trim(),
      validated: editExpense?.validated || false,
    };

    if (isEditing && editExpense) {
      await updateExpense(editExpense.id, expenseData);
      toast.success("Dépense modifiée !");
    } else {
      await addExpense(expenseData);
      toast.success("Dépense ajoutée !");
    }
    onClose();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onSubmit={handleSubmit}
      className="space-y-4 p-4"
    >
      {/* Photo */}
      <PhotoCapture
        onCapture={handleExtractFromPhoto}
        currentPhoto={photo}
        onRemove={() => {
          setPhoto(null);
          setKeepExistingPhoto(false);
        }}
      />

      {keepExistingPhoto && !photo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>📎 Photo existante conservée</span>
          <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setKeepExistingPhoto(false)}>
            Supprimer
          </Button>
        </div>
      )}

      {extracting && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <Sparkles className="h-4 w-4" />
          Analyse du ticket en cours...
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Jour du mois *</label>
          <Input type="number" min={1} max={31} placeholder="Ex: 15" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Montant TTC *</label>
          <Input type="number" step="0.01" min="0" placeholder="0.00 €" value={montantTTC} onChange={(e) => setMontantTTC(e.target.value)}
            onBlur={() => { const v = parseFloat(montantTTC); if (!isNaN(v)) setMontantTTC(v.toFixed(2)); }}
            className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Taux TVA</label>
          <Select value={tvaRate} onValueChange={(v) => setTvaRate(v as any)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">TVA 20%</SelectItem>
              <SelectItem value="10">TVA 10%</SelectItem>
              <SelectItem value="5.5">TVA 5,5%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Mode TVA</label>
          <Select value={tvaMode} onValueChange={(v) => setTvaMode(v as any)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (calcul)</SelectItem>
              <SelectItem value="manual">Manuel (saisie)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tvaMode === "manual" && (
        <div>
          <label className="text-sm font-medium text-foreground">Montant TVA</label>
          <Input type="number" step="0.01" min="0" placeholder="0.00 €" value={tvaManual} onChange={(e) => setTvaManual(e.target.value)}
            onBlur={() => { const v = parseFloat(tvaManual); if (!isNaN(v)) setTvaManual(v.toFixed(2)); }}
            className="mt-1" />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">Catégorie</label>
        <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <Input placeholder="Description de la dépense" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" maxLength={200} />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">N° Chantier</label>
        <Input placeholder="Numéro de chantier" value={chantier} onChange={(e) => setChantier(e.target.value)} className="mt-1" maxLength={50} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={extracting}>
          {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {isEditing ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </motion.form>
  );
}
