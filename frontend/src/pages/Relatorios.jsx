import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileDown, TrendingUp, DollarSign, Users } from 'lucide-react';

const CORES_CANAL = { bio: '#3b82f6', anuncio: '#f59e0b', evento: '#10b981' };
const CORES_CLASSE = { A: '#ef4444', B: '#f59e0b', C: '#3b82f6' };
const CORES_PIE = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

function CardMetrica({ titulo, valor, icone: Icon, cor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{titulo}</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{valor}</p>
        </div>
        <div className={`p-2 rounded-lg ${cor}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function Relatorios() {
  const [geral, setGeral] = useState(null);
  const [porCanal, setPorCanal] = useState([]);
  const [porClasse, setPorClasse] = useState([]);
  const [porCloser, setPorCloser] = useState([]);
  const [leadsPorDia, setLeadsPorDia] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [geralRes, canalRes, classeRes, closerRes, diasRes] = await Promise.all([
          api.get('/relatorios/geral'),
          api.get('/relatorios/por-canal'),
          api.get('/relatorios/por-classe'),
          api.get('/relatorios/por-closer'),
          api.get('/leads/por-dia?dias=30'),
        ]);
        setGeral(geralRes.data);
        setPorCanal(canalRes.data);
        setPorClasse(classeRes.data);
        setPorCloser(closerRes.data);
        setLeadsPorDia(diasRes.data);
      } catch (err) {
        console.error('Erro ao carregar relatorios:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const exportarCSV = (dados, nome) => {
    if (!dados || dados.length === 0) return;
    const headers = Object.keys(dados[0]);
    const csv = [
      headers.join(','),
      ...dados.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-bold text-gray-800">Relatorios</h1>
          <p className="text-sm text-gray-500 mt-1">Visao gerencial do CRM</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCSV(porCloser, 'relatorio-closers')}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700"
          >
            <FileDown size={14} /> CSV Closers
          </button>
          <button
            onClick={() => exportarCSV(porCanal, 'relatorio-canais')}
            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-700"
          >
            <FileDown size={14} /> CSV Canais
          </button>
        </div>
      </div>

      {/* KPIs gerais */}
      {geral && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardMetrica titulo="Total de Leads" valor={geral.totalLeads} icone={Users} cor="bg-blue-50 text-blue-600" />
          <CardMetrica titulo="Taxa de Conversao" valor={`${geral.taxaConversao}%`} icone={TrendingUp} cor="bg-green-50 text-green-600" />
          <CardMetrica titulo="Faturamento" valor={`R$ ${geral.faturamento.toLocaleString('pt-BR')}`} icone={DollarSign} cor="bg-yellow-50 text-yellow-600" />
          <CardMetrica titulo="Convertidos" valor={geral.convertidos} icone={TrendingUp} cor="bg-purple-50 text-purple-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversão por Canal */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversao por Canal</h2>
          {porCanal.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={porCanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="canal" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n) => [n === 'taxaConversao' ? `${v}%` : v, n === 'taxaConversao' ? 'Taxa' : n]} />
                <Bar dataKey="totalLeads" fill="#93c5fd" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="convertidos" fill="#3b82f6" name="Convertidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Sem dados</p>
          )}
          <div className="mt-3 space-y-1">
            {porCanal.map((c) => (
              <div key={c.canal} className="flex justify-between text-xs">
                <span className="text-gray-600 capitalize">{c.canal}</span>
                <span className="font-medium">{c.taxaConversao}% ({c.convertidos}/{c.totalLeads}) — R$ {c.faturamento.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversão por Classe */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversao por Classe</h2>
          {porClasse.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={porClasse} dataKey="totalLeads" nameKey="classe" cx="50%" cy="50%" outerRadius={80} label={({ classe, taxaConversao }) => `${classe}: ${taxaConversao}%`}>
                  {porClasse.map((entry, idx) => (
                    <Cell key={entry.classe} fill={CORES_CLASSE[entry.classe] || CORES_PIE[idx]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Leads']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Sem dados</p>
          )}
          <div className="mt-3 space-y-1">
            {porClasse.map((c) => (
              <div key={c.classe} className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_CLASSE[c.classe] }} />
                  Classe {c.classe}
                </span>
                <span className="font-medium">{c.taxaConversao}% ({c.convertidos}/{c.totalLeads})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume de leads por dia */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Volume de Leads (30 dias)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={leadsPorDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v + 'T12:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip labelFormatter={(v) => new Date(v + 'T12:00:00').toLocaleDateString('pt-BR')} />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance por Closer */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Performance por Closer</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Closer</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Leads</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Conversoes</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Taxa</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Tempo Medio</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Faturamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {porCloser.map((c) => (
              <tr key={c.vendedorId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.papel?.replace('_', ' ')}</p>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">{c.totalLeads}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-green-600">{c.convertidos}</td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">{c.taxaConversao}%</td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {c.tempoMedioAbordagemMin !== null ? `${c.tempoMedioAbordagemMin}min` : '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
                  R$ {c.faturamento.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
