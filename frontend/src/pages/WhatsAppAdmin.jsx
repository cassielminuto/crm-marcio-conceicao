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
      // Criar lead temporário ou usar lead existente
      await api.post('/whatsapp/send', {
        lead_id: 1, // usar primeiro lead para teste
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da conexão */}
      <div className={`rounded-xl border-2 p-5 ${isConectado ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConectado ? 'bg-green-100' : 'bg-yellow-100'}`}>
              {isConectado ? <Wifi size={24} className="text-green-600" /> : <WifiOff size={24} className="text-yellow-600" />}
            </div>
            <div>
              <h3 className={`font-semibold ${isConectado ? 'text-green-700' : 'text-yellow-700'}`}>
                {isConectado ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              </h3>
              <p className="text-xs text-gray-500">
                Status: {status?.state || status?.instance?.state || 'desconhecido'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={verificarStatus}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw size={12} /> Atualizar
            </button>
            {!isConectado && (
              <button
                onClick={gerarQR}
                disabled={gerando}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <QrCode size={12} /> {gerando ? 'Gerando...' : 'Conectar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {qrData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Escaneie o QR Code com o WhatsApp</h3>
          {qrData.qrcode?.base64 ? (
            <img
              src={qrData.qrcode.base64}
              alt="QR Code WhatsApp"
              className="mx-auto max-w-[300px] rounded-lg border border-gray-200"
            />
          ) : qrData.base64 ? (
            <img
              src={qrData.base64}
              alt="QR Code WhatsApp"
              className="mx-auto max-w-[300px] rounded-lg border border-gray-200"
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-mono break-all">
                {JSON.stringify(qrData, null, 2)}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Abra o WhatsApp → Aparelhos Conectados → Conectar Aparelho
          </p>
          <button
            onClick={verificarStatus}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Ja escaneei, verificar conexao
          </button>
        </div>
      )}

      {/* Teste de envio */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Send size={14} /> Teste de Envio
        </h3>

        <form onSubmit={enviarTeste} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefone (com DDD)</label>
            <input
              type="text"
              value={testeTelefone}
              onChange={(e) => setTesteTelefone(e.target.value)}
              placeholder="11999990001"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mensagem</label>
            <textarea
              value={testeMensagem}
              onChange={(e) => setTesteMensagem(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={enviando || !isConectado}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Smartphone size={14} />
            {enviando ? 'Enviando...' : 'Enviar Teste'}
          </button>
          {!isConectado && (
            <p className="text-xs text-yellow-600">Conecte o WhatsApp primeiro para enviar mensagens</p>
          )}
        </form>

        {resultado && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${resultado.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {resultado}
          </div>
        )}
      </div>
    </div>
  );
}
