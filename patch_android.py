"""Run from the RN project root. Idempotent."""
import re, os, glob

# 1) AndroidManifest: permissions + foreground service types
mp = 'android/app/src/main/AndroidManifest.xml'
m = open(mp).read()
if 'NEARBY_WIFI_DEVICES' not in m:
    perms = ''.join(f'\n    <uses-permission android:name="android.permission.{p}" />' for p in [
        'INTERNET','ACCESS_WIFI_STATE','CHANGE_WIFI_STATE','ACCESS_NETWORK_STATE',
        'ACCESS_FINE_LOCATION','NEARBY_WIFI_DEVICES','RECORD_AUDIO','MODIFY_AUDIO_SETTINGS',
        'FOREGROUND_SERVICE','FOREGROUND_SERVICE_MICROPHONE','FOREGROUND_SERVICE_CONNECTED_DEVICE',
        'POST_NOTIFICATIONS','WAKE_LOCK'])
    if 'xmlns:tools' not in m:
        m = m.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ', 1)
    i = m.index('>', m.index('<manifest')) + 1
    m = m[:i] + perms + m[i:]
    svc = ('\n    <service android:name="com.asterinet.react.bgactions.RNBackgroundActionsTask"'
           ' android:foregroundServiceType="connectedDevice|microphone"'
           ' tools:replace="android:foregroundServiceType" android:exported="false" />\n  ')
    m = m.replace('</application>', svc + '</application>', 1)
    open(mp, 'w').write(m)

# 2) Register PcmPlayerPackage in MainApplication.kt
for p in glob.glob('android/app/src/main/java/**/MainApplication.kt', recursive=True):
    s = open(p).read()
    if 'PcmPlayerPackage' not in s:
        s = s.replace('PackageList(this).packages.apply {',
                      'PackageList(this).packages.apply {\n              add(PcmPlayerPackage())', 1)
        open(p, 'w').write(s)

# 3) Old libs vs AGP 8: add namespace, drop dead repos / deprecated deps
for lib in ['react-native-wifi-p2p','react-native-live-audio-stream','react-native-tcp-socket',
            'react-native-background-actions']:
    d = f'node_modules/{lib}/android'
    gp, xp = f'{d}/build.gradle', f'{d}/src/main/AndroidManifest.xml'
    if not os.path.exists(gp): continue
    g = open(gp).read()
    if 'namespace' not in g and os.path.exists(xp):
        x = open(xp).read()
        pk = re.search(r'package="([^"]+)"', x)
        if pk:
            g = re.sub(r'(android\s*\{)', r'\1\n    namespace "%s"' % pk.group(1), g, count=1)
            open(xp, 'w').write(re.sub(r'\s*package="[^"]+"', '', x, count=1))
    g = g.replace('com.facebook.react:react-native:+', 'com.facebook.react:react-android')
    g = re.sub(r'^\s*jcenter\(\)\s*$', '', g, flags=re.M)
    open(gp, 'w').write(g)
print('patched OK')
