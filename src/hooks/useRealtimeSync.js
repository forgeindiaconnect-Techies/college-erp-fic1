import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let sharedSocket = null;
let subscriberCount = 0;

const getSocket = () => {
  if (!sharedSocket || sharedSocket.disconnected) {
    const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
    sharedSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return sharedSocket;
};

/**
 * useRealtimeSync - subscribes to real-time dataUpdated events from the backend.
 *
 * @param {function} onUpdate - callback fired when a relevant update arrives; receives the event payload { module, action, data }
 * @param {string|string[]|null} watchModules - filter to specific module(s), e.g. 'students' or ['students','staff']. Pass null to watch ALL modules.
 */
const useRealtimeSync = (onUpdate, watchModules = null) => {
  const callbackRef = useRef(onUpdate);

  // Always keep the ref up-to-date so we never capture stale closures
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const socket = getSocket();
    subscriberCount++;

    const handler = (payload) => {
      // If no filter specified, fire for all modules
      if (!watchModules) {
        callbackRef.current(payload);
        return;
      }

      const modules = Array.isArray(watchModules) ? watchModules : [watchModules];
      if (modules.includes(payload.module)) {
        callbackRef.current(payload);
      }
    };

    socket.on('dataUpdated', handler);

    return () => {
      socket.off('dataUpdated', handler);
      subscriberCount--;
      // Only disconnect when no components are listening
      if (subscriberCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        subscriberCount = 0;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // watchModules intentionally excluded — changes to filter should not re-subscribe
};

export default useRealtimeSync;
