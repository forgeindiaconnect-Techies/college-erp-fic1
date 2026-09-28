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
 * emitERPDataUpdate - Triggers real-time sync across all components, open tabs, and modules.
 * @param {string|string[]} modules - Module or array of modules updated (e.g. 'hostel', ['hostel', 'students', 'fees'])
 * @param {string} action - Action performed (e.g. 'allocated', 'updated', 'paid')
 * @param {any} data - Optional payload data
 */
export const emitERPDataUpdate = (modules, action = 'updated', data = null) => {
  const moduleList = Array.isArray(modules) ? modules : [modules];
  
  moduleList.forEach(mod => {
    const payload = { module: mod, action, data, timestamp: Date.now() };

    // 1. Emit via socket if available
    try {
      if (sharedSocket && sharedSocket.connected) {
        sharedSocket.emit('dataUpdate', payload);
      }
    } catch (e) {
      // socket error silent fallback
    }

    // 2. Dispatch custom in-memory event for same-tab instant reaction
    try {
      window.dispatchEvent(new CustomEvent('erp-data-updated', { detail: payload }));
    } catch (e) {}

    // 3. Trigger localStorage sync trigger for cross-tab multi-window reaction
    try {
      localStorage.setItem('erp_realtime_sync_event', JSON.stringify(payload));
    } catch (e) {}
  });
};

/**
 * useRealtimeSync - subscribes to real-time dataUpdated events from the backend, 
 * in-memory custom events, and cross-tab storage sync.
 *
 * @param {function} onUpdate - callback fired when a relevant update arrives; receives the event payload { module, action, data }
 * @param {string|string[]|null} watchModules - filter to specific module(s), e.g. 'students' or ['students','staff','hostel']. Pass null to watch ALL modules.
 */
export const useRealtimeSync = (param1, param2 = null) => {
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

    const triggerCallbackIfMatched = (payload) => {
      if (!payload || !callbackRef.current) return;
      const currentModules = watchModulesRef.current;

      // If no filter specified, fire for all modules
      if (!currentModules) {
        callbackRef.current(payload);
        return;
      }

      const modules = Array.isArray(currentModules) ? currentModules : [currentModules];
      if (modules.includes(payload.module) || modules.includes('all')) {
        callbackRef.current(payload);
      }
    };

    const handleSocketEvent = (payload) => {
      triggerCallbackIfMatched(payload);
    };

    const handleCustomEvent = (e) => {
      if (e.detail) {
        triggerCallbackIfMatched(e.detail);
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'erp_realtime_sync_event' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          triggerCallbackIfMatched(payload);
        } catch (err) {}
      }
    };

    socket.on('dataUpdated', handleSocketEvent);
    window.addEventListener('erp-data-updated', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      socket.off('dataUpdated', handleSocketEvent);
      window.removeEventListener('erp-data-updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
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

