import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(onNovoLead, onSlaAlerta, onDuplicata) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket conectado:', socket.id);
    });

    if (onNovoLead) socket.on('novo_lead', onNovoLead);
    if (onSlaAlerta) socket.on('sla_alerta', onSlaAlerta);
    if (onDuplicata) socket.on('duplicata_detectada', onDuplicata);

    return () => {
      socket.disconnect();
    };
  }, [onNovoLead, onSlaAlerta, onDuplicata]);

  return socketRef;
}
