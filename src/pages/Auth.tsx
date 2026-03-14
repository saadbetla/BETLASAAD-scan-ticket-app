import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "@/assets/logo-tpb.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie !");
      } else {
        if (!nom.trim() || !prenom.trim()) {
          toast.error("Veuillez renseigner votre nom et prénom");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nom: nom.trim(), prenom: prenom.trim() },
          },
        });
        if (error) throw error;
        toast.success("Vérifiez votre email pour confirmer votre inscription !");
      }
    } catch (error: any) {
      const genericMessages: Record<string, string> = {
        'user_already_exists': "Une erreur est survenue, veuillez réessayer.",
        'invalid_credentials': "Email ou mot de passe incorrect.",
        'email_not_confirmed': "Veuillez confirmer votre email avant de vous connecter.",
      };
      const msg = genericMessages[error?.code] ?? "Une erreur est survenue.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <img src={logo} alt="TPB Flooring" className="h-12 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Notes de Frais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Connectez-vous à votre compte" : "Créez votre compte"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border rounded-xl p-6">
          {!isLogin && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground">Nom *</label>
                <Input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom"
                  className="mt-1"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Prénom *</label>
                <Input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Votre prénom"
                  className="mt-1"
                  maxLength={100}
                />
              </div>
            </>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
              className="mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Mot de passe *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
