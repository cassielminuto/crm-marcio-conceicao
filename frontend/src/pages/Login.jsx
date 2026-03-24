import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Layers } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center mx-auto mb-4">
            <Layers size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Compativeis</h1>
          <p className="text-text-muted text-sm mt-1">CRM Marcio Conceicao</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-card border border-border-subtle rounded-2xl p-8 space-y-5">
          <h2 className="text-lg font-semibold text-text-primary text-center">Entrar</h2>

          {erro && (
            <div className="bg-[rgba(225,112,85,0.1)] border border-[rgba(225,112,85,0.2)] text-accent-danger text-sm rounded-lg px-4 py-3">
              {erro}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2.5 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2.5 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] transition-all"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white py-3 rounded-xl text-sm font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-250"
          >
            {carregando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <LogIn size={16} />
            )}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
