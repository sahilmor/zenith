'use client';

import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/env';

export type RealtimeSocket = Socket;

export const createRealtimeSocket = (token: string): RealtimeSocket =>
  io(env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
