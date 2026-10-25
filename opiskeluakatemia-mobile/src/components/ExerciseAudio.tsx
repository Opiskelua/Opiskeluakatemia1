import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Button, styles } from '../../App';
import { config } from '../lib/config';
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function ExerciseAudio({ url, splitTime }: { url: string; splitTime?: number }) {
  const uri = url.startsWith('/') ? `${config.apiUrl}${url}` : url;
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
  return <View style={styles.card}>
    <Text style={styles.heading}>Kuuntele aineisto</Text>
    <Text style={styles.body}>{status.isLoaded ? `${clock(status.currentTime)} / ${clock(status.duration)}` : 'Ladataan ääntä…'}</Text>
    <Button title={status.playing ? 'Keskeytä' : 'Kuuntele'} disabled={!status.isLoaded} onPress={() => status.playing ? player.pause() : void play()} />
    <Button title="Alusta" secondary disabled={!status.isLoaded} onPress={() => void play(0)} />
    {!!splitTime && <Button title="Jatka toisesta osiosta" secondary disabled={!status.isLoaded} onPress={() => void play(splitTime)} />}
    {!status.isLoaded && <Button title="Lataa ääni uudelleen" secondary onPress={() => { setError(''); player.replace(uri); }} />}
    {!!error && <Text style={styles.error}>{error}</Text>}
  </View>;
}
