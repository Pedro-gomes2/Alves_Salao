import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState<'admin' | 'professional'>(() => {
    if (typeof window === 'undefined') return 'professional';
    const saved = window.localStorage.getItem('alves.login.tab');
    return saved === 'admin' ? 'admin' : 'professional';
  });

  const selectTab = (t: 'admin' | 'professional') => {
    setTab(t);
    setError('');
    try { window.localStorage.setItem('alves.login.tab', t); } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Credenciais inválidas.');
        setIsSubmitting(false);
        return;
      }
      const data = await res.json();
      setSuccess(true);
      setTimeout(() => onLoginSuccess(data.token, data.user), 600);
    } catch {
      setError('Não foi possível conectar ao servidor.');
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-screen" className="max-w-md w-full mx-auto bg-white rounded-2xl border border-brand-primary-light/40 shadow-xl overflow-hidden animate-fade-in my-8">
      <div className="bg-brand-primary text-white p-8 text-center relative">
        <div className="absolute top-4 right-4 text-brand-primary-light opacity-50 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="w-16 h-16 bg-[#faf9f8]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#faf9f8]/20 shadow-inner">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-display text-2xl tracking-wide font-bold">ALVES ESTÉTICA</h2>
        <p className="text-xs text-brand-primary-light/90 font-sans tracking-widest uppercase mt-1">Acesso ao Portal</p>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {!success && (
          <div className="flex bg-[#faf9f8] p-1 rounded-full border border-[#d6c2c4]/40">
            <button
              type="button"
              onClick={() => selectTab('admin')}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'admin'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-brand-tertiary hover:text-brand-primary'
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => selectTab('professional')}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'professional'
                  ? 'bg-brand-secondary text-white shadow-sm'
                  : 'text-brand-tertiary hover:text-brand-primary'
              }`}
            >
              Profissional
            </button>
          </div>
        )}
        {success ? (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-brand-primary">Autenticação Concluída</h3>
              <p className="text-sm text-brand-tertiary mt-1">Carregando seu painel...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-[#faf9f8] border border-[#d6c2c4]/40 p-4 rounded-xl text-center">
              <p className="text-[11px] font-sans text-brand-tertiary font-medium leading-snug">
                {tab === 'admin' ? (
                  <>Acesso restrito ao administrador do salão.</>
                ) : (
                  <>Acesso da equipe — use o usuário cadastrado pela administração. Se ainda não tem acesso, peça à administradora para criar pela aba <strong>Equipe</strong> do portal.</>
                )}
                <br /><span className="opacity-70">Senha inicial padrão: <code className="bg-brand-primary-light/35 px-1 py-0.5 rounded font-mono">alves2026</code> — troque no primeiro login.</span>
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-tertiary font-sans uppercase tracking-wider block">Usuário</label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                placeholder={tab === 'admin' ? 'Ex: admin' : 'Ex: joana'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#faf9f8] border border-[#d6c2c4]/50 focus:border-brand-primary/80 focus:ring-1 focus:ring-brand-primary rounded-xl px-4 py-3 text-sm font-sans text-brand-dark outline-none transition-all placeholder-brand-tertiary/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-tertiary font-sans uppercase tracking-wider block">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  placeholder="Sua senha"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white hover:opacity-90 font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-55 ${
                tab === 'admin' ? 'bg-brand-primary' : 'bg-brand-secondary'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando credenciais...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
