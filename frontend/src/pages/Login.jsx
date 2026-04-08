import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(email, senha);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detalhes?.[0]?.mensagem || 'Erro ao fazer login';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(80px, -60px) scale(1.15); }
          50% { transform: translate(-40px, 80px) scale(0.9); }
          75% { transform: translate(60px, 40px) scale(1.05); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-70px, 50px) scale(0.95); }
          50% { transform: translate(60px, -80px) scale(1.1); }
          75% { transform: translate(-50px, -30px) scale(1.05); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, 70px) scale(1.1); }
          50% { transform: translate(-60px, -50px) scale(0.95); }
          75% { transform: translate(30px, -60px) scale(1.08); }
        }
        @keyframes cardEntrance {
          0% { opacity: 0; transform: scale(0.92) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInError {
          0% { opacity: 0; transform: translateY(-8px); max-height: 0; }
          100% { opacity: 1; transform: translateY(0); max-height: 80px; }
        }
        @keyframes gridFade {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.06; }
        }
        .login-card {
          animation: cardEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .error-slide {
          animation: slideInError 0.35s ease-out forwards;
        }
        .blob-1 { animation: blob1 18s ease-in-out infinite; }
        .blob-2 { animation: blob2 22s ease-in-out infinite; }
        .blob-3 { animation: blob3 20s ease-in-out infinite; }
        .grid-overlay {
          animation: gridFade 8s ease-in-out infinite;
        }
        .input-group:focus-within .input-icon {
          color: #8b5cf6;
        }
        .input-group:focus-within .input-border {
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        .login-btn {
          background: linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4);
          background-size: 200% 200%;
          transition: all 0.3s ease;
        }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.35), 0 4px 16px rgba(59, 130, 246, 0.25);
          background-position: 100% 0;
        }
        .login-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a14' }}>
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="blob-1 absolute rounded-full blur-[120px] opacity-40"
            style={{
              width: '500px', height: '500px',
              background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
              top: '-10%', left: '-5%',
            }}
          />
          <div
            className="blob-2 absolute rounded-full blur-[120px] opacity-30"
            style={{
              width: '450px', height: '450px',
              background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
              bottom: '-15%', right: '-5%',
            }}
          />
          <div
            className="blob-3 absolute rounded-full blur-[100px] opacity-25"
            style={{
              width: '350px', height: '350px',
              background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
              top: '50%', left: '50%',
              marginTop: '-175px', marginLeft: '-175px',
            }}
          />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="grid-overlay absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glass-morphism card */}
        <div className="login-card relative z-10 w-full max-w-[420px] mx-4">
          {/* Branding */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-extrabold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #818cf8, #38bdf8, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              HLPIPE
            </h1>
            <p className="text-[#8892b0] text-sm font-light mt-1 tracking-wide">
              CRM Comercial
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 border"
            style={{
              background: 'rgba(15, 15, 30, 0.7)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            <h2 className="text-lg font-semibold text-white text-center mb-6">
              Bem-vindo de volta
            </h2>

            {/* Error message */}
            {erro && (
              <div className="error-slide mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm overflow-hidden"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                }}
              >
                <span className="shrink-0 mt-0.5">!</span>
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="input-group">
                <label htmlFor="email" className="block text-[11px] font-medium text-[#8892b0] uppercase tracking-wider mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 input-icon text-[#4a5568] transition-colors duration-200">
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-border w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-[#3a4560] transition-all duration-200 outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="input-group">
                <label htmlFor="senha" className="block text-[11px] font-medium text-[#8892b0] uppercase tracking-wider mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 input-icon text-[#4a5568] transition-colors duration-200">
                    <Lock size={16} />
                  </div>
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="input-border w-full rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-[#3a4560] transition-all duration-200 outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#8b5cf6] transition-colors duration-200 p-0.5"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={carregando}
                className="login-btn w-full flex items-center justify-center gap-2.5 text-white py-3.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {carregando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-[#3a4560] text-xs mt-6">
            Plataforma de gestao comercial
          </p>
        </div>
      </div>
    </>
  );
}
