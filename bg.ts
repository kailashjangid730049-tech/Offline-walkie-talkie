import BackgroundService from 'react-native-background-actions';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// Foreground service = keeps the process (and our link/auto-reconnect loop) alive.
export async function startKeepAlive() {
  if (BackgroundService.isRunning()) return;
  await BackgroundService.start(
    async () => {
      while (BackgroundService.isRunning()) await sleep(5000);
    },
    {
      taskName: 'Walkie',
      taskTitle: 'Walkie-Talkie active',
      taskDesc: 'Staying connected to your partner',
      taskIcon: {name: 'ic_launcher', type: 'mipmap'},
      color: '#22c55e',
      parameters: {},
    },
  );
}
