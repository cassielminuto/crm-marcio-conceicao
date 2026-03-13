import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(onNovoLead, onSlaAlerta) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket conectado:', socket.id);
    });

    if (onNovoLead) {
      socket.on('novo_lead', onNovoLead);
    }

    if (onSlaAlerta) {
      socket.on('sla_alerta', onSlaAlerta);
    }

    return () => {
      socket.disconnect();
    };
  }, [onNovoLead, onSlaAlerta]);

  return socketRef;
}
