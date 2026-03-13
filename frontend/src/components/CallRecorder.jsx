import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';
import { Mic, Square, Pause, Play, Upload, Loader, Bot } from 'lucide-react';

function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export default function CallRecorder({ leadId, onTranscricaoConcluida }) {
  const [estado, setEstado] = useState('idle'); // idle | gravando | pausado | processando
  const [duracao, setDuracao] = useState(0);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Timer de duração
  useEffect(() => {
    if (estado === 'gravando') {
      timerRef.current = setInterval(() => {
        setDuracao((d) => d + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [estado]);

  const iniciarGravacao = useCallback(async () => {
    setErro('');
    setResultado(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // chunks de 1s
      setEstado('gravando');
      setDuracao(0);
    } catch (err) {
      setErro('Erro ao acessar microfone. Verifique as permissoes do navegador.');
      console.error(err);
    }
  }, []);

  const pausarGravacao = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setEstado('pausado');
    }
  }, []);

  const retomarGravacao = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setEstado('gravando');
    }
  }, []);

  const pararGravacao = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    setEstado('processando');

    // Parar gravação e aguardar todos os chunks
    await new Promise((resolve) => {
      mediaRecorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        resolve();
      };
      mediaRecorderRef.current.stop();
    });

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

    // Upload + transcrição em um passo
    const formData = new FormData();
    formData.append('audio', blob, `call-${Date.now()}.webm`);
    formData.append('lead_id', String(leadId));
    formData.append('duracao', String(duracao));

    try {
      const { data } = await api.post('/calls/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min timeout para processamento IA
      });

      setResultado(data);

      if (onTranscricaoConcluida) {
        onTranscricaoConcluida(data);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao processar gravacao';
      setErro(msg);
      console.error(err);
    } finally {
      setEstado('idle');
    }
  }, [leadId, duracao, onTranscricaoConcluida]);

  const resetar = () => {
    setEstado('idle');
    setDuracao(0);
    setErro('');
    setResultado(null);
    chunksRef.current = [];
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 flex items-center gap-1">
        Gravacao de Call
      </h4>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {/* Controles de gravação */}
      <div className="flex items-center gap-3">
        {estado === 'idle' && !resultado && (
          <button
            onClick={iniciarGravacao}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <Mic size={14} />
            Gravar Call
          </button>
        )}

        {estado === 'gravando' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono font-bold text-gray-700">
                {formatarTempo(duracao)}
              </span>
            </div>
            <button
              onClick={pausarGravacao}
              className="p-2 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
              title="Pausar"
            >
              <Pause size={14} />
            </button>
            <button
              onClick={pararGravacao}
              className="flex items-center gap-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <Square size={12} />
              Parar
            </button>
          </>
        )}

        {estado === 'pausado' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-mono font-bold text-gray-700">
                {formatarTempo(duracao)} (pausado)
              </span>
            </div>
            <button
              onClick={retomarGravacao}
              className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              title="Retomar"
            >
              <Play size={14} />
            </button>
            <button
              onClick={pararGravacao}
              className="flex items-center gap-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <Square size={12} />
              Parar
            </button>
          </>
        )}

        {estado === 'processando' && (
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <Loader size={16} className="animate-spin" />
            <span>Transcrevendo e analisando com IA...</span>
          </div>
        )}

        {resultado && estado === 'idle' && (
          <button
            onClick={resetar}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Mic size={14} />
            Nova Gravacao
          </button>
        )}
      </div>

      {/* Resultado da transcrição */}
      {resultado && (
        <div className="space-y-3 border border-purple-200 rounded-lg p-3 bg-purple-50">
          <div className="flex items-center gap-1 text-xs font-semibold text-purple-700">
            <Bot size={12} />
            Analise IA concluida
          </div>

          {resultado.analise?.resumo && (
            <div>
              <p className="text-[10px] font-semibold text-purple-500 mb-1">Resumo</p>
              <p className="text-xs text-gray-700 leading-relaxed">{resultado.analise.resumo}</p>
            </div>
          )}

          {resultado.camposAtualizados?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-purple-500">Campos atualizados:</span>
              {resultado.camposAtualizados.map((c) => (
                <span key={c} className="px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded text-[10px] font-medium">
                  {c}
                </span>
              ))}
            </div>
          )}

          {resultado.transcricao && (
            <details className="text-xs">
              <summary className="cursor-pointer text-purple-600 hover:underline">
                Ver transcricao completa
              </summary>
              <p className="mt-2 text-gray-600 leading-relaxed whitespace-pre-wrap bg-white rounded p-2 max-h-40 overflow-y-auto">
                {resultado.transcricao}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
