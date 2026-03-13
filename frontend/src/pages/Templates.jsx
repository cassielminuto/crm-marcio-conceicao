import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, FileText, Eye } from 'lucide-react';

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
  const [templates, setTemplates] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState(null);

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
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm('Desativar este template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      carregar();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const inserirVariavel = (variavel) => {
    setForm((prev) => ({ ...prev, conteudo: prev.conteudo + variavel }));
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Templates de Mensagem</h1>
          <p className="text-sm text-gray-500 mt-1">{templates.filter((t) => t.ativo).length} templates ativos</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => abrirForm()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Novo Template
          </button>
        )}
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {editandoId ? 'Editar Template' : 'Novo Template'}
            </h3>
            <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600">
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
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <select
                value={form.etapa_funil}
                onChange={(e) => setForm({ ...form, etapa_funil: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ETAPA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={form.classe_lead}
                onChange={(e) => setForm({ ...form, classe_lead: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CLASSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">Conteudo (clique nas variaveis para inserir)</label>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {VARIAVEIS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => inserirVariavel(v)}
                    className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-mono hover:bg-blue-200"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={salvando}
                className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : editandoId ? 'Atualizar' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-6 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-green-700">Preview: {preview.nome}</h4>
            <button onClick={() => setPreview(null)} className="text-green-400 hover:text-green-600">
              <X size={14} />
            </button>
          </div>
          <div className="bg-white rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap shadow-sm">
            {preview.conteudo}
          </div>
        </div>
      )}

      {/* Lista de templates */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum template criado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-xl border border-gray-200 p-4 ${!t.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-800">{t.nome}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                      {t.tipo}
                    </span>
                    {t.etapaFunil && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px]">
                        {t.etapaFunil}
                      </span>
                    )}
                    {t.classeLead !== 'todos' && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-600 rounded text-[10px]">
                        Classe {t.classeLead}
                      </span>
                    )}
                    {!t.ativo && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono whitespace-pre-wrap line-clamp-2">
                    {t.conteudo}
                  </p>
                </div>

                {isAdmin && t.ativo && (
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={() => setPreview(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => abrirForm(t)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => excluir(t.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
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
    </div>
  );
}
