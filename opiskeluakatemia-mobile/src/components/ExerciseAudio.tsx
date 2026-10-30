import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Button, Card, Notice, ProgressBar } from './ui';
import { config } from '../lib/config';
import { resolveMediaUrl } from '../lib/external-links';
import { space, useTheme } from '../theme';
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const spoken = (seconds: number) => `${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} s`;

/** Listening material. Only HTTPS (or API-relative) audio URLs from the server are loaded. */
export function ExerciseAudio({ url, splitTime }: { url: string; splitTime?: number }) {
  const { type } = useTheme();
  const uri = resolveMediaUrl(url, config.apiUrl, __DEV__);
  if (!uri) return <Card>
    <Text accessibilityRole="header" style={type.subheading}>Kuuntele aineisto</Text>
    <Notice tone="error" message="Äänitiedostoa ei voitu avata. Yritä myöhemmin uudelleen tai valitse toinen harjoitus." />
  </Card>;
  return <AudioPlayer uri={uri} splitTime={splitTime} />;
}

function AudioPlayer({ uri, splitTime }: { uri: string; splitTime?: number }) {
  const { type } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState('');
  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true }).catch(() => setError('Ääniasetusten määritys epäonnistui.')); }, []);
  async function play(from?: number) {
    setError('');
    try {
      if (from !== undefined) await player.seekTo(from);
      else if (status.didJustFinish) await player.seekTo(0);
      player.play();
    } catch { setError('Ääntä ei voitu toistaa. Tarkista verkkoyhteys.'); }
  }
  const progress = status.isLoaded && status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;
  return <Card>
    <Text accessibilityRole="header" style={type.subheading}>Kuuntele aineisto</Text>
    <ProgressBar value={progress} label="Äänen toiston edistyminen" />
    <Text style={[type.caption, styles.time]}
      accessibilityLabel={status.isLoaded ? `Kohta ${spoken(status.currentTime)}, kesto ${spoken(status.duration)}` : undefined}>
      {status.isLoaded ? `${clock(status.currentTime)} / ${clock(status.duration)}` : 'Ladataan ääntä…'}
    </Text>
    <Button title={status.playing ? 'Keskeytä' : 'Kuuntele'} disabled={!status.isLoaded} onPress={() => status.playing ? player.pause() : void play()} />
    <View style={styles.row}>
      <Button title="Alusta" accessibilityLabel="Kuuntele alusta" secondary style={styles.item} disabled={!status.isLoaded} onPress={() => void play(0)} />
      {!!splitTime && <Button title="Toinen osio" accessibilityLabel="Jatka toisesta osiosta" secondary style={styles.item} disabled={!status.isLoaded} onPress={() => void play(splitTime)} />}
    </View>
    {!status.isLoaded && <Button title="Lataa ääni uudelleen" variant="ghost" onPress={() => { setError(''); player.replace(uri); }} />}
    {!!error && <Notice tone="error" message={error} />}
  </Card>;
}
const styles = StyleSheet.create({
  time: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  item: { flexGrow: 1, flexBasis: 120 },
});
