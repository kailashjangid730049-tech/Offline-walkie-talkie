import {PermissionsAndroid, Platform} from 'react-native';

export async function ensurePermissions(): Promise<boolean> {
  const P = PermissionsAndroid.PERMISSIONS as any;
  const nearby = P.NEARBY_WIFI_DEVICES ?? 'android.permission.NEARBY_WIFI_DEVICES';
  const notif = P.POST_NOTIFICATIONS ?? 'android.permission.POST_NOTIFICATIONS';
  const critical = [P.RECORD_AUDIO, P.ACCESS_FINE_LOCATION];
  const list = [...critical];
  if (Platform.Version >= 33) {
    critical.push(nearby);
    list.push(nearby, notif);
  }
  const res = await PermissionsAndroid.requestMultiple(list);
  return critical.every(p => res[p] === PermissionsAndroid.RESULTS.GRANTED);
}
