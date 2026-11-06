import {Buffer} from 'buffer';
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as P2P from 'react-native-wifi-p2p';
import {MSG, encode, Decoder} from './protocol';
import * as audio from './audio';

const PORT = 8988;
const SAVED_KEY = 'walkie.peer';

export type Peer = {deviceName: string; deviceAddress: string; status: number};
export type Status = 'idle' | 'searching' | 'connecting' | 'connected';
export interface LinkState {
  status: Status;
  peerName: string;
  talking: boolean;
  receiving: boolean;
  log: string;
  peers: Peer[];
  savedAddress: string | null;
}

class WalkieLink {
  state: LinkState = {
    status: 'idle', peerName: '', talking: false, receiving: false,
    log: 'Starting…', peers: [], savedAddress: null,
  };
  private listeners = new Set<(s: LinkState) => void>();
  private started = false;
  private sock: any = null;
  private server: any = null;
  private decoder = new Decoder();
  private role: 'host' | 'client' | null = null;
  private lastRx = 0;
  private hb: any = null;
  private tickTimer: any = null;
  private lastDiscovery = 0;
  private connectingSince = 0;
  private resetting = false;

  subscribe(fn: (s: LinkState) => void) {
    this.listeners.add(fn);
    fn(this.state);
    return () => { this.listeners.delete(fn); };
  }
  private set(p: Partial<LinkState>) {
    this.state = {...this.state, ...p};
    this.listeners.forEach(f => f(this.state));
  }
  setLog(m: string) { this.set({log: m}); }

  async start() {
    if (this.started) return;
    this.started = true;
    await P2P.initialize();
    P2P.subscribeOnPeersUpdates(({devices}: any) => this.set({peers: devices ?? []}));
    P2P.subscribeOnConnectionInfoUpdates((info: any) => this.onConn(info));
    const saved = await AsyncStorage.getItem(SAVED_KEY);
    this.set({savedAddress: saved, status: 'searching', log: saved ? 'Looking for partner…' : 'Tap a nearby device to pair'});
    this.tickTimer = setInterval(() => this.tick().catch(() => {}), 4000);
    this.tick().catch(() => {});
    try { this.onConn(await P2P.getConnectionInfo()); } catch {}
  }

  // ---------- auto-reconnect loop ----------
  private async tick() {
    const s = this.state.status;
    if (s === 'connected') return;
    if (s === 'connecting') {
      if (Date.now() - this.connectingSince < 25000) return;
      await this.reset('Connect timed out');
    }
    if (Date.now() - this.lastDiscovery > 30000) {
      this.lastDiscovery = Date.now();
      try { await P2P.startDiscoveringPeers(); } catch {}
    }
    const target = this.state.savedAddress;
    if (!target) return;
    const peer = this.state.peers.find(p => p.deviceAddress === target);
    if (!peer) { this.set({log: 'Looking for partner…'}); return; }
    if (peer.status !== 3 && peer.status !== 2) return; // 3=available 2=failed
    if (Math.random() < 0.5) return; // random backoff so both phones don't collide
    await this.connectTo(peer);
  }

  private async connectTo(peer: Peer) {
    this.connectingSince = Date.now();
    this.set({status: 'connecting', peerName: peer.deviceName, log: `Connecting to ${peer.deviceName}…`});
    try { await P2P.connect(peer.deviceAddress); }
    catch { this.set({status: 'searching', log: 'Connect failed, retrying…'}); }
  }

  async pair(peer: Peer) {
    await AsyncStorage.setItem(SAVED_KEY, peer.deviceAddress);
    this.set({savedAddress: peer.deviceAddress});
    await this.connectTo(peer);
  }

  async forget() {
    await AsyncStorage.removeItem(SAVED_KEY);
    this.set({savedAddress: null, log: 'Tap a nearby device to pair'});
    await this.reset('Unpaired');
  }

  // ---------- Wi-Fi Direct group -> TCP channel ----------
  private onConn(info: any) {
    if (info?.groupFormed) {
      if (this.role) return;
      this.role = info.isGroupOwner ? 'host' : 'client';
      this.connectingSince = Date.now();
      this.set({status: 'connecting', log: 'Group formed, opening audio channel…'});
      if (this.role === 'host') this.startServer();
      else this.startClient(info.groupOwnerAddress?.hostAddress ?? '192.168.49.1');
      this.rememberPeer();
    } else if (this.role || this.state.status === 'connected') {
      this.reset('Link lost');
    }
  }

  private async rememberPeer() {
    try {
      const g = await P2P.getGroupInfo();
      const other = g?.isGroupOwner ? g?.clients?.[0] : g?.owner;
      if (other?.deviceAddress) {
        this.set({peerName: other.deviceName ?? ''});
        if (!this.state.savedAddress) {
          await AsyncStorage.setItem(SAVED_KEY, other.deviceAddress);
          this.set({savedAddress: other.deviceAddress});
        }
      }
    } catch {}
  }

  private startServer() {
    this.closeNet();
    this.server = TcpSocket.createServer((s: any) => this.attach(s));
    this.server.on('error', () => this.reset('Server error'));
    this.server.listen({port: PORT, host: '0.0.0.0'});
  }

  private startClient(host: string, attempt = 0) {
    const s = TcpSocket.createConnection({host, port: PORT}, () => this.attach(s));
    s.on('error', () => {
      if (this.role !== 'client' || this.state.status === 'connected') return;
      if (attempt < 8) setTimeout(() => this.role === 'client' && this.startClient(host, attempt + 1), 1000);
      else this.reset('Could not reach partner');
    });
  }

  private attach(s: any) {
    clearInterval(this.hb);
    const old = this.sock;
    this.sock = s;
    try { old?.destroy(); } catch {}
    this.decoder = new Decoder();
    this.lastRx = Date.now();
    s.on('data', (d: any) => {
      this.lastRx = Date.now();
      this.decoder.push(Buffer.from(d), (t, p) => this.onFrame(t, p));
    });
    const lost = () => { if (this.sock === s) this.reset('Connection dropped'); };
    s.on('close', lost);
    s.on('error', lost);
    try { s.setNoDelay(true); } catch {}
    this.set({status: 'connected', log: 'Connected'});
    this.hb = setInterval(() => {
      this.send(encode(MSG.PING));
      if (Date.now() - this.lastRx > 9000) this.reset('Heartbeat timeout');
    }, 3000);
  }

  private onFrame(t: number, p: Buffer) {
    switch (t) {
      case MSG.AUDIO:
        if (this.state.receiving) audio.play(p.toString('base64'));
        break;
      case MSG.PTT_START:
        if (this.state.talking) this.pttUp(); // half-duplex: partner wins
        audio.startPlayer();
        this.set({receiving: true});
        break;
      case MSG.PTT_END:
        audio.stopPlayer();
        this.set({receiving: false});
        break;
    }
  }

  private send(b: Buffer) { try { this.sock?.write(b); } catch {} }

  private closeNet() {
    clearInterval(this.hb);
    try { this.sock?.destroy(); } catch {}
    try { this.server?.close(); } catch {}
    this.sock = null;
    this.server = null;
  }

  private async reset(reason: string) {
    if (this.resetting) return;
    this.resetting = true;
    try {
      if (this.state.talking) audio.stopMic();
      audio.stopPlayer();
      this.closeNet();
      this.role = null;
      this.set({status: 'searching', talking: false, receiving: false, log: `${reason} — reconnecting…`});
      try { await P2P.removeGroup(); } catch {}
      this.lastDiscovery = 0;
    } finally { this.resetting = false; }
  }

  // ---------- push to talk ----------
  pttDown() {
    if (this.state.status !== 'connected' || this.state.receiving || this.state.talking) return;
    this.set({talking: true});
    this.send(encode(MSG.PTT_START));
    audio.startMic(chunk => this.send(encode(MSG.AUDIO, chunk)));
  }
  pttUp() {
    if (!this.state.talking) return;
    audio.stopMic();
    this.send(encode(MSG.PTT_END));
    this.set({talking: false});
  }
}

export const link = new WalkieLink();
