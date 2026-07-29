/**
 * A preload that removes the network from the process, so "this server works offline" can be
 * DEMONSTRATED instead of asserted. Every outbound primitive is replaced with a stub that
 * throws, naming itself — so if the server ever reaches for one, the failure says which.
 *
 * Loaded with `node --import` in front of the server binary by offline.test.mjs.
 */

import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';

const boom = (what) => () => {
    throw new Error(`angulux-mcp attempted network access via ${what}`);
};

globalThis.fetch = boom('fetch');
http.request = boom('http.request');
http.get = boom('http.get');
https.request = boom('https.request');
https.get = boom('https.get');
net.connect = boom('net.connect');
net.createConnection = boom('net.createConnection');
tls.connect = boom('tls.connect');
dns.lookup = boom('dns.lookup');
