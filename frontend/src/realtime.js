import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API } from './api';

let socket;
let disconnectTimer;
let keepaliveTimer;
const subscribers = new Set();
const keepaliveInterval = 4 * 60 * 1000;

const aliases = {
  products: ['product', 'products'],
  carousel: ['carousel', 'carousels', 'slide', 'slides', 'carouselsettings', 'carouselsetting'],
  collectionHero: ['collectionhero', 'collectionheroes', 'hero', 'announcement'],
  orders: ['order', 'orders']
};

function normalise(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function valuesFromUpdate(update) {
  if (typeof update === 'string') return [update];
  if (!update || typeof update !== 'object') return [];

  return [
    update.resource,
    update.resources,
    update.type,
    update.entity,
    update.scope,
    update.target
  ].flatMap(value => Array.isArray(value) ? value : [value]).filter(value => typeof value === 'string');
}

function createSocket() {
  const client = io(API, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000
  });

  client.on('store:update', update => {
    subscribers.forEach(subscriber => subscriber(update));
  });

  return client;
}

function connect() {
  if (disconnectTimer) {
    window.clearTimeout(disconnectTimer);
    disconnectTimer = undefined;
  }

  socket ||= createSocket();
  if (!socket.connected) socket.connect();
  return socket;
}

function startKeepalive() {
  if (keepaliveTimer) return;
  keepaliveTimer = window.setInterval(() => {
    if (subscribers.size && socket?.connected) socket.emit('store:keepalive');
  }, keepaliveInterval);
}

function stopKeepalive() {
  if (!keepaliveTimer) return;
  window.clearInterval(keepaliveTimer);
  keepaliveTimer = undefined;
}

/**
 * Returns true when a `store:update` payload affects one of the supplied
 * store resources. The aliases make client updates tolerant of small naming
 * differences between API events (for example `product` and `products`).
 */
export function storeUpdateAffects(update, ...resources) {
  const eventResources = valuesFromUpdate(update).map(normalise);
  if (!eventResources.length || eventResources.includes('all') || eventResources.includes('store')) return true;

  return resources.some(resource => {
    const key = normalise(resource);
    const accepted = aliases[resource] || [key];
    return accepted.some(value => eventResources.includes(value));
  });
}

/**
 * Subscribe to the singleton storefront Socket.IO connection. The connection
 * remains open while any screen needs real-time store updates, then closes a
 * moment after the final subscriber unmounts.
 */
export function subscribeToStoreUpdates(callback) {
  connect();
  subscribers.add(callback);
  startKeepalive();

  return () => {
    subscribers.delete(callback);
    if (subscribers.size) return;
    stopKeepalive();
    if (disconnectTimer) return;

    disconnectTimer = window.setTimeout(() => {
      disconnectTimer = undefined;
      if (!subscribers.size && socket) socket.disconnect();
    }, 1000);
  };
}

export function useStoreUpdates(onUpdate) {
  const latestCallback = useRef(onUpdate);

  useEffect(() => {
    latestCallback.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => subscribeToStoreUpdates(update => latestCallback.current(update)), []);
}
