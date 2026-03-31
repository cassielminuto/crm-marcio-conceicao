import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CORES_CANAL = {
  'Bio': '#10B981',
  'Anuncio': '#3B82F6',
  'Evento': '#8B5CF6',
  'Outros': '#6B7280',
};
const ORDEM_CANAL = ['Bio', 'Anuncio', 'Evento', 'Outros'];

function inferirCanal(lead) {
  if (lead.canal) {
    const c = lead.canal.toLowerCase();
    if (c === 'bio') return 'Bio';
    if (c === 'anuncio' || c === 'anúncio') return 'Anuncio';
    if (c === 'evento') return 'Evento';
    return lead.canal;
  }
  const titulo = (lead.formularioTitulo || '').toUpperCase();
  if (titulo.startsWith('[BIO]')) return 'Bio';
  if (titulo.startsWith('[AN\u00DANCIO]') || titulo.startsWith('[ANUNCIO]')) return 'Anuncio';
  if (titulo.includes('EVENTO')) return 'Evento';
  return 'Outros';
}

function fmtMoeda(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const CanalTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-bg-elevated border border-border-hover rounded-[10px] shadow-[var(--t-shadow-elevated)] px-3 py-2">
      <p className="text-[11px] text-[#F0F0F5] font-semibold">{d.canal}</p>
      {d.total != null && <p className="text-[11px] text-text-secondary">Leads: {d.total}</p>}
      {d.convertidos != null && <p className="text-[11px] text-text-secondary">Convertidos: {d.convertidos}</p>}
      {d.taxa != null && <p className="text-[11px] text-text-secondary">Taxa: {d.taxa}%</p>}
      {d.faturamento != null && <p className="text-[11px] text-text-secondary">Faturamento: {fmtMoeda(d.faturamento)}</p>}
      {d.ticketMedio != null && <p className="text-[11px] text-text-secondary">Ticket medio: {fmtMoeda(d.ticketMedio)}</p>}
    </div>
  );
};

const FormTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-bg-elevated border border-border-hover rounded-[10px] shadow-[var(--t-shadow-elevated)] px-3 py-2 max-w-[250px]">
      <p className="text-[11px] text-[#F0F0F5] font-semibold truncate">{d.formulario}</p>
      <p className="text-[11px] text-text-secondary">Leads: {d.total}</p>
      <p className="text-[11px] text-text-secondary">Convertidos: {d.convertidos} ({d.taxa}%)</p>
    </div>
  );
};

export default function OrigemLeads({ leads, vendas }) {
  const dados = useMemo(() => {
    const canais = {};
    for (const l of leads) {
      const c = inferirCanal(l);
      if (!canais[c]) canais[c] = { canal: c, total: 0, convertidos: 0, faturamento: 0 };
      canais[c].total++;
    }
    for (const v of vendas) {
      const c = inferirCanal(v);
      if (!canais[c]) canais[c] = { canal: c, total: 0, convertidos: 0, faturamento: 0 };
      canais[c].convertidos++;
      canais[c].faturamento += v.valorVenda ? Number(v.valorVenda) : 0;
    }
    const arr = Object.values(canais).map(c => ({
      ...c,
      taxa: c.total > 0 ? Math.round((c.convertidos / c.total) * 10000) / 100 : 0,
      ticketMedio: c.convertidos > 0 ? Math.round(c.faturamento / c.convertidos) : 0,
      cor: CORES_CANAL[c.canal] || CORES_CANAL['Outros'],
    }));
    arr.sort((a, b) => (ORDEM_CANAL.indexOf(a.canal) === -1 ? 99 : ORDEM_CANAL.indexOf(a.canal)) - (ORDEM_CANAL.indexOf(b.canal) === -1 ? 99 : ORDEM_CANAL.indexOf(b.canal)));
    return arr;
  }, [leads, vendas]);

  const porFormulario = useMemo(() => {
    const forms = {};
    for (const l of leads) {
      const f = l.formularioTitulo || 'Sem formulario';
      if (!forms[f]) forms[f] = { formulario: f, total: 0, convertidos: 0 };
      forms[f].total++;
      if (l.vendaRealizada) forms[f].convertidos++;
    }
    return Object.values(forms)
      .map(f => ({ ...f, taxa: f.total > 0 ? Math.round((f.convertidos / f.total) * 10000) / 100 : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(f => ({ ...f, label: f.formulario.length > 30 ? f.formulario.slice(0, 28) + '...' : f.formulario }));
  }, [leads]);

  const totalLeads = leads.length;

  if (totalLeads === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-[16px] font-bold text-white">Origem dos Leads</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Distribuicao por Canal - Donut */}
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
          <h3 className="text-[13px] font-semibold text-white mb-4">Distribuicao por Canal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dados} dataKey="total" nameKey="canal" cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                label={({ canal, total }) => `${canal}: ${total}`} labelLine={false}>
                {dados.map(d => <Cell key={d.canal} fill={d.cor} />)}
              </Pie>
              <Tooltip content={<CanalTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
            {dados.map(d => (
              <div key={d.canal} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
                <span className="text-text-secondary">{d.canal}</span>
                <span className="text-text-muted">{d.total} ({totalLeads > 0 ? Math.round(d.total / totalLeads * 100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Conversao por Canal */}
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
          <h3 className="text-[13px] font-semibold text-white mb-4">Conversao por Canal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dados} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" unit="%" />
              <YAxis type="category" dataKey="canal" tick={{ fontSize: 11, fill: '#a0a0be' }} stroke="#3a3a5a" width={65} />
              <Tooltip content={<CanalTooltip />} />
              <Bar dataKey="taxa" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fill: '#F0F0F5', formatter: (v, _, p) => p?.payload ? `${p.payload.convertidos}/${p.payload.total}` : '' }}>
                {dados.map(d => <Cell key={d.canal} fill={d.cor} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 3. Faturamento por Canal */}
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
          <h3 className="text-[13px] font-semibold text-white mb-4">Faturamento por Canal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dados}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="canal" tick={{ fontSize: 11, fill: '#a0a0be' }} stroke="#3a3a5a" />
              <YAxis tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CanalTooltip />} />
              <Bar dataKey="faturamento" radius={[4, 4, 0, 0]}>
                {dados.map(d => <Cell key={d.canal} fill={d.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
            {dados.filter(d => d.faturamento > 0).map(d => (
              <div key={d.canal} className="text-[10px] text-text-muted">
                <span style={{ color: d.cor }} className="font-medium">{d.canal}:</span> {fmtMoeda(d.faturamento)} (ticket {fmtMoeda(d.ticketMedio)})
              </div>
            ))}
          </div>
        </div>

        {/* 4. Leads por Formulario */}
        <div className="bg-bg-card border border-border-default rounded-[14px] p-6">
          <h3 className="text-[13px] font-semibold text-white mb-4">Top 10 Formularios</h3>
          {porFormulario.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, porFormulario.length * 28)}>
              <BarChart data={porFormulario} layout="vertical" margin={{ left: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#3a3a5a' }} stroke="#3a3a5a" />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#a0a0be' }} stroke="#3a3a5a" width={120} />
                <Tooltip content={<FormTooltip />} />
                <Bar dataKey="total" fill="#7C3AED" fillOpacity={0.6} radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fontSize: 9, fill: '#a0a0be', formatter: (v, _, p) => p?.payload?.convertidos > 0 ? `${p.payload.taxa}%` : '' }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-center py-8">Sem dados</p>
          )}
        </div>
      </div>
    </div>
  );
}
