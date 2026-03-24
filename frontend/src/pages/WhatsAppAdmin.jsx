import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Send } from 'lucide-react';

export default function WhatsAppAdmin() {
  const [status, setStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [testeTelefone, setTesteTelefone] = useState('');
  const [testeMensagem, setTesteMensagem] = useState('Teste de conexao WhatsApp — CRM Compativeis');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState('');

  const verificarStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data);
    } catch (err) {
      setStatus({ state: 'error', error: err.response?.data?.error || 'Erro ao verificar' });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { verificarStatus(); }, [verificarStatus]);

  const gerarQR = async () => {
    setGerando(true);
    setQrData(null);
    try {
      const { data } = await api.get('/whatsapp/qrcode');
      setQrData(data);
    } catch (err) {
      setResultado(`Erro: ${err.response?.data?.error || err.message}`);
    } finally {
      setGerando(false);
    }
  };

  const enviarTeste = async (e) => {
    e.preventDefault();
    if (!testeTelefone) return;
    setEnviando(true);
    setResultado('');
    try {
      await api.post('/whatsapp/send', {
        lead_id: 1,
        mensagem: testeMensagem,
      });
      setResultado('Mensagem enviada com sucesso!');
    } catch (err) {
      setResultado(`Erro: ${err.response?.data?.error || err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const isConectado = status?.state === 'open' || status?.instance?.state === 'open';

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={`bg-bg-card rounded-[14px] border-2 p-[22px] ${isConectado ? 'border-[rgba(0,184,148,0.3)]' : 'border-[rgba(253,203,110,0.3)]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConectado ? 'bg-[rgba(0,184,148,0.1)]' : 'bg-[rgba(253,203,110,0.1)]'}`}>
              {isConectado ? <Wifi size={24} className="text-accent-emerald" /> : <WifiOff size={24} className="text-accent-amber" />}
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] ${isConectado ? 'text-accent-emerald' : 'text-accent-amber'}`}>
                {isConectado ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              </h3>
              <p className="text-[10px] text-text-muted">
                Status: {status?.state || status?.instance?.state || 'desconhecido'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={verificarStatus}
              className="flex items-center gap-1 px-3 py-2 rounded-[10px] text-[11px] font-medium bg-bg-elevated border border-border-default text-text-secondary hover:border-border-active transition-all"
            >
              <RefreshCw size={12} /> Atualizar
            </button>
            {!isConectado && (
              <button
                onClick={gerarQR}
                disabled={gerando}
                className="flex items-center gap-1 px-3 py-2 rounded-[10px] text-[11px] font-semibold bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] disabled:opacity-50 transition-all"
              >
                <QrCode size={12} /> {gerando ? 'Gerando...' : 'Conectar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {qrData && (
        <div className="bg-bg-card border border-border-subtle rounded-[14px] p-6 text-center">
          <h3 className="text-[13px] font-semibold text-white mb-4">Escaneie o QR Code com o WhatsApp</h3>
          {qrData.qrcode?.base64 ? (
            <img src={qrData.qrcode.base64} alt="QR Code WhatsApp" className="mx-auto max-w-[300px] rounded-lg border border-border-subtle" />
          ) : qrData.base64 ? (
            <img src={qrData.base64} alt="QR Code WhatsApp" className="mx-auto max-w-[300px] rounded-lg border border-border-subtle" />
          ) : (
            <div className="p-4 bg-bg-elevated rounded-lg">
              <p className="text-[10px] text-text-muted font-mono break-all">{JSON.stringify(qrData, null, 2)}</p>
            </div>
          )}
          <p className="text-[10px] text-text-muted mt-3">Abra o WhatsApp &rarr; Aparelhos Conectados &rarr; Conectar Aparelho</p>
          <button onClick={verificarStatus} className="mt-3 text-[11px] text-accent-violet-light hover:underline">
            Ja escaneei, verificar conexao
          </button>
        </div>
      )}

      {/* Teste de envio */}
      <div className="bg-bg-card border border-border-subtle rounded-[14px] p-[22px]">
        <h3 className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
          <Send size={14} className="text-text-muted" /> Teste de Envio
        </h3>

        <form onSubmit={enviarTeste} className="space-y-3">
          <div>
            <label className="block text-[10px] text-text-muted font-semibold uppercase tracking-[0.5px] mb-1">Telefone (com DDD)</label>
            <input
              type="text"
              value={testeTelefone}
              onChange={(e) => setTesteTelefone(e.target.value)}
              placeholder="11999990001"
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)]"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted font-semibold uppercase tracking-[0.5px] mb-1">Mensagem</label>
            <textarea
              value={testeMensagem}
              onChange={(e) => setTesteMensagem(e.target.value)}
              rows={3}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-[rgba(108,92,231,0.4)] focus:ring-[3px] focus:ring-[rgba(108,92,231,0.06)] resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={enviando || !isConectado}
            className="flex items-center gap-2 bg-accent-emerald text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(0,184,148,0.25)] disabled:opacity-50 transition-all"
          >
            <Smartphone size={14} />
            {enviando ? 'Enviando...' : 'Enviar Teste'}
          </button>
          {!isConectado && (
            <p className="text-[10px] text-accent-amber">Conecte o WhatsApp primeiro para enviar mensagens</p>
          )}
        </form>

        {resultado && (
          <div className={`mt-3 text-[12px] px-3 py-2 rounded-[10px] ${resultado.startsWith('Erro') ? 'bg-[rgba(225,112,85,0.1)] text-accent-danger' : 'bg-[rgba(0,184,148,0.1)] text-accent-emerald'}`}>
            {resultado}
          </div>
        )}
      </div>
    </div>
  );
}
