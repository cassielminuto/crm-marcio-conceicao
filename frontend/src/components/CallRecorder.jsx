import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';
import { Mic, Square, Pause, Play, Upload, Loader, Bot, Monitor } from 'lucide-react';

function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export default function CallRecorder({ leadId, onTranscricaoConcluida }) {
  const [estado, setEstado] = useState('idle'); // idle | gravando | pausado | processando
  const [modoGravacao, setModoGravacao] = useState(null); // 'mic' | 'whatsapp'
  const [duracao, setDuracao] = useState(0);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);

  // Upload de arquivo
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [uploadProgresso, setUploadProgresso] = useState(0);
  const [uploadAtivo, setUploadAtivo] = useState(false);
  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioContextRef = useRef(null);

  // Timer de duracao
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

  const limparStreams = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    streamRef.current = null;
    displayStreamRef.current = null;
    audioContextRef.current = null;
  }, []);

  const iniciarGravacaoMic = useCallback(async () => {
    setErro('');
    setResultado(null);
    setModoGravacao('mic');

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
        limparStreams();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setEstado('gravando');
      setDuracao(0);
    } catch (err) {
      setErro('Erro ao acessar microfone. Verifique as permissoes do navegador.');
      console.error(err);
    }
  }, [limparStreams]);

  const iniciarGravacaoWhatsApp = useCallback(async () => {
    setErro('');
    setResultado(null);
    setModoGravacao('whatsapp');

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      displayStreamRef.current = displayStream;

      // Verificar se audio do sistema foi capturado
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach((t) => t.stop());
        setErro('Audio do sistema nao foi capturado. Marque "Compartilhar audio" ao selecionar a aba/tela.');
        return;
      }

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = micStream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(displayStream).connect(destination);
      audioContext.createMediaStreamSource(micStream).connect(destination);

      const combinedStream = destination.stream;

      const mediaRecorder = new MediaRecorder(combinedStream, {
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
        limparStreams();
      };

      // Se o usuario parar o compartilhamento, parar a gravacao
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mediaRecorderRef.current?.state === 'recording' || mediaRecorderRef.current?.state === 'paused') {
          pararGravacao();
        }
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setEstado('gravando');
      setDuracao(0);
    } catch (err) {
      limparStreams();
      if (err.name === 'NotAllowedError') {
        setErro('Compartilhamento de tela cancelado.');
      } else {
        setErro('Erro ao iniciar gravacao. Verifique as permissoes do navegador.');
      }
      console.error(err);
    }
  }, [limparStreams]);

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

    await new Promise((resolve) => {
      mediaRecorderRef.current.onstop = () => {
        limparStreams();
        resolve();
      };
      mediaRecorderRef.current.stop();
    });

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('audio', blob, `call-${Date.now()}.webm`);
    formData.append('lead_id', String(leadId));
    formData.append('duracao', String(duracao));

    try {
      const { data } = await api.post('/calls/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
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
      setModoGravacao(null);
    }
  }, [leadId, duracao, onTranscricaoConcluida, limparStreams]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoSelecionado(file);
      setErro('');
    }
  };

  const enviarArquivo = useCallback(async () => {
    if (!arquivoSelecionado) return;

    setUploadAtivo(true);
    setUploadProgresso(0);
    setErro('');

    const formData = new FormData();
    formData.append('audio', arquivoSelecionado);
    formData.append('lead_id', String(leadId));
    formData.append('duracao', '0');

    try {
      const { data } = await api.post('/calls/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgresso(pct);
        },
      });

      setResultado(data);
      setArquivoSelecionado(null);

      if (onTranscricaoConcluida) {
        onTranscricaoConcluida(data);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao processar arquivo';
      setErro(msg);
      console.error(err);
    } finally {
      setUploadAtivo(false);
      setUploadProgresso(0);
    }
  }, [arquivoSelecionado, leadId, onTranscricaoConcluida]);

  const resetar = () => {
    setEstado('idle');
    setModoGravacao(null);
    setDuracao(0);
    setErro('');
    setResultado(null);
    setArquivoSelecionado(null);
    setUploadAtivo(false);
    setUploadProgresso(0);
    chunksRef.current = [];
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px]">
        Gravacao de Call
      </h4>

      {erro && (
        <div className="bg-[rgba(225,112,85,0.08)] border border-[rgba(225,112,85,0.15)] text-accent-danger text-[11px] rounded-[10px] px-3 py-2">
          {erro}
        </div>
      )}

      {/* Botoes idle */}
      {estado === 'idle' && !resultado && !uploadAtivo && (
        <div className="flex flex-col gap-2">
          <button
            onClick={iniciarGravacaoMic}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-red-500 text-white rounded-[10px] px-4 py-2.5 text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:-translate-y-[1px] transition-all duration-250"
          >
            <Mic size={14} />
            Gravar Call
          </button>
          <button
            onClick={iniciarGravacaoWhatsApp}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white rounded-[10px] px-4 py-2.5 text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] hover:-translate-y-[1px] transition-all duration-250"
          >
            <Monitor size={14} />
            Gravar + WhatsApp
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-bg-elevated border border-border-default text-text-secondary rounded-[10px] px-4 py-2.5 text-[12px] font-semibold hover:border-border-active hover:text-[#b0b0d0] transition-all duration-250"
          >
            <Upload size={14} />
            Enviar Gravacao
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.webm,.m4a,.ogg,.mp4"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Arquivo selecionado */}
      {arquivoSelecionado && !uploadAtivo && estado === 'idle' && !resultado && (
        <div className="bg-bg-elevated border border-border-default rounded-[10px] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-primary truncate">{arquivoSelecionado.name}</span>
            <button onClick={() => setArquivoSelecionado(null)} className="text-text-muted hover:text-text-secondary text-[10px]">
              Remover
            </button>
          </div>
          <button
            onClick={enviarArquivo}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white rounded-[10px] px-4 py-2 text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] transition-all duration-250"
          >
            <Upload size={14} />
            Enviar e Transcrever
          </button>
        </div>
      )}

      {/* Upload em progresso */}
      {uploadAtivo && (
        <div className="bg-bg-elevated border border-border-default rounded-[10px] p-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-accent-violet-light">
            <Loader size={14} className="animate-spin" />
            <span>{uploadProgresso < 100 ? 'Enviando...' : 'Transcrevendo e analisando com IA...'}</span>
          </div>
          <div className="w-full bg-bg-primary rounded-full h-[6px]">
            <div
              className="h-[6px] rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] transition-all duration-300"
              style={{ width: `${uploadProgresso}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted">{uploadProgresso}%</span>
        </div>
      )}

      {/* Gravando */}
      {estado === 'gravando' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[13px] font-mono font-bold text-white">
              {formatarTempo(duracao)}
            </span>
            {modoGravacao === 'whatsapp' && (
              <span className="text-[9px] text-accent-cyan bg-[rgba(0,206,201,0.1)] px-1.5 py-0.5 rounded font-medium">
                + WhatsApp
              </span>
            )}
          </div>
          <button
            onClick={pausarGravacao}
            className="p-2 rounded-[10px] bg-[rgba(253,203,110,0.1)] text-accent-amber hover:bg-[rgba(253,203,110,0.15)] transition-colors"
            title="Pausar"
          >
            <Pause size={14} />
          </button>
          <button
            onClick={pararGravacao}
            className="flex items-center gap-1 bg-bg-elevated border border-border-default text-text-primary px-3 py-2 rounded-[10px] text-[12px] font-semibold hover:border-border-active transition-all"
          >
            <Square size={12} />
            Parar
          </button>
        </div>
      )}

      {/* Pausado */}
      {estado === 'pausado' && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-amber" />
            <span className="text-[13px] font-mono font-bold text-white">
              {formatarTempo(duracao)} (pausado)
            </span>
          </div>
          <button
            onClick={retomarGravacao}
            className="p-2 rounded-[10px] bg-[rgba(0,184,148,0.1)] text-accent-emerald hover:bg-[rgba(0,184,148,0.15)] transition-colors"
            title="Retomar"
          >
            <Play size={14} />
          </button>
          <button
            onClick={pararGravacao}
            className="flex items-center gap-1 bg-bg-elevated border border-border-default text-text-primary px-3 py-2 rounded-[10px] text-[12px] font-semibold hover:border-border-active transition-all"
          >
            <Square size={12} />
            Parar
          </button>
        </div>
      )}

      {/* Processando */}
      {estado === 'processando' && (
        <div className="flex items-center gap-2 text-[12px] text-accent-violet-light">
          <Loader size={16} className="animate-spin" />
          <span>Transcrevendo e analisando com IA...</span>
        </div>
      )}

      {/* Nova gravacao */}
      {resultado && estado === 'idle' && !uploadAtivo && (
        <button
          onClick={resetar}
          className="flex items-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white px-4 py-2 rounded-[10px] text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] transition-all duration-250"
        >
          <Mic size={14} />
          Nova Gravacao
        </button>
      )}

      {/* Resultado da transcricao */}
      {resultado && (
        <div className="space-y-3 border border-[rgba(108,92,231,0.15)] rounded-[10px] p-3 bg-[rgba(108,92,231,0.06)]">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-accent-violet-light">
            <Bot size={12} />
            Analise IA concluida
          </div>

          {resultado.analise?.resumo && (
            <div>
              <p className="text-[10px] font-semibold text-accent-violet-light mb-1">Resumo</p>
              <p className="text-[11px] text-[#b0b0d0] leading-relaxed">{resultado.analise.resumo}</p>
            </div>
          )}

          {resultado.camposAtualizados?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-accent-violet-light">Campos atualizados:</span>
              {resultado.camposAtualizados.map((c) => (
                <span key={c} className="px-1.5 py-0.5 bg-[rgba(108,92,231,0.15)] text-accent-violet-light rounded text-[10px] font-medium">
                  {c}
                </span>
              ))}
            </div>
          )}

          {resultado.transcricao && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-accent-violet-light hover:underline">
                Ver transcricao completa
              </summary>
              <p className="mt-2 text-[#b0b0d0] leading-relaxed whitespace-pre-wrap bg-bg-elevated rounded-[10px] p-2 max-h-40 overflow-y-auto">
                {resultado.transcricao}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
