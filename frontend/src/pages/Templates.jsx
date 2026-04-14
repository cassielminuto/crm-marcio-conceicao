import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Edit2, Trash2, X, FileText, Eye } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

const ETAPA_OPTIONS = [
  { value: '', label: 'Todas as etapas' },
  { value: 'novo', label: 'Novo' },
  { value: 'em_abordagem', label: 'Em Abordagem' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'nurturing', label: 'Nurturing' },
];

const CLASSE_OPTIONS = [
  { value: 'todos', label: 'Todas as classes' },
  { value: 'A', label: 'Classe A' },
  { value: 'B', label: 'Classe B' },
  { value: 'C', label: 'Classe C' },
];

const VARIAVEIS = ['{{nome}}', '{{telefone}}', '{{email}}', '{{dor_principal}}', '{{objecao_principal}}', '{{classe}}', '{{pontuacao}}', '{{vendedor}}', '{{canal}}'];

const FORM_INICIAL = { nome: '', conteudo: '', etapa_funil: '', classe_lead: 'todos', tipo: 'whatsapp' };

export default function Templates() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const isAdmin = usuario?.perfil === 'admin' || usuario?.perfil === 'gestor';

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirForm = (template = null) => {
    if (template) {
      setEditandoId(template.id);
      setForm({
        nome: template.nome,
        conteudo: template.conteudo,
        etapa_funil: template.etapaFunil || '',
        classe_lead: template.classeLead || 'todos',
        tipo: template.tipo || 'whatsapp',
      });
    } else {
      setEditandoId(null);
      setForm(FORM_INICIAL);
    }
    setMostrarForm(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const payload = { ...form };
      if (!payload.etapa_funil) payload.etapa_funil = null;
      if (editandoId) {
        await api.patch(`/templates/${editandoId}`, payload);
      } else {
        await api.post('/templates', payload);
      }
      setMostrarForm(false);
      setForm(FORM_INICIAL);
      setEditandoId(null);
      carregar();
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao salvar', 'urgente');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = (id) => {
    setConfirmDialog({
      titulo: 'Desativar template?',
      mensagem: 'O template será desativado e não poderá mais ser usado em follow-ups.',
      tipo: 'danger',
      textoBotaoConfirmar: 'Desativar',
      onConfirm: async () => {
        try {
          await api.delete(`/templates/${id}`);
          carregar();
        } catch (err) {
          console.error('Erro ao excluir:', err);
        }
        setConfirmDialog(null);
      },
    });
  };

  const inserirVariavel = (variavel) => {
    setForm((prev) => ({ ...prev, conteudo: prev.conteudo + variavel }));
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white">Templates de Mensagem</h2>
          <p className="text-[12px] text-text-secondary mt-1">{templates.filter((t) => t.ativo).length} templates ativos</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => abrirForm()}
            className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] transition-all duration-250"
          >
            <Plus size={16} /> Novo Template
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-text-secondary">
              {editandoId ? 'Editar Template' : 'Novo Template'}
            </h3>
            <button onClick={() => setMostrarForm(false)} className="text-text-muted hover:text-text-secondary">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do template"
                className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
                required
              />
              <select
                value={form.etapa_funil}
                onChange={(e) => setForm({ ...form, etapa_funil: e.target.value })}
                className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              >
                {ETAPA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={form.classe_lead}
                onChange={(e) => setForm({ ...form, classe_lead: e.target.value })}
                className="bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
              >
                {CLASSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.5px]">Conteudo (clique nas variaveis para inserir)</label>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {VARIAVEIS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => inserirVariavel(v)}
                    className="px-2 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[10px] font-mono hover:bg-[rgba(108,92,231,0.18)] transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                rows={5}
                placeholder="Ola {{nome}}! Aqui e do Programa Compativeis..."
                className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none font-mono"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="bg-accent-emerald text-white px-6 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(0,184,148,0.25)] disabled:opacity-50 transition-all"
              >
                {salvando ? 'Salvando...' : editandoId ? 'Atualizar' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-6 py-2 rounded-[10px] text-[12px] text-text-muted hover:bg-white/[0.03]"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="bg-[rgba(0,184,148,0.06)] border border-[rgba(0,184,148,0.15)] rounded-[14px] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold text-accent-emerald">Preview: {preview.nome}</h4>
            <button onClick={() => setPreview(null)} className="text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          </div>
          <div className="bg-bg-elevated rounded-lg p-3 text-[12px] text-text-primary whitespace-pre-wrap">
            {preview.conteudo}
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-12 text-center">
          <FileText size={40} className="text-text-faint mx-auto mb-3" />
          <p className="text-text-muted">Nenhum template criado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`bg-bg-card border border-border-subtle rounded-[14px] p-4 hover:border-border-hover transition-all duration-300 ${!t.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[12px] font-semibold text-text-primary">{t.nome}</h3>
                    <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.04)] text-text-muted rounded text-[10px]">
                      {t.tipo}
                    </span>
                    {t.etapaFunil && (
                      <span className="px-2 py-0.5 bg-[rgba(108,92,231,0.1)] text-accent-violet-light rounded text-[10px]">
                        {t.etapaFunil}
                      </span>
                    )}
                    {t.classeLead !== 'todos' && (
                      <span className="px-2 py-0.5 bg-[rgba(253,203,110,0.1)] text-accent-amber rounded text-[10px]">
                        Classe {t.classeLead}
                      </span>
                    )}
                    {!t.ativo && (
                      <span className="px-2 py-0.5 bg-[rgba(225,112,85,0.1)] text-accent-danger rounded text-[10px]">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted font-mono whitespace-pre-wrap line-clamp-2">
                    {t.conteudo}
                  </p>
                </div>

                {isAdmin && t.ativo && (
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => setPreview(t)}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-white/[0.03] hover:text-text-secondary transition-colors"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => abrirForm(t)}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-[rgba(108,92,231,0.1)] hover:text-accent-violet-light transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => excluir(t.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-[rgba(225,112,85,0.1)] hover:text-accent-danger transition-colors"
                      title="Desativar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDialog && (
        <ConfirmDialog
          isOpen
          titulo={confirmDialog.titulo}
          mensagem={confirmDialog.mensagem}
          tipo={confirmDialog.tipo}
          textoBotaoConfirmar={confirmDialog.textoBotaoConfirmar || 'Confirmar'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
