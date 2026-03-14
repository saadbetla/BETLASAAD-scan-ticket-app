import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileSpreadsheet, FileText, CheckCheck, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { useExpenseStore } from "@/store/expenseStore";
import { useAuth } from "@/hooks/useAuth";
import { generateExcel } from "@/utils/excelExport";
import { generatePDF } from "@/utils/pdfExport";
import { MONTHS } from "@/types/expense";
import { toast } from "sonner";
import logo from "@/assets/logo-tpb.png";

const Index = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<import("@/store/expenseStore").DbExpense | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { user, signOut } = useAuth();
  const store = useExpenseStore();

  useEffect(() => {
    if (user) {
      store.fetchProfile(user.id);
      store.fetchExpenses(user.id, store.selectedMonth, store.selectedYear);
    }
  }, [user, store.selectedMonth, store.selectedYear]);

  const validatedCount = store.expenses.filter((e) => e.validated).length;
  const totalTTC = store.expenses.reduce((s, e) => s + Number(e.montant_ttc), 0);

  const handleExcelExport = () => {
    if (store.expenses.length === 0) {
      toast.error("Aucune dépense à exporter");
      return;
    }
    if (!store.profile.nom) {
      toast.error("Veuillez renseigner votre profil d'abord");
      setShowProfile(true);
      return;
    }
    // Map DB expenses to the format expected by excelExport
    const mapped = store.expenses.map((e) => ({
      id: e.id,
      date: e.date,
      montantTTC: Number(e.montant_ttc),
      tva20: Number(e.tva_20),
      tva10: Number(e.tva_10),
      tva55: Number(e.tva_55),
      montantHT: Number(e.montant_ht),
      category: e.category as any,
      description: e.description,
      photoUrl: e.photo_url,
      chantier: e.chantier,
      validated: e.validated,
    }));
    generateExcel(mapped, store.profile, store.selectedMonth, store.selectedYear);
    toast.success("Fichier Excel généré !");
  };

  const handlePDFExport = async () => {
    const validated = store.expenses.filter((e) => e.validated);
    if (validated.length === 0) {
      toast.error("Aucune dépense validée pour le PDF");
      return;
    }
    if (!store.profile.nom) {
      toast.error("Veuillez renseigner votre profil d'abord");
      setShowProfile(true);
      return;
    }
    const mapped = validated.map((e) => ({
      id: e.id,
      date: e.date,
      montantTTC: Number(e.montant_ttc),
      tva20: Number(e.tva_20),
      tva10: Number(e.tva_10),
      tva55: Number(e.tva_55),
      montantHT: Number(e.montant_ht),
      category: e.category as any,
      description: e.description,
      photoUrl: e.photo_url,
      chantier: e.chantier,
      validated: e.validated,
    }));

    try {
      await generatePDF(mapped, store.profile, store.selectedMonth, store.selectedYear);
      toast.success("PDF généré avec les tickets !");
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleValidateAll = () => {
    if (!user || store.expenses.length === 0) return;
    store.validateAll(user.id);
    toast.success("Toutes les dépenses ont été validées !");
  };

  const handleProfileUpdate = (field: string, value: string) => {
    if (!user) return;
    const updated = { ...store.profile, [field]: value };
    store.updateProfile(user.id, updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="TPB Flooring" className="h-8" />
            <span className="font-bold text-sm tracking-tight hidden sm:block">Notes de Frais</span>
          </div>
          <div className="flex items-center gap-1">
            <Sheet open={showProfile} onOpenChange={setShowProfile}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10">
                  <User className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Mon Profil</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input value={store.profile.nom} onChange={(e) => handleProfileUpdate("nom", e.target.value)} placeholder="Votre nom" className="mt-1" maxLength={100} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prénom</label>
                    <Input value={store.profile.prenom} onChange={(e) => handleProfileUpdate("prenom", e.target.value)} placeholder="Votre prénom" className="mt-1" maxLength={100} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fonction</label>
                    <Input value={store.profile.fonction} onChange={(e) => handleProfileUpdate("fonction", e.target.value)} placeholder="Conducteur de travaux" className="mt-1" maxLength={100} />
                  </div>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </SheetContent>
            </Sheet>
            <Button size="icon" variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 pb-28">
        <div className="flex gap-2 mt-4 mb-4">
          <Select value={String(store.selectedMonth)} onValueChange={(v) => store.setMonth(parseInt(v))}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (<SelectItem key={i} value={String(i)}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input type="number" value={store.selectedYear} onChange={(e) => store.setYear(parseInt(e.target.value) || 2025)} className="w-24" min={2020} max={2030} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg bg-card border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{store.expenses.length}</p>
            <p className="text-xs text-muted-foreground">Dépenses</p>
          </div>
          <div className="rounded-lg bg-card border p-3 text-center">
            <p className="text-2xl font-bold text-primary">{validatedCount}</p>
            <p className="text-xs text-muted-foreground">Validées</p>
          </div>
          <div className="rounded-lg bg-card border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalTTC.toFixed(2)}€</p>
            <p className="text-xs text-muted-foreground">Total TTC</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card rounded-xl border shadow-sm">
              <ExpenseForm
                onClose={() => { setShowForm(false); setEditingExpense(null); }}
                editExpense={editingExpense}
              />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ExpenseList onEdit={(expense) => { setEditingExpense(expense); setShowForm(true); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!showForm && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t">
          <div className="container max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleValidateAll} disabled={store.expenses.length === 0} className="text-xs">
              <CheckCheck className="h-4 w-4 mr-1" />Tout valider
            </Button>
            <Button variant="outline" size="sm" onClick={handleExcelExport} className="text-xs">
              <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDFExport} className="text-xs">
              <FileText className="h-4 w-4 mr-1" />PDF
            </Button>
            <div className="flex-1" />
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg" onClick={() => setShowForm(true)}>
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
