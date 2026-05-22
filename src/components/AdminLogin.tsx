import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Hardcoded administrative credentials as requested
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'alves2026';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate luxury verification delays
    setTimeout(() => {
      if (username.trim().toLowerCase() === ADMIN_USER && password === ADMIN_PASS) {
        setSuccess(true);
        setIsSubmitting(false);
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      } else {
        setIsSubmitting(false);
        setError('Usuário ou senha incorretos. Por favor, tente novamente.');
      }
    }, 1200);
  };

  return (
    <div id="admin-login-screen" className="max-w-md w-full mx-auto bg-white rounded-2xl border border-brand-primary-light/40 shadow-xl overflow-hidden animate-fade-in my-8">
      {/* Header design with dry rose background */}
      <div className="bg-brand-primary text-white p-8 text-center relative">
        <div className="absolute top-4 right-4 text-brand-primary-light opacity-50 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="w-16 h-16 bg-[#faf9f8]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#faf9f8]/20 shadow-inner">
          <Lock className="w-7 h-7 text-[#ffffff]" />
        </div>
        <h2 className="font-display text-2xl tracking-wide font-bold">ALVES ESTÉTICA</h2>
        <p className="text-xs text-brand-primary-light/90 font-sans tracking-widest uppercase mt-1">Acesso Restrito de Gestão</p>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {success ? (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-brand-primary">Autenticação Concluída</h3>
              <p className="text-sm text-brand-tertiary mt-1">Carregando painel de gerenciamento financeiro e agenda...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Instruction / Credential hint banner */}
            <div className="bg-[#faf9f8] border border-[#d6c2c4]/40 p-4 rounded-xl text-center">
              <p className="text-[11px] font-sans text-brand-tertiary font-medium">
                Utilize as credenciais padrão de administração Alves Estética:
              </p>
              <div className="flex justify-center gap-4 text-xs font-mono font-bold text-brand-primary mt-1.5">
                <span>Usuário: <code className="bg-brand-primary-light/35 px-1 py-0.5 rounded">admin</code></span>
                <span>Senha: <code className="bg-brand-primary-light/35 px-1 py-0.5 rounded">alves2026</code></span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-bounce">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-tertiary font-sans uppercase tracking-wider block">
                Nome de Usuário
              </label>
              <input
                id="login-username"
                type="text"
                required
                disabled={isSubmitting}
                placeholder="Insira 'admin'"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 focus:border-brand-primary/80 focus:ring-1 focus:ring-brand-primary rounded-xl px-4 py-3 text-sm font-sans text-brand-dark outline-none transition-all placeholder-brand-tertiary/40"
              />
            </div>

            {/* Input Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-tertiary font-sans uppercase tracking-wider block">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  placeholder="Insira 'alves2026'"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 focus:border-brand-primary/80 focus:ring-1 focus:ring-brand-primary rounded-xl pl-4 pr-11 py-3 text-sm font-sans text-brand-dark outline-none transition-all placeholder-brand-tertiary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#faf9f8] text-brand-tertiary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-55"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando Credenciais...</span>
                </>
              ) : (
                <span>Entrar no Portal</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
