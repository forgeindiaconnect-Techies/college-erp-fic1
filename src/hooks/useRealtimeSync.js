import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getBackendURL } from '../utils/backendUrl';

let sharedSocket = null;
let subscriberCount = 0;

const getSocket = () => {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(getBackendURL(), {
      transports: ['polling', 'websocket'],
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
const useRealtimeSync = (param1, param2 = null) => {
  let onUpdate = param1;
  let watchModules = param2;

  // Defensive support for swapped arguments e.g. useRealtimeSync('students', callback)
  if (typeof param1 === 'string' && typeof param2 === 'function') {
    onUpdate = param2;
    watchModules = param1;
  } else if (Array.isArray(param1) && typeof param2 === 'function') {
    onUpdate = param2;
    watchModules = param1;
  }

  const callbackRef = useRef(onUpdate);
  const watchModulesRef = useRef(watchModules);

  // Always keep refs up-to-date so we never capture stale closures
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    watchModulesRef.current = watchModules;
  }, [watchModules]);

  useEffect(() => {
    const socket = getSocket();
    subscriberCount++;

    const handler = (payload) => {
      const currentModules = watchModulesRef.current;
      // If no filter specified, fire for all modules
      if (!currentModules) {
        callbackRef.current(payload);
        return;
      }

      const modules = Array.isArray(currentModules) ? currentModules : [currentModules];
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
  }, []);
};

export default useRealtimeSync;
