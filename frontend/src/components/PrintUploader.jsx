import { useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { Camera, ImagePlus, X, Loader, Bot } from 'lucide-react';

export default function PrintUploader({ leadId, onPrintAnalisado }) {
  const [arquivos, setArquivos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const adicionarArquivos = useCallback((files) => {
    const novos = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (novos.length === 0) return;

    const total = arquivos.length + novos.length;
    if (total > 10) {
      setErro('Maximo de 10 imagens por vez');
      return;
    }

    setErro('');
    setArquivos(prev => [...prev, ...novos]);
    setPreviews(prev => [...prev, ...novos.map(f => URL.createObjectURL(f))]);
  }, [arquivos.length]);

  const removerArquivo = (index) => {
    URL.revokeObjectURL(previews[index]);
    setArquivos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    adicionarArquivos(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (arquivos.length === 0) return;

    setProcessando(true);
    setProgresso(0);
    setErro('');

    const formData = new FormData();
    arquivos.forEach(file => formData.append('prints', file));
    formData.append('lead_id', String(leadId));

    try {
      const { data } = await api.post('/prints/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (e) => {
          setProgresso(Math.round((e.loaded * 100) / (e.total || 1)));
        },
      });

      setResultado(data);

      // Limpar previews
      previews.forEach(url => URL.revokeObjectURL(url));
      setArquivos([]);
      setPreviews([]);

      if (onPrintAnalisado) onPrintAnalisado(data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao analisar prints');
    } finally {
      setProcessando(false);
      setProgresso(0);
    }
  };

  const resetar = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setArquivos([]);
    setPreviews([]);
    setErro('');
    setResultado(null);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.5px] flex items-center gap-1.5">
        <Camera size={12} />
        Prints do WhatsApp
      </h4>

      {erro && (
        <div className="bg-[rgba(225,112,85,0.08)] border border-[rgba(225,112,85,0.15)] text-accent-danger text-[11px] rounded-[10px] px-3 py-2">
          {erro}
        </div>
      )}

      {/* Drop zone */}
      {!processando && !resultado && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[10px] p-5 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-accent-violet bg-[rgba(108,92,231,0.06)]'
                : 'border-border-default hover:border-border-active hover:bg-white/[0.01]'
            }`}
          >
            <ImagePlus size={24} className="text-text-faint mx-auto mb-2" />
            <p className="text-[11px] text-text-secondary">Arraste prints aqui ou clique para selecionar</p>
            <p className="text-[9px] text-text-faint mt-1">Aceita PNG, JPG, WEBP — ate 10 imagens</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
        </>
      )}

      {/* Previews */}
      {previews.length > 0 && !processando && !resultado && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {previews.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`Print ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-border-default"
                />
                <button
                  onClick={() => removerArquivo(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] text-white rounded-[10px] px-4 py-2.5 text-[12px] font-semibold hover:shadow-[0_4px_16px_rgba(108,92,231,0.25)] hover:-translate-y-[1px] transition-all duration-250"
          >
            <Bot size={14} />
            Analisar com IA ({arquivos.length} {arquivos.length === 1 ? 'imagem' : 'imagens'})
          </button>
        </div>
      )}

      {/* Processando */}
      {processando && (
        <div className="bg-bg-elevated border border-border-default rounded-[10px] p-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-accent-violet-light">
            <Loader size={14} className="animate-spin" />
            <span>{progresso < 100 ? 'Enviando prints...' : 'Analisando prints com IA...'}</span>
          </div>
          <div className="w-full bg-bg-primary rounded-full h-[6px]">
            <div
              className="h-[6px] rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#00cec9] transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <span className="text-[10px] text-text-muted">{progresso}%</span>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-3">
          <div className="border border-[rgba(108,92,231,0.15)] rounded-[10px] p-3 bg-[rgba(108,92,231,0.06)] space-y-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-accent-violet-light">
              <Bot size={12} />
              Analise de print concluida
            </div>

            {resultado.analise?.resumo && (
              <div>
                <p className="text-[10px] font-semibold text-accent-violet-light mb-1">Resumo</p>
                <p className="text-[11px] text-[#b0b0d0] leading-relaxed">{resultado.analise.resumo}</p>
              </div>
            )}

            {resultado.analise?.campos && (
              <div className="flex flex-wrap gap-1">
                {resultado.analise.campos.nivel_interesse && (
                  <span className="px-1.5 py-0.5 bg-[rgba(108,92,231,0.15)] text-accent-violet-light rounded text-[10px] font-medium">
                    Interesse: {resultado.analise.campos.nivel_interesse}
                  </span>
                )}
                {resultado.analise.campos.sentimento_geral && (
                  <span className="px-1.5 py-0.5 bg-[rgba(108,92,231,0.15)] text-accent-violet-light rounded text-[10px] font-medium">
                    Sentimento: {resultado.analise.campos.sentimento_geral}
                  </span>
                )}
              </div>
            )}

            {resultado.camposAtualizados?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-accent-violet-light">Campos atualizados:</span>
                {resultado.camposAtualizados.map((c) => (
                  <span key={c} className="px-1.5 py-0.5 bg-[rgba(0,184,148,0.12)] text-accent-emerald rounded text-[10px] font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}

            {resultado.analise?.conversa_extraida && (
              <details className="text-[11px]">
                <summary className="cursor-pointer text-accent-violet-light hover:underline">
                  Ver conversa extraida
                </summary>
                <p className="mt-2 text-[#b0b0d0] leading-relaxed whitespace-pre-wrap bg-bg-elevated rounded-[10px] p-2 max-h-48 overflow-y-auto">
                  {resultado.analise.conversa_extraida}
                </p>
              </details>
            )}
          </div>

          <button
            onClick={resetar}
            className="flex items-center gap-2 bg-bg-elevated border border-border-default text-text-secondary rounded-[10px] px-4 py-2 text-[12px] font-semibold hover:border-border-active hover:text-[#b0b0d0] transition-all duration-250"
          >
            <Camera size={14} />
            Enviar mais prints
          </button>
        </div>
      )}
    </div>
  );
}
