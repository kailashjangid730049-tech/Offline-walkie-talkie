import React, {useEffect, useState} from 'react';
import {FlatList, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {link, LinkState, Peer} from './src/link';
import {ensurePermissions} from './src/permissions';
import {startKeepAlive} from './src/bg';

export default function App() {
  const [s, setS] = useState<LinkState>(link.state);

  useEffect(() => {
    const un = link.subscribe(setS);
    (async () => {
      if (await ensurePermissions()) {
        await startKeepAlive().catch(() => {});
        await link.start();
      } else {
        link.setLog('Permissions denied. Enable Mic, Location and Nearby devices in Settings.');
      }
    })();
    return un;
  }, []);

  const connected = s.status === 'connected';
  const color = s.talking ? '#ef4444' : s.receiving ? '#3b82f6' : connected ? '#22c55e' : '#52525b';
  const label = s.talking ? 'TALKING' : s.receiving ? 'RECEIVING' : connected ? 'HOLD TO TALK' : 'NOT CONNECTED';

  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="light-content" />
      <Text style={st.title}>Walkie</Text>
      <Text style={st.status}>
        {s.status.toUpperCase()}{s.peerName ? ` · ${s.peerName}` : ''}
      </Text>
      <Text style={st.log}>{s.log}</Text>

      <View style={st.center}>
        <Pressable
          disabled={!connected || s.receiving}
          onPressIn={() => link.pttDown()}
          onPressOut={() => link.pttUp()}
          style={[st.ptt, {backgroundColor: color}]}>
          <Text style={st.pttText}>{label}</Text>
        </Pressable>
      </View>

      <Text style={st.h2}>Nearby devices {s.savedAddress ? '(paired ✓)' : ''}</Text>
      <FlatList
        data={s.peers}
        keyExtractor={(p: Peer) => p.deviceAddress}
        style={{maxHeight: 170}}
        ListEmptyComponent={<Text style={st.dim}>None found yet…</Text>}
        renderItem={({item}) => (
          <Pressable style={st.peer} onPress={() => link.pair(item)}>
            <Text style={st.peerName}>
              {item.deviceName}{item.deviceAddress === s.savedAddress ? '  ★' : ''}
            </Text>
            <Text style={st.dim}>{['Connected', 'Invited', 'Failed', 'Available', 'Unavailable'][item.status] ?? '?'}</Text>
          </Pressable>
        )}
      />
      {s.savedAddress ? (
        <Pressable onPress={() => link.forget()}><Text style={st.forget}>Forget paired device</Text></Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#09090b', padding: 20},
  title: {color: '#fafafa', fontSize: 28, fontWeight: '700'},
  status: {color: '#a1a1aa', marginTop: 4, fontWeight: '600'},
  log: {color: '#71717a', marginTop: 2},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  ptt: {width: 230, height: 230, borderRadius: 115, alignItems: 'center', justifyContent: 'center'},
  pttText: {color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center'},
  h2: {color: '#e4e4e7', fontWeight: '700', marginBottom: 6},
  dim: {color: '#71717a'},
  peer: {backgroundColor: '#18181b', padding: 12, borderRadius: 10, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between'},
  peerName: {color: '#fafafa'},
  forget: {color: '#f87171', textAlign: 'center', marginTop: 10},
});
