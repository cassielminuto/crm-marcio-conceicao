import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PhotoCropper from '../components/PhotoCropper';
import { Camera, User, Mail, Phone, Lock, Shield, Save, Trash2, BarChart3, Users, Trophy, Target } from 'lucide-react';

export default function Perfil() {
  const { usuario, login: reloadAuth } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Form dados pessoais
  const [nome, setNome] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState('');

  // Form senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirmar, setSenhaConfirmar] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [senhaMsg, setSenhaMsg] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get('/perfil');
        setPerfil(data);
        setNome(data.nome || '');
        setNomeExibicao(data.vendedor?.nomeExibicao || '');
        setTelefoneWhatsapp(data.vendedor?.telefoneWhatsapp || '');
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
  };

  const handleCropComplete = async (blob) => {
    setCropImageUrl(null);
    setUploadingFoto(true);
    const formData = new FormData();
    formData.append('foto', blob, 'avatar.jpg');
    try {
      const { data } = await api.post('/perfil/foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPerfil(prev => ({ ...prev, fotoUrl: data.fotoUrl }));
    } catch (err) {
      console.error('Erro ao upload foto:', err);
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleRemoverFoto = async () => {
    try {
      await api.delete('/perfil/foto');
      setPerfil(prev => ({ ...prev, fotoUrl: null }));
    } catch (err) {
      console.error('Erro ao remover foto:', err);
    }
  };

  const salvarDados = async () => {
    setSalvando(true);
    setSalvoMsg('');
    try {
      await api.patch('/perfil', {
        nome,
        nomeExibicao: nomeExibicao || undefined,
        telefoneWhatsapp: telefoneWhatsapp || undefined,
      });
      setSalvoMsg('Salvo!');
      setTimeout(() => setSalvoMsg(''), 2000);
    } catch (err) {
      setSalvoMsg(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const salvarSenha = async () => {
    if (senhaNova !== senhaConfirmar) {
      setSenhaMsg('As senhas nao coincidem');
      return;
    }
    if (senhaNova.length < 6) {
      setSenhaMsg('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSalvandoSenha(true);
    setSenhaMsg('');
    try {
      await api.patch('/perfil', { senhaAtual, senhaNova });
      setSenhaMsg('Senha atualizada!');
      setSenhaAtual('');
      setSenhaNova('');
      setSenhaConfirmar('');
      setTimeout(() => setSenhaMsg(''), 2000);
    } catch (err) {
      setSenhaMsg(err.response?.data?.error || 'Erro ao atualizar senha');
    } finally {
      setSalvandoSenha(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  if (!perfil) return null;

  const iniciais = (perfil.nome || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isVendedor = !!perfil.vendedor;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header — Foto + Info */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {perfil.fotoUrl ? (
              <img
                src={perfil.fotoUrl}
                alt={perfil.nome}
                className="w-24 h-24 rounded-full object-cover border-2 border-border-default group-hover:border-accent-violet transition-colors"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#00cec9] flex items-center justify-center text-[28px] font-bold text-white">
                {iniciais}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploadingFoto ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-white">{perfil.nome}</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">{perfil.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(108,92,231,0.12)] text-accent-violet-light">
                {perfil.perfil}
              </span>
              {isVendedor && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,184,148,0.1)] text-accent-emerald">
                  {perfil.vendedor.papel?.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              Membro desde {new Date(perfil.createdAt).toLocaleDateString('pt-BR')}
            </p>
            {perfil.fotoUrl && (
              <button
                onClick={handleRemoverFoto}
                className="flex items-center gap-1 mt-2 text-[10px] text-accent-danger hover:underline"
              >
                <Trash2 size={10} /> Remover foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
        <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
          <User size={16} className="text-text-muted" /> Dados Pessoais
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
            />
          </div>

          {isVendedor && (
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                Nome de exibicao
              </label>
              <input
                type="text"
                value={nomeExibicao}
                onChange={(e) => setNomeExibicao(e.target.value)}
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Email
            </label>
            <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2">
              <Mail size={12} className="text-text-muted" />
              <span className="text-[12px] text-text-secondary">{perfil.email}</span>
            </div>
          </div>

          {isVendedor && (
            <div>
              <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
                WhatsApp
              </label>
              <div className="relative">
                <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={telefoneWhatsapp}
                  onChange={(e) => setTelefoneWhatsapp(e.target.value)}
                  placeholder="48999887766"
                  className="w-full bg-bg-input border border-border-default rounded-lg pl-8 pr-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Perfil
            </label>
            <div className="flex items-center gap-2 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2">
              <Shield size={12} className="text-text-muted" />
              <span className="text-[12px] text-text-secondary">{perfil.perfil}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={salvarDados}
            disabled={salvando}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 transition-all duration-250"
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
          {salvoMsg && (
            <span className={`text-[11px] ${salvoMsg === 'Salvo!' ? 'text-accent-emerald' : 'text-accent-danger'}`}>
              {salvoMsg}
            </span>
          )}
        </div>
      </div>

      {/* Trocar Senha */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
        <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
          <Lock size={16} className="text-text-muted" /> Trocar Senha
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Senha atual
            </label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Nova senha
            </label>
            <input
              type="password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={senhaConfirmar}
              onChange={(e) => setSenhaConfirmar(e.target.value)}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={salvarSenha}
            disabled={salvandoSenha || !senhaAtual || !senhaNova}
            className="flex items-center gap-2 bg-bg-elevated border border-border-default text-text-secondary px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:border-border-active hover:text-[#b0b0d0] disabled:opacity-50 transition-all duration-250"
          >
            <Lock size={14} />
            {salvandoSenha ? 'Atualizando...' : 'Atualizar senha'}
          </button>
          {senhaMsg && (
            <span className={`text-[11px] ${senhaMsg === 'Senha atualizada!' ? 'text-accent-emerald' : 'text-accent-danger'}`}>
              {senhaMsg}
            </span>
          )}
        </div>
      </div>

      {/* Estatisticas (vendedor) */}
      {isVendedor && (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <BarChart3 size={16} className="text-text-muted" /> Estatisticas
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-elevated rounded-[10px] p-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-[rgba(108,92,231,0.1)] flex items-center justify-center mx-auto mb-2">
                <BarChart3 size={14} className="text-accent-violet-light" />
              </div>
              <p className="text-[16px] font-extrabold text-white">{(perfil.vendedor.scorePerformance || 0).toFixed(0)}</p>
              <p className="text-[10px] text-text-muted">Score</p>
            </div>
            <div className="bg-bg-elevated rounded-[10px] p-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-[rgba(116,185,255,0.1)] flex items-center justify-center mx-auto mb-2">
                <Users size={14} className="text-accent-info" />
              </div>
              <p className="text-[16px] font-extrabold text-white">{perfil.vendedor.leadsAtivos}/{perfil.vendedor.leadsMax}</p>
              <p className="text-[10px] text-text-muted">Leads Ativos</p>
            </div>
            <div className="bg-bg-elevated rounded-[10px] p-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-[rgba(0,184,148,0.1)] flex items-center justify-center mx-auto mb-2">
                <Target size={14} className="text-accent-emerald" />
              </div>
              <p className="text-[16px] font-extrabold text-white">{perfil.vendedor.totalConversoes}</p>
              <p className="text-[10px] text-text-muted">Conversoes</p>
            </div>
            <div className="bg-bg-elevated rounded-[10px] p-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-[rgba(253,203,110,0.1)] flex items-center justify-center mx-auto mb-2">
                <Trophy size={14} className="text-accent-amber" />
              </div>
              <p className="text-[16px] font-extrabold text-white">#{perfil.vendedor.rankingPosicao || '-'}</p>
              <p className="text-[10px] text-text-muted">Ranking</p>
            </div>
          </div>
        </div>
      )}

      {cropImageUrl && (
        <PhotoCropper
          imageUrl={cropImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            URL.revokeObjectURL(cropImageUrl);
            setCropImageUrl(null);
          }}
        />
      )}
    </div>
  );
}
