import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { Bullet, Button, Card, LoadingState, Notice, PageHeader, Pill } from '../components/ui';
import { LegalLinks } from '../components/LegalLinks';
import { useIap } from '../providers/IapProvider';
import { COURSE_IDS, COURSES, type CourseId } from '../lib/courses';
import { accessLine, offerForCourse, STORE_COPY, storeEnabled, trialDisclosure, TRIAL_DAYS, trialLeftLabel, UNSETTLED_PURCHASE_NOTE, type CourseOffer } from '../lib/store';
import { makeStyles, maxScale, space, useTheme } from '../theme';

/** Kurssikauppa: iOS only. Android and web have no store, so the route sends them home. */
export default function StoreRoute() {
  if (!storeEnabled(Platform.OS)) return <Redirect href="/" />;
  return <Store />;
}

function Store() {
  const iap = useIap();
  const { type } = useTheme();
  const { refreshStore, loadPrices, pricesState, clearMessage } = iap;
  const reload = useCallback(async () => {
    if (pricesState === 'error') loadPrices();
    await refreshStore();
  }, [refreshStore, loadPrices, pricesState]);
  // Fresh ownership and trial state every time the store opens (a purchase on the web counts too).
  // Outcome messages belong to this visit: leaving the store clears them.
  useFocusEffect(useCallback(() => {
    void refreshStore();
    return clearMessage;
  }, [refreshStore, clearMessage]));
  const [refreshing, setRefreshing] = useState(false);

  if (!iap.enabled) return <Screen><LoadingState label="Ladataan kurssikauppaa…" /></Screen>;
  const busyAny = !!iap.busy || iap.verifying;
  // Buy and the trial need a fresh, successful access check: a stale or failed one never offers
  // a course the account may already own (a Non-Renewing Subscription can be charged twice).
  const storeReady = iap.storeState === 'ready';
  const restoring = iap.busy?.kind === 'restore';

  return <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload().finally(() => setRefreshing(false)); }}>
    <PageHeader kicker="Kurssikauppa" title="Abikurssit" intro="Kurssi ostetaan App Storen kautta ja liitetään Opiskeluakatemia-tiliisi, joten se toimii sovelluksessa ja verkossa samalla tilillä." />

    {!!iap.message && <Notice tone={iap.message.tone} message={iap.message.text} />}
    {iap.verifying && <LoadingState label="Vahvistetaan ostoa…" />}
    {iap.storeState === 'error' && <Notice tone="error" title="Kurssikauppaa ei voitu ladata" message={iap.storeError} actionTitle="Yritä uudelleen" onAction={() => void reload()} />}
    {iap.pricesState === 'error' && <Notice tone="error" title="Hintoja ei saatu App Storesta" message="Ostaminen ja kokeilu avautuvat, kun hinnat on haettu. Tarkista verkkoyhteys ja yritä uudelleen." actionTitle="Yritä uudelleen" onAction={loadPrices} />}
    {!iap.access && iap.storeState !== 'error' && <LoadingState label="Ladataan kurssikauppaa…" />}

    {iap.access && COURSE_IDS.map(id => <CourseCard key={id} course={id} offer={offerForCourse(id, iap.access, iap.catalog[id], iap.now)}
      price={iap.prices[id]} pricesLoading={iap.pricesState === 'loading' || iap.pricesState === 'idle'} busyAny={busyAny || !storeReady}
      buying={iap.busy?.kind === 'buy' && iap.busy.course === id} startingTrial={iap.busy?.kind === 'trial' && iap.busy.course === id}
      unsettled={iap.unsettled.includes(id)} onBuy={() => iap.buy(id)} onTrial={() => iap.startTrial(id)} />)}

    <Card tone="muted">
      <Text accessibilityRole="header" style={type.subheading}>Palauta ostokset</Text>
      <Text style={type.body}>Jos ostit kurssin App Storesta tällä Opiskeluakatemia-tilillä, voit palauttaa oston tähän tiliin. Ostoa, joka on tehty toisella tilillä, ei voi siirtää.</Text>
      <Button title={restoring ? 'Palautetaan…' : 'Palauta ostokset'} secondary loading={restoring} disabled={busyAny} onPress={iap.restore} />
    </Card>

    <Text style={[type.caption, styles.center]}>Maksu veloitetaan Apple ID:ltäsi. Kurssi on kertaosto: se ei uusiudu eikä sitä veloiteta uudelleen. Käyttöoikeus päättyy kurssin päättymispäivänä. Hyvitykset käsittelee Apple.</Text>
    <View style={styles.legal}><LegalLinks compact /></View>
  </Screen>;
}

function CourseCard({ course, offer, price, pricesLoading, busyAny, buying, startingTrial, unsettled, onBuy, onTrial }: {
  course: CourseId; offer: CourseOffer; price: string | undefined; pricesLoading: boolean; busyAny: boolean; buying: boolean; startingTrial: boolean;
  /** An App Store payment for this course waits for the server: no second Buy, restore instead. */
  unsettled: boolean; onBuy: () => void; onTrial: () => void;
}) {
  const { type } = useTheme();
  const ui = useStyles();
  const { label } = COURSES[course];
  return <Card>
    <View style={ui.titleRow}>
      <Text accessibilityRole="header" style={[type.heading, ui.flex]} maxFontSizeMultiplier={maxScale.title}>{label}</Text>
      {offer.state === 'owned' && <Pill label="Käytössä" tone="success" />}
      {offer.state === 'trial-running' && <Pill label="Kokeilu käynnissä" tone="accent" />}
    </View>
    <View style={ui.bullets}>{STORE_COPY[course].includes.map(line => <Bullet key={line}>{line}</Bullet>)}</View>
    {/* The purchase terms only next to a price that can be bought (never as an owner's own end date). */}
    {offer.showBuy && !!offer.accessUntilLabel && <Text style={type.caption}>{accessLine(offer.accessUntilLabel)}</Text>}

    {offer.state === 'owned' && <Text style={type.bodyStrong}>Kurssi on käytössäsi tällä tilillä.</Text>}
    {offer.state === 'trial-running' && <Text style={type.bodyStrong}>Ilmaista kokeilua jäljellä noin {trialLeftLabel(offer.trialMinutesLeft)}.</Text>}
    {offer.state === 'not-on-sale' && <Text style={type.body}>Kurssi ei ole juuri nyt myynnissä.</Text>}

    {offer.showBuy && <>
      <Text style={type.stat} maxFontSizeMultiplier={maxScale.stat} accessibilityLabel={price ? `Hinta ${price}` : pricesLoading ? 'Hintaa haetaan' : 'Hinta ei saatavilla'}>{price ?? '—'}</Text>
      <Button title={buying ? 'Avataan App Store…' : price ? `Osta ${price}` : pricesLoading ? 'Haetaan hintaa…' : 'Hinta ei saatavilla'}
        accessibilityLabel={price ? `Osta ${label}, ${price}` : undefined} loading={buying} disabled={!price || busyAny || unsettled} onPress={onBuy} />
      {unsettled && <Text style={type.caption}>{UNSETTLED_PURCHASE_NOTE}</Text>}
    </>}
    {offer.showTrial && <>
      <Button title={startingTrial ? 'Aloitetaan…' : `Aloita ilmainen ${TRIAL_DAYS} päivän kokeilu`} secondary loading={startingTrial} disabled={!price || busyAny} onPress={onTrial}
        accessibilityHint="Näyttää kokeilun ehdot ennen aloittamista." />
      {!!price && <Text style={type.caption}>{trialDisclosure(course, price)}</Text>}
    </>}
  </Card>;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  legal: { alignItems: 'center' },
});

const useStyles = makeStyles(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  bullets: { gap: space.xxs },
}));
