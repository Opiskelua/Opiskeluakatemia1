# Maskotti oppimis- ja tapasovelluksissa: tapaustutkimus ja suositukset Opiskeluakatemialle

*Laadittu 30.10.2026. Lähteet on listattu kunkin osion lopussa ja kootusti dokumentin lopussa. Luvut on otettu vain lähteistä, jotka on merkitty; jos lähde on kolmannen osapuolen tai myyjän materiaalia, se sanotaan erikseen.*

---

## 0. Tiivistelmä

- **Maskotti toimii parhaiten tunnepalautteen kantajana, ei tiedon kantajana.** Duolingo, Brilliant ja Khan Academy Kids käyttävät hahmoa juhlimaan, rohkaisemaan ja tekemään epäonnistumisesta vähemmän pelottavaa. Varsinainen tieto (oikein/väärin, pisteet, putki) näytetään aina myös tekstinä ja värinä.
- **Syyllistävä huumori (Duo) toimii Duolingolle, mutta se on brändin laajuinen ja tarkoituksellinen valinta, jolla on hintansa.** Pienelle, korkean panoksen kokeeseen valmistavalle kurssille se on riski: abiturientti on jo valmiiksi stressaantunut. Finch on tietoisesti valinnut päinvastaisen linjan (lemmikki ei koskaan kuole, koska se "voi aiheuttaa liikaa ahdistusta").
- **Harvinaisuus tekee juhlasta arvokkaan.** Duolingon oma data: streak-animaatio (erikoisversio virstanpylväspäivinä) nosti uusien käyttäjien 7 päivän pysyvyyttä +1,7 %. Juhla-animaatio on palkinto, ei taustakohinaa.
- **Clippyn opetus: hahmo ei saa keskeyttää eikä teeskennellä olevansa fiksumpi kuin on.** Käyttäjän pitää tuntea olevansa hallinnassa.
- **Meidän erityispiirre on 3D-malli.** Rive/Lottie-tyyppinen reaaliaikainen 2D-rigi (Duolingo, Brilliant) ei siirry suoraan 3D-mallista. Suositus: renderöidään mallista **stillit (WebP/PNG) ja lyhyet loopit (animoitu WebP / WebM+HEVC-alfa)**, ja GLB:tä käytetään vain yhdessä interaktiivisessa hero-paikassa verkkosivulla.
- **Animaatiomme sopivat hyvin:** idle (läsnäolo), salute/tervehdys (ylioppilaslakki = tavoite), venyttely (tauko, paluu, "herätään"), hip-hop-tanssi (vain isot virstanpylväät). **Vatsaan lyönti kannattaa pudottaa** — fyysinen kipu/slapstick ei sovi kohderyhmän sävyyn eikä virheen yhteyteen.

---

## 1. Lähtökohta: meidän maskotti ja kohderyhmä

| | |
|---|---|
| Tuote | Englannin abikurssi (YO-koe), verkkosivu (Next.js) + mobiilisovellus (Expo/React Native) |
| Käyttäjä | 17–19-vuotias lukiolainen, valmistautuu korkean panoksen kokeeseen, jonka tulos vaikuttaa jatko-opintoihin (todistusvalinta) |
| Keskeiset näkymät | Polku (oppituntien kartta), Päivän tehtävät, Kertaus, kielioppitesti, AI-esseepalaute |
| Maskotti | Chibi-abiturienttipoika: ylioppilaslakki, valkoinen huppari, mustat housut, reppu, valkoiset tennarit. 3D-malli. |
| Animaatiot | idle, salute, käsien venyttely, hip-hop-tanssi, (vatsaan lyönti – todennäköisesti pudotetaan) |

**Tärkeä havainto:** maskotti on *käyttäjän näköinen vertainen*, ei eläin tai opettaja. Se on vahvuus: hahmo voi edustaa "sinä keväällä, lakki päässä". Duolingon hahmotiimi päätyi samaan suuntaan omassa hahmogalleriassaan: hahmot ovat "moderneja ihmisiä, joilla on omalaatuiset persoonallisuudet", koska viikingit tai avaruusolennot olisivat olleet "liian kaukana kieltenopiskelun todellisuudesta" ([Duolingo Blog: Building Character](https://blog.duolingo.com/building-character/)).

Nykyisestä koodista: verkkosivulla on jo `three` ja `framer-motion`, ja `prefers-reduced-motion` huomioidaan mm. polun tyyleissä (`polku.module.css`, `ResultScreen.tsx`). Mobiilissa on valmiina `useReduceMotion`-hook (`opiskeluakatemia-mobile/src/hooks/useReduceMotion.ts`), joka lukee järjestelmän Reduce motion -asetuksen. Maskotin toteutus voi nojata näihin suoraan.

---

## 2. Tapaustutkimukset

### 2.1 Duolingo – Duo ja hahmogalleria (pääesimerkki)

**Mikä Duo on brändille.** Duolingon oma blogi: "Duo is the most important visual aspect of our brand." Vuoden 2019 uudistuksessa Duo piirrettiin uudelleen yksinkertaisemmaksi ja geometrisemmaksi *nimenomaan, jotta sitä on helpompi animoida*, ja koko käyttöliittymä yhtenäistettiin samaan sarjakuvamaiseen tyyliin, koska aiemmin käytössä oli ollut kaksi yhteensopimatonta tyyliä ([Design Week](https://www.designweek.co.uk/issues/2-6-january-2019/duolingo-owl-receives-makeover-as-app-becomes-more-gamified); [Creative Bloq](https://www.creativebloq.com/news/duolingos-redesigned-mascot-is-a-hoot)). Suunnittelija kuvaa muutosta niin, että Duota alettiin kohdella hahmona eikä logona ([Advertising Week](https://advertisingweek.com/the-surprising-reason-why-the-duolingo-owl-is-green/)).

**Hahmogalleria tehtävissä.** Duon lisäksi Duolingossa on hahmoja (Lily, Oscar, Eddy, Junior, Zari, Bea…), jotka "puhuvat" lauseen, jota käyttäjä kääntää. Jokaisella on oma animaationsa oikean vastauksen jälkeen, ja "mid-lesson"-väliruudut palkitsevat useasta peräkkäisestä oikeasta vastauksesta (esim. Duo ja Lily kävelevät ruudun poikki). Hahmogallerian suunnitteluun meni noin puolitoista vuotta ([Building Character](https://blog.duolingo.com/building-character/)).

**Tekninen toteutus.** Duolingo animoi kymmenen hahmoa Rivellä: reaaliaikainen tilakone (State Machine) ohjaa body-animaatioita ja suun muotoja rinnakkain, yli 20 suun muotoa (visemiä), idle-käytöksenä nyökkäilyä, räpyttelyä ja kulmakarvojen liikettä, ja lopputilassa hahmo reagoi siihen, oliko vastaus oikein vai väärin. Videon sijaan sovellukselle lähetetään ajoitusdataa, mikä "keeps the data transfer to an absolute minimum" ([Duolingo Blog: World Character Visemes](https://blog.duolingo.com/world-character-visemes)).

**Streak ja Duo.** Duolingon oma streak-kirjoitus (2022): streak-laajennusanimaatiossa Duo pyörähtää ilmassa ja syttyy oranssiksi liekiksi; uusi animaatio, jossa on erikoisversio virstanpylväspäiville, nosti todennäköisyyttä, että uusi käyttäjä on yhä mukana 7 päivän kuluttua, **+1,7 %**. Streak Freezen salliminen kahdesti nosti päivittäisten aktiivisten oppijoiden suhteellista määrää **+0,38 %** "ilman, että se lisäsi vapaapäiviä"; 7 päivän putken saavuttaneet ovat **3,6 kertaa todennäköisemmin** kurssin loppuun suorittavia. Pidemmillä putkilla Duolingo nojaa avoimesti tappion välttämiseen (loss aversion) ([Duolingo Blog: How the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).

**Notifikaatiot.** Duolingo optimoi muistutustensa sisällön monikäsirosvoalgoritmilla (Recovering Difference Softmax). Tutkimuksessa tämä nosti päivittäisiä aktiivisia käyttäjiä **0,5 %** ja uusien käyttäjien pysyvyyttä **2 %** vahvaan vertailukohtaan nähden. Algoritmi huomioi erityisesti, että viestipohjan *uutuusvaikutus kuluu* (novelty effect) kun samaa toistetaan ([Yancey & Settles, KDD 2020](https://research.duolingo.com/papers/yancey.kdd20.pdf)). Opetus meille: sama hahmon repliikki kuluu nopeasti — vaihtelu on rakenteellinen vaatimus, ei koriste. Duolingo myös lopettaa muistutukset itse, kun niihin ei reagoida ("These reminders don't seem to be working. We'll stop sending them for now.", kuvakaappaus: [Debugger/Medium](https://debugger.medium.com/duolingo-needs-to-chill-8f1832745ca0); [Taplytics](https://taplytics.com/blog/duolingo-sends-push-notifications-to-let-users-know-they-know-theyre-not-engaging-with-their-reminders)).

**Syyllistävä huumori ja sen riskit.** Duolingo on rakentanut brändin "passiivis-aggressiivisen" pöllön varaan: surullinen Duo notifikaatioissa, sovelluskuvake joka "sulaa" (lokakuu 2023), "vanhenee" (huhtikuu 2024) tai on "sairas" (elokuu 2024, Duo oli "quite literally sick of reminding everyone to do their lessons") ([The Mary Sue](https://www.themarysue.com/what-happened-to-the-duolingo-icon-explained/); [gHacks](https://www.ghacks.net/?p=203379)). Helmikuussa 2025 Duolingo "tappoi" Duon markkinointikampanjassa; X:n mukaan yksi postaus nähtiin 142 miljoonaa kertaa, ja Duo "herätettiin henkiin" käyttäjien keräämillä XP-pisteillä ([NPR](https://npr.org/2025/02/26/nx-s1-5309785/duolingo-owl-mascot-lives); [Entrepreneur](https://www.entrepreneur.com/business-news/duolingo-says-its-mascot-duo-the-owl-is-dead/486944)).
Riskit, joita lähteet nostavat:
- Kritiikkiä siitä, että syyllistävät viestit ahdistavat osaa käyttäjistä, erityisesti lapsia ([El País / University XP](https://www.universityxp.com/news/2025/7/25/we-havent-seen-you-in-a-while-duolingos-passive-aggressive-strategy-for-keeping-users-hooked)).
- UX-kirjoittajat kuvaavat sarjaa "emotionaaliseksi kiristykseksi" ([UX Collective](https://uxdesign.cc/20-days-of-emotional-blackmail-from-duolingo-4f566523e3c5)) ja "Your streak is in danger!" -tyyppisiä viestejä ahdistusta tuottaviksi laukaisimiksi ([Web Designer Depot](https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/)).
- Vanhempien opas kuvaa streakin muuttuvan stressin lähteeksi ([Screenwise](https://screenwiseapp.com/guides/managing-duolingo-streaks-when-gamification-becomes-stressful)).
- Tärkeä huomio: syyllistäminen toimii Duolingolla, koska se on *meemi*, jonka koko internet tuntee ja jota käyttäjät itse levittävät. Huumori on itseironista ja ylilyötyä. Pieneltä brändiltä sama viesti luetaan kirjaimellisesti — eikä YO-kokeeseen lukevalle abille "sinä pettymys" ole vitsi.

**Sävy nuorille aikuisille: Lily.** Duolingo kertoo Lilyn olevan suosituin hahmo Duon jälkeen; hän on sarkastinen, kyllästynyt teini, ja tiimi valitsi hänet AI-videopuheluihin, koska oppijat rakastavat hänen sarkasmiaan ([Fortune](https://fortune.com/2024/11/07/duolingo-ai-chatbot-lily-earnings-call); [Duolingo IR, Duocon 2024](https://investors.duolingo.com/news-releases/news-release-details/duolingo-introduces-ai-powered-innovations-duocon-2024)). Opetus: vanhemmat teinit samaistuvat hahmoon, joka *ei lässytä* — kuiva huumori ja tasavertaisuus toimivat paremmin kuin innostunut cheerleader. Kritiikkiäkin tuli: osa testaajista koki Lilyn "hieman loukkaavana" ([TechBrew](https://www.techbrew.com/stories/2024/09/25/duolingo-debuts-ai-video-chats)).

**Missä Duo näkyy (yhteenveto):** onboarding (Duo esittelee ja kysyy tavoitteen), polku (Duo ja hahmot polun varrella, virstanpylväsruudut), tehtävät (hahmot puhuvat, reagoivat oikein/väärin), streak (liekki + Duo-animaatio), notifikaatiot (Duon kasvot ja ääni), kuvake, markkinointi/some.

### 2.2 Brilliant – Koji, tekoälytutor

Brilliant päätti syksyllä 2023 brändiuudistuksen yhteydessä, että se tarvitsee maskotin Gen Z- ja milleniaaliyleisölleen ([Wikipedia](https://wiki.riteme.site/wiki/Brilliant_(website))). Koji on nykyään kurssien sisällä toimiva tutor, joka auttaa, kun käyttäjä jumittuu ([Brilliant Help](https://brilliant.org/help/features/how-does-koji-work/)).

Brilliantin tiimin Rive-blogikirjoitus (4.6.2026) on meille erityisen relevantti, koska meilläkin on AI-esseepalaute:
- Pelkkä tekstitutor oli testeissä "kuiva ja mitäänsanomaton": "It might have been helpful, but it damn sure wasn't fun."
- Animoitu hahmo sai testaajat kysymään perustason kysymyksiä, selittämään päättelyään ääneen ja juhlimaan onnistumisia. Tavoite oli **vähentää epäonnistumisen pelkoa**: "We want our learners in the mindset of messing around."
- Kojilla on tilat koko tutorointisessiolle (heiluttaminen, nyökkääminen), ja se reagoi eri tavalla, kun ongelma ratkeaa helposti vs. kun käyttäjä kamppailee.
- Kojilla ei ole suuta, joten puhumista ilmaistaan äänenvoimakkuuteen sidotulla liikkeellä — muuten "ei ollut selvää, että Koji puhui".
- Kirjoitus ei raportoi määrällisiä tuloksia, vain laadullista palautetta.
([Rive Blog: Brilliant builds its tutor character](https://rive.app/blog/brilliant-builds-its-math-and-coding-tutor-character-with-rive))

**Opetus:** AI-palautteen yhteydessä hahmo voi madaltaa kynnystä — mutta sen tehtävä on *kehystää* palaute ("katsotaan yhdessä"), ei kertoa itse palautetta.

### 2.3 Finch – lempeä lemmikki, ei rangaistusta

Finch on itsehoitosovellus, jossa käyttäjä kasvattaa lintua tekemällä hyvinvointitehtäviä ja check-inejä, "digitaalinen tamagotchi" ([Pratt IxD critique](https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/)). Finchin oma FAQ: lemmikit on suunniteltu niin, etteivät ne koskaan kuole, "because it can be too anxiety-inducing" ([Finch FAQ](https://befinch.notion.site/Finch-FAQ-474652d0123d4883ac7a0cd6c8f5aa70); lainaus hakutuloksen kautta, sivu ei renderöitynyt suoraan).

Appbotin arvosteluanalyysi (40 294 arvostelua, elo 2025–elo 2026): keskiarvo 4,59 tähteä, 82,1 % positiivisia; 400 positiivisen arvostelun otoksessa 88 mainitsee linnun söpönä, nimettynä tai tunnetasolla merkittävänä. Negatiivisissa korostuu hinnoittelu (27 % iOS-otoksesta) ja yksittäiset streakin nollautumiset. Appbot huomauttaa, että data kertoo mitä käyttäjät sanovat, ei syy-seuraussuhdetta ([Appbot](https://appbot.co/blog/finch-app-reviews-emotional-attachment-user-retention-product-loyalty/)). Kotinäytön widget pitää linnun näkyvissä muistutuksena ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl)).

**Opetus:** kiintymys syntyy vastavuoroisuudesta ("pidän huolta itsestäni → lintu kannustaa"), ei pelosta. Poissaolosta ei rangaista hahmon kautta.

### 2.4 Headspace – ei maskottia, vaan joustava kuvitusjärjestelmä

Headspacella ei ole virallista maskottia; logo (oranssi "The Dot") muuntuu someissa ja sähköposteissa ilmeikkääksi kasvoksi, mutta sitäkään ei pidetä maskottina ([Advertising Week](https://advertisingweek.com/aw360/news/unlocking-headspaces-inner-brand-character/19717/)). Kuvittaja Karen Hong kertoo, että tiimi laajensi tyyliä saatuaan palautetta, että brändi tuntui "lapselliselta ja sarjakuvamaiselta", ja uudessa tyylissä on kasvoja, jotka ilmaisevat laajempaa tunneskaalaa kuin pelkkää hymyä ([Blush](https://blush.design/blog/post/headspace-mindfulness-app)). Pääsuunnittelija Ken Seeno: piirroslupa auttaa kuvaamaan abstrakteja mielen asioita ([Meet the Creatives](https://medium.com/meet-the-creatives/meet-ken-seeno-lead-product-designer-at-headspace-118e0b93041a)).

**Opetus:** "lapsellisuus"-palaute on todellinen riski myös aikuisemmille kohderyhmille. Rauhalliset, hillityt tilat (hengitys, tauko) toimivat ilman vitsejä — sopii meidän venyttelyanimaatioon.

### 2.5 Habitica – avatar ja vahinko

Habitica on RPG-tyyppinen tapasovellus: käyttäjän avatar ottaa vahinkoa tekemättömistä päivittäistehtävistä, ja boss-questeissa tekemättömät tehtävät vahingoittavat koko porukkaa (kerrottuna bossin voimalla). "Lepää majatalossa" -tila tauottaa vahingon, ja avatarin silmät sulkeutuvat ja "Zzz" näytetään ([Habitica Wiki: Rest in the Inn](https://habitica.fandom.com/wiki/Rest_in_the_Inn); yhteisöwiki).

**Opetus:** (1) rangaistus + sosiaalinen paine on vahva mutta raskas työkalu; (2) **eksplisiittinen taukotila, jossa hahmolla on oma "lepo"-asentonsa**, on hyvä malli — sairasloma, ylioppilaskoeviikko muissa aineissa jne.

### 2.6 Forest – hahmo/kohde, joka kuolee

Forestissa puu kasvaa keskittymisjakson aikana ja kuihtuu, jos käyttäjä poistuu sovelluksesta — suora tappion välttämiseen perustuva mekaniikka ([Wikipedia: Forest](https://en.wikipedia.org/wiki/Forest_(application))). Arvostelijat huomauttavat, että mekaniikka luo kitkaa, jos puhelinta tarvitaan itse työhön ([ClickUp](https://clickup.com/learn/topic/productivity/tools/forest/)).

**Opetus:** meillä opiskelu *tapahtuu* sovelluksessa, joten "kuihtumis"-mekaniikka ei sovi. Kerätty historia (metsä) on sen sijaan hieno: kerättävä edistymisen kuvaus toimii ilman rangaistusta.

### 2.7 Khan Academy Kids – hahmo opettajana (ja miksi se ei sovi meille sellaisenaan)

Khan Academy Kidsissä on viisi eläinhahmoa; pääopas on Kodi-karhu ([Khan Kids Help](https://khankids.zendesk.com/hc/en-us/articles/360049358751-Learn-more-about-the-characters-inside-Khan-Academy-Kids)). Khanin blogi korostaa Kodin eleitä: juhlii oikeita vastauksia ja ohjaa ajattelemaan "tassu leualla" -eleellä ([Khan Academy Blog](https://blog.khanacademy.org/supporting-english-language-acquisition-with-khan-academy-kids/)).

**Opetus:** "ajattelueleet" (käsi leualla) ovat yleiskielinen tapa sanoa "mieti vielä" ilman tekstiä — hyödyllinen still meillekin. Mutta Kids-tason jatkuva läsnäolo ja puhuva opas olisi 18-vuotiaalle liikaa. Khanin aikuisille suunnattu Khanmigo ei nojaa vastaavaan hahmoon (hakuni ei löytänyt dokumentoitua Khanmigo-hahmosuunnittelua).

### 2.8 Babbel (ja Busuu) – matala maskottiprofiili kontrastina

Babbelin tammikuun 2024 brändiuudistus tähtäsi "lähestyttävään ja hauskaan, mutta laadukkaalta tuntuvaan" ilmeeseen, ja designjärjestelmä nojaa leikkokuviin, tuotekortteihin ja valokuvaan eikä hahmoihin ([Babbel Press](https://babbel.com/press/en-us/releases/babbel-unveils-a-bold-new-chapter-a-transformational-rebranding); [Babbel Blog: New design](https://blog.babbel.com/new-design/)). Busuun painopiste on yhteisön korjauksissa (kolmannen osapuolen kuvaus).

**Opetus:** aikuisille ja käytännön tavoitteille (matka, muutto) suunnattu tuote voi pärjätä ilman maskottia. Meidän kohderyhmä on näiden välissä: nuori, mutta tavoite on vakava. → Maskotti, mutta **annosteltuna ja asiallisissa paikoissa sivussa**.

### 2.9 Clippy – varoittava esimerkki

Luke Swartzin Stanfordin kandidaatintyö "Why People Hate the Paperclip" (2003): ongelma oli sekä toteutuksessa että konseptissa. Hyvän agentin pitää pitää käyttäjä "hallinnassa" ja noudattaa "ihmisten käytössääntöjä"; Clippy rikkoi molempia, ja ärsyttävin piirre oli pyytämättä ilmestyvä kirjeavustaja. Swartz huomauttaa myös, että ihmismäinen hahmo nostaa odotuksia, joita ohjelma ei täytä, ja että söpö ensivaikutelma kääntyy ärsytykseksi — mitä yksi käytettävyystestikierros ei välttämättä paljasta ([Harvard Crimson 2005](https://www.thecrimson.com/article/2005/4/28/what-not-to-do-with-a/)).

**Opetus:** maskotti ei koskaan avaa itseään pyytämättä tehtävän päälle, ei peitä sisältöä, ja AI-esseepalautteessa ei esitä hahmon "osaavan" enemmän kuin palaute oikeasti osaa.

---

## 3. Poikkileikkausanalyysi

### 3.1 Kosketuspisteet

| Kosketuspiste | Duolingo | Brilliant | Finch | Headspace | Babbel | Johtopäätös meille |
|---|---|---|---|---|---|---|
| Onboarding | Duo esittelee, kysyy tavoitteen | Koji esitellään tutorina | Lintu kuoriutuu, nimetään | Kuvitus, ei hahmoa | Ei hahmoa | Kyllä: tervehdys (salute), 1–2 ruutua, ohitettava |
| Tyhjät tilat | Duo-kuvitus | – | Lintu | Kuvitus | Kuvitus | Kyllä: staattinen asento + selkeä CTA |
| Polku | Hahmot polun varrella, virstanpylväät | – | – | – | – | Kyllä: "olet tässä" -merkki, ei joka solmussa |
| Tehtäväpalaute oikein | Hahmo-animaatio | Reaktiot | – | – | Ei | Kevyt, vain sarjoista tai osion lopussa |
| Tehtäväpalaute väärin | Hahmo reagoi, ei rankaise | Rohkaisee | – | – | Ei | Ei hahmoa jokaiseen virheeseen; rohkaisu sessiotasolla |
| Streak | Liekki + Duo, freeze | – | Ei rangaistusta | – | Ei | Kyllä, mutta lempeä; tauko-mahdollisuus |
| Notifikaatiot | Duon kasvot, syyllistävä | – | Widget | – | Asiallinen | Hahmo kuvakkeessa/kuvassa OK, teksti asiallinen |
| Juhla / virstanpylväs | Iso animaatio | Flippi | Palkinnot | – | Pieni | Kyllä: tanssi vain isoissa |
| Virhe / lataus | Duo-kuvitus | – | – | – | – | Kevyt still, ei koskaan "hauska" maksuvirheessä/tietojen menetyksessä |
| Paywall | Duo + Super | – | – | – | – | Varovasti; ei syyllistävää hahmoa maksun yhteydessä |

### 3.2 Tunneskaala

Duolingolla Duo kattaa laajan skaalan (iloinen, ylpeä, surullinen, sairas, vihainen, "kuollut"). Finch pysyy lämpimänä ja levollisena. Brilliantin Koji: utelias, rohkaiseva, juhliva. Headspace: rauhallinen.

Meidän suositeltu skaala (5–6 tilaa riittää): **neutraali/läsnä** (idle), **tervehtivä/ylpeä** (salute), **rento/palautuva** (venyttely), **juhliva** (tanssi), **pohtiva/rohkaiseva** (still), **väsynyt/torkkuva** (still). **Ei surullista, vihaista, itkevää tai pettynyttä hahmoa käyttäjää kohtaan.** Väsymys on hahmon *oma* olotila ("myöhäinen ilta"), ei syytös.

### 3.3 Frekvenssi ja väsyminen

- Duolingon notifikaatiotutkimus osoittaa, että sama viestipohja menettää tehoaan toistettaessa (novelty effect) ([KDD 2020](https://research.duolingo.com/papers/yancey.kdd20.pdf)). Sama pätee animaatioihin.
- Clippyn opetus: söpö ensivaikutelma kääntyy ärsytykseksi ([Crimson](https://www.thecrimson.com/article/2005/4/28/what-not-to-do-with-a/)).
- Peukalosääntö (oma suositus, ei mitattu): **yksi liikkuva maskottihetki per näkymä**, **iso juhla korkeintaan kerran sessiossa**, ja hahmo poissa näkyvistä varsinaisen tehtävän tekemisen aikana (kirjoittaminen, kuuntelu, testi).

### 3.4 Sävy vanhemmille nuorille

- Lilyn suosio ja Headspacen "liian lapsellinen" -palaute osoittavat samaan suuntaan: **tasavertainen, kuiva, lämmin — ei lässytystä**.
- Hahmo puhuu kuin samalla kurssilla oleva kaveri, joka on vähän edellä: "Mä tein tän viime viikolla, se on helpompi kuin miltä näyttää."
- Ei huutomerkkiketjuja, ei liikaa emojeja, ei vauvakieltä. Huumori kohdistuu tilanteeseen (kielioppi, kevään koe, kahvi), ei käyttäjään.
- Valinta sinuttelu + puhekielen kevyt sävy ("mä", "sä") hahmon repliikeissä, mutta ohje- ja virhetekstit yleiskieltä. Päätetään yksi linja ja pidetään se.

### 3.5 Saavutettavuus

- **Reduced motion:** WCAG 2.3.3 (Animation from Interactions, AAA) — vuorovaikutuksen laukaisema liike pitää voida poistaa ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)). Toteutus: verkossa `prefers-reduced-motion`, mobiilissa olemassa oleva `useReduceMotion`. Silloin näytetään vastaava *still*.
- **Pysäytettävyys:** WCAG 2.2.2 (Pause, Stop, Hide) — yli 5 s kestävä automaattinen liike rinnakkain muun sisällön kanssa pitää voida pysäyttää ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). Idle-loop: joko pysähtyy itsestään (esim. 2–3 kierrosta) tai on hyvin hillitty ja siihen on pysäytys (hero).
- **Välähdykset:** tanssi- ja konfettiefekteissä ei välkkymistä yli 3 kertaa sekunnissa ([W3C 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)).
- **Ei tietoa pelkän hahmon varassa:** oikein/väärin, pisteet ja putken tila aina tekstinä + ikonina; hahmo on lisäkerros. (Vrt. WCAG 1.4.1 Use of Color, sama periaate: [W3C](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).)
- **Alt-tekstit:** koristeellinen maskotti → `alt=""` / `accessibilityElementsHidden` / `importantForAccessibility="no"` ([W3C Decorative images](https://www.w3.org/WAI/tutorials/images/decorative/)). Jos hahmo kantaa merkitystä (esim. onboardingin ainoa visuaali), lyhyt alt: "Maskotti tervehtii ylioppilaslakki päässä."
- **Ääni:** ei ääniefektejä oletuksena; jos lisätään, ne ovat pois päältä äänettömässä tilassa ja asetuksista säädettävissä.

### 3.6 Suorituskyky ja formaatit (3D-malli on erityistapaus)

- **Rive/Lottie** ovat 2D-vektoriformaatteja. Duolingo ja Brilliant rakensivat hahmonsa Rivessä alusta alkaen ([Duolingo](https://blog.duolingo.com/world-character-visemes), [Rive/Brilliant](https://rive.app/blog/brilliant-builds-its-math-and-coding-tutor-character-with-rive)). Rive vs. Lottie -tiedostokokovertailut ovat lähes kaikki myyjien omia ([Rive](https://www.rive.app/blog/rive-as-a-lottie-alternative), [LottieFiles](https://lottiefiles.com/blog/lottie-animations/lottiefiles-or-rive), [Callstack](https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation)); neutraalein lähde (Wikimedia) toteaa, että suorituskyky riippuu animaatiosta ja pitää mitata lopullisilla asseteilla, ja raportoi Riven kasvattavan Android-sovellusta n. 14,8 MB ([Phabricator T433250](https://phabricator.wikimedia.org/T433250)).
- **Meidän 3D-malli ei käänny Riveksi/Lottieksi.** Vaihtoehdot:
  1. **Esirenderöidyt stillit** (WebP/PNG, alfa) — halvin, toimii kaikkialla, sopii 80 %:iin käyttötapauksista.
  2. **Esirenderöidyt lyhyet loopit:** verkossa WebM VP9 + alfa (Chrome/Firefox/Edge) ja HEVC + alfa (.mov/.mp4, hvc1) Safarille, HEVC listattuna ensin, koska Safari tukee VP9:ää mutta ei sen läpinäkyvyyttä ([Jake Archibald](https://jakearchibald.com/2024/video-with-transparency/), [Rotato](https://rotato.app/blog/transparent-videos-for-the-web)). Mobiilissa todennäköisesti yksinkertaisin on **animoitu WebP** (tai sprite sheet) — läpinäkyvän videon tuki React Nativessa kannattaa testata erikseen ennen kuin siihen sitoudutaan.
  3. **GLB + three.js** reaaliajassa — vain verkkosivun etusivun hero-kohtaan, lazy-loadattuna, poster-stillillä ja reduced motion -tuella. Verkkosivulla `three` on jo riippuvuutena. Mobiilissa reaaliaikainen 3D (expo-gl/r3f) on raskas eikä tuo meidän käyttötapauksiin lisäarvoa, joka oikeuttaisi kustannuksen.
- **Kokobudjetit (oma suositus, mitataan):** still @2x WebP < 60 kB; loop (2–4 s) < 300–500 kB; GLB (draco/meshopt-pakattu, tekstuurit KTX2/WebP) < 1,5–2 MB ja ladataan vasta, kun hero on näkyvissä.

### 3.7 Mikä kostautuu

1. **Syyllistäminen ja hahmon kärsimys** (surullinen/itkevä/kuoleva maskotti) — ahdistaa osaa käyttäjistä ([El País/UXP](https://www.universityxp.com/news/2025/7/25/we-havent-seen-you-in-a-while-duolingos-passive-aggressive-strategy-for-keeping-users-hooked), [UX Collective](https://uxdesign.cc/20-days-of-emotional-blackmail-from-duolingo-4f566523e3c5)); Finch on hylännyt sen ahdistuksen takia.
2. **Keskeyttäminen ja pyytämättömät ehdotukset** (Clippy).
3. **Lapsellisuus** (Headspacen palaute).
4. **Toisto** (novelty effect kuluu).
5. **Confirmshaming** — "Ei kiitos, en halua pärjätä kokeessa" -tyyppiset kieltäytymispainikkeet ovat tunnistettu dark pattern ([Deceptive Design: Confirmshaming](https://www.deceptive.design/types/confirmshaming)). Erityisen vaarallinen paywallissa.
6. **Hahmo kantaa tiedon** — jos hahmon ilme on ainoa merkki virheestä, ruudunlukijan käyttäjä ja reduced motion -käyttäjä jäävät paitsi.
7. **Hauska hahmo vakavassa virheessä** (maksu epäonnistui, essee hävisi) — vähättelee käyttäjän ongelmaa.

---

## 4. Parhaat käytännöt Opiskeluakatemialle (priorisoitu)

Työnimi hahmolle tässä dokumentissa: **Abi**. (Nimi kannattaa päättää erikseen; hyvä nimi on lyhyt, suomeksi ja englanniksi lausuttava.)

| # | Missä | Mitä hahmo tekee | Esimerkkicopy (FI) | Miksi |
|---|---|---|---|---|
| 1 | **Kaikki hahmon esiintymiset (periaate)** | Hahmo on aina lisäkerros: tieto tekstinä + ikonina, hahmo koristeena. Reduced motion → still. Koristeellinen → piilotettu ruudunlukijalta. | – | WCAG 2.3.3, 2.2.2, 1.4.1; ei sulje ketään ulos. Tämä on edellytys kaikelle muulle. |
| 2 | **Oppitunnin / Päivän tehtävien loppuruutu** (`ResultScreen`) | **Salute** (lakki-tervehdys) kerran, sitten still. Tulos isolla tekstinä hahmon vieressä. | "Päivän tehtävät tehty. Hyvä veto." / "8/10 – kaksi kohtaa jäi, ne tulee Kertaukseen." | Lakki = tavoite; salute on luonteva "kuittaus". Duolingon mukaan juhla-animaatio sessiot päätteeksi tukee pysyvyyttä (+1,7 % 7 pv, streak-animaatio). |
| 3 | **Polku – "olet tässä" -kohta** | Pieni **idle**-still/loop nykyisen solmun vieressä. Ei hahmoa jokaisessa solmussa. Reduced motion → still. | (ei tekstiä, tai solmun tooltip) "Seuraavaksi: Konditionaalit" | Antaa polulle suunnan ja läsnäolon kuormittamatta karttaa. Duolingossa hahmot polun varrella, mutta harkiten. |
| 4 | **Isot virstanpylväät** (osio/moduuli valmis, koko polku valmis, kielioppitestin läpäisy, ensimmäinen täysi koeharjoitus) | **Hip-hop-tanssi** 2–4 s, kerran; konfetti ilman välkkymistä. Ohitettavissa napautuksella. | "Koko kielioppiosio kasassa. Tää on se osa, mistä moni menettää pisteitä – sä et." | Harvinaisuus tekee juhlasta arvokkaan. Tanssi on animaatioistamme energisin; jos sitä näkee joka päivä, se kuluu. |
| 5 | **Onboarding** (1–2 ruutua, ohitettava) | **Salute** + lyhyt esittely; kysytään koepäivä/tavoite, hahmo ei puhu koko onboardingia läpi. | "Moi! Mä oon Abi. Mä en tiedä englannista kaikkea, mutta tiedän miten tähän kokeeseen kannattaa valmistautua. Milloin sun koe on?" | Duolingo käyttää maskottia onboardingissa tavoitteen asettamiseen. Lyhyt ja ohitettava → ei Clippy-ilmiötä. |
| 6 | **Streak / päivän putki** | Normaalisti pieni **idle**-ikoni putken vieressä. Putki vaarassa → **"torkkuva/väsynyt" still** (hahmon oma olotila, ei syytös). Paluu tauon jälkeen → **venyttely**. | Vaarassa: "Putki on vielä pelastettavissa – yksi 5 min tehtävä ennen puoltayötä." Paluu: "Hyvä nähdä taas. Aloitetaan kevyesti." | Lempeä tappion välttäminen toimii ilman ahdistusta (Finch). Venyttely kertoo "lämmitellään uudestaan" ilman syyllistämistä. |
| 7 | **Streak-tauko / lepopäivä** (ominaisuus, jos tehdään) | **Torkkuva still** ("Zzz"-tyyliin, vrt. Habitican Inn). | "Lepopäivä käytössä. Putki odottaa huomiseen." | Duolingon mukaan joustava freeze nosti aktiivisuutta (+0,38 %) lisäämättä vapaapäiviä. Abeilla on muiden aineiden kokeita, sairastumisia, töitä. |
| 8 | **Push-notifikaatiot** | Hahmo notifikaation kuvassa (rich notification) korkeintaan; teksti asiallinen ja konkreettinen. Vaihtuvat viestipohjat. Lopetetaan itse, jos käyttäjä ei reagoi useaan päivään, ja kerrotaan siitä. | "Päivän tehtävät odottaa – noin 7 minuuttia." / "Eilen jäi kaksi prepositiota. Kerrataan ne nopeasti?" / Lopetus: "Pidetään taukoa muistutuksista. Polku on tallessa, kun palaat." | Duolingon data: vaihtelu ja uutuus vaikuttavat (+0,5 % DAU, +2 % retention bandit-optimoinnilla). Itsestään lopettaminen kunnioittaa käyttäjää. |
| 9 | **Kertaus – tyhjä tila** ("ei kerrattavaa") | **Idle**-still tai rento asento (kädet niskassa / venyttelyn loppuasento). CTA seuraavaan tehtävään. | "Ei mitään kerrattavaa juuri nyt. Kaikki viime aikojen virheet on jo hoidettu." | Tyhjä tila on luonteva paikka hahmolle; muuttaa "tyhjän" saavutukseksi. |
| 10 | **AI-esseepalaute – odotus ja kehys** | Odotuksen ajan **"pohtiva" still/loop** (käsi leualla). Palautteen yläpuolella pieni still + yksi kehyslause. Itse palaute on aina tekstiä ilman hahmoa. | Odotus: "Luen sun tekstiä…" Kehys: "Tässä kolme asiaa, joilla tästä saa vielä pisteitä irti." | Brilliant: hahmo madaltaa kynnystä ja vähentää epäonnistumisen pelkoa. Clippy: hahmo ei saa esittää olevansa älykkäämpi kuin on → palaute itse ei ole "Abin mielipide". |
| 11 | **Väärä vastaus tehtävässä** | **Ei hahmoa** yksittäiseen virheeseen. Sessiotasolla, jos useita virheitä peräkkäin → pieni **rohkaiseva** still + vinkki. | "Tää rakenne on hankala monelle. Katso esimerkki ja kokeile uudestaan." | Virhe on yleisin hetki; hahmo jokaisessa olisi toistoa ja voi tuntua vähättelevältä. Ei koskaan surullista tai pettynyttä hahmoa. |
| 12 | **Kielioppitesti ja koeharjoitus (aikana)** | **Ei hahmoa** ruudulla. Ennen testiä still + lyhyt valmistava lause; jälkeen kohta 2 tai 4. | Ennen: "Ota rauhassa. Tässä ei ole aikarajaa." (jos pitää paikkansa) | Keskittymistä ei keskeytetä (Clippy). Testitilanne muistuttaa koetta, joten rauhoittava kehys on arvokkaampi kuin viihde. |
| 13 | **Verkkosivun etusivu (hero)** | Interaktiivinen **GLB**: idle, hover/klikkaus → salute. Lazy-load, poster-still, reduced motion → still, ei pakota GPU:ta mobiilisivulla (fallback still). | "Englannin abikurssi, joka pitää sut liikkeellä kevääseen asti." | Ainoa paikka, jossa 3D:n "wow" maksaa itsensä takaisin (ensivaikutelma, brändi). Sovelluksen sisällä stillit ja loopit ovat kevyempiä. |
| 14 | **Virheet ja lataus** | Lataus: pieni **idle**-loop (vain > 1 s latauksissa). Verkkovirhe: neutraali still. **Maksuvirhe, tietojen menetys, kirjautumisongelma: ei hahmoa** tai vain neutraali. | Verkko: "Yhteys katkesi. Vastauksesi on tallessa – yritä uudelleen." | Hauska hahmo vakavassa ongelmassa vähättelee. Tieto (mitä tapahtui, onko data tallessa) ensin. |
| 15 | **Paywall / maksullinen sisältö** | Korkeintaan neutraali tervehtivä still. Ei surullista hahmoa, ei kieltäytymisen häpäisyä. Kieltäytymispainike neutraali. | Kyllä: "Avaa koko kurssi" / Ei: "Ei nyt" | Confirmshaming on tunnettu dark pattern; luottamus on tärkeämpi kuin yksittäinen konversio, erityisesti kun maksaja voi olla vanhempi. |

### Yleinen äänensävyohje (copy)

- Abi puhuu kuin samalla kurssilla oleva kaveri: sinuttelee, lyhyitä lauseita, kevyttä puhekieltä ("mä/sä") vain hahmon omissa repliikeissä.
- Konkreettinen > innostunut: "noin 7 minuuttia", "kaksi prepositiota" > "Tsemppiä!!!".
- Kehu tekoa, ei ihmistä: "Hyvä veto, konditionaalit meni" > "Olet nero".
- Huumori kohdistuu aiheeseen tai tilanteeseen, ei koskaan käyttäjään tai hänen poissaoloonsa.
- Max yksi emoji per viesti, mieluummin ei yhtään.

---

## 5. Älä tee -lista

1. **Älä tee hahmosta surullista, itkevää, vihaista, sairasta tai "kuolevaa" käyttäjän poissaolon takia.** Duolingon syyllistämishuumori on brändin laajuinen meemi; meiltä se luetaan kirjaimellisesti stressaantuneen abin päähän.
2. **Älä käytä vatsaan lyönti -animaatiota** (eikä muuta fyysistä kipua/slapstickia), varsinkaan virheiden yhteydessä.
3. **Älä näytä hahmoa tehtävän tekemisen aikana** (kirjoitus, kuuntelu, testi) äläkä anna sen avautua pyytämättä sisällön päälle.
4. **Älä välitä tietoa pelkän hahmon ilmeen tai animaation kautta.**
5. **Älä toista samaa animaatiota tai repliikkiä joka kerta** — juhlat harvinaisiksi, repliikit vaihtuviksi.
6. **Älä käytä confirmshamingia** paywallissa, notifikaatioiden poiskytkennässä tai tilin poistossa.
7. **Älä lässytä:** ei vauvakieltä, ei huutomerkkiketjuja, ei "Jee, sä oot ihan paras!!!".
8. **Älä anna hahmon "esittää" AI-palautteen kirjoittajaa** tai luvata asioita, joita palaute ei osaa ("Abi tietää tarkalleen sun arvosanan").
9. **Älä pakota 3D:tä mobiiliin** tai lataa GLB:tä ennen kuin sitä tarvitaan.
10. **Älä lähetä yön notifikaatioita** tai useaa muistutusta päivässä.

---

## 6. Suositeltu assettilista (renderöidään 3D-mallista)

Yhteiset tekniset ohjeet: sama kamerakulma (n. 3/4 edestä, hieman yläviistosta) ja sama valaistus kaikissa, jotta stillit ja loopit voi vaihtaa toisiinsa saumattomasti. Loopin ensimmäinen ja viimeinen kuva = vastaava still (reduced motion -tilan "poster"). Läpinäkyvä tausta. Koot @1x/@2x/@3x tai yksi iso + responsiivinen skaalaus. Varaa tila varjolle tai tee varjo erillisenä kerroksena.

### 6.1 Stillit (läpinäkyvä WebP + PNG-varakopio)

| ID | Asento / ilme | Lähde | Käyttö |
|---|---|---|---|
| `still-idle` | Neutraali, rento seisoma-asento, kevyt hymy | idle-animaation kuva | Polku "olet tässä", tyhjät tilat, lataus (reduced motion), streak-ikoni |
| `still-salute` | Tervehdys lakkiin, ylpeä ilme | salute-animaation huippukohta | Onboarding, loppuruutu (reduced motion), paywall (neutraali) |
| `still-celebrate` | Tanssin dynaamisin asento / kädet ylhäällä | hip-hop-tanssin huippukohta | Virstanpylväät (reduced motion), jakokuvat |
| `still-stretch` | Kädet ylhäällä venytellen, silmät kiinni | venyttelyn huippukohta | Paluu tauolta, "aloitetaan kevyesti" |
| `still-thinking` | Käsi leualla, katse sivulle/ylös | **uusi asento** | AI-esseepalautteen odotus, "mieti vielä" -vinkki |
| `still-encourage` | Peukku tai avoin kämmen eteenpäin, lämmin ilme | **uusi asento** | Useampi virhe peräkkäin, ennen testiä |
| `still-sleepy` | Haukotus tai torkkuva, lakki vähän vinossa | **uusi asento** (voi johtaa venyttelyn alusta) | Putki vaarassa, lepopäivä, illan notifikaatio |
| `still-point` | Osoittaa sivulle (vasen ja oikea peilikuvina) | **uusi asento** | Onboardingin "aloita tästä", polun seuraava solmu, uuden ominaisuuden esittely |
| `still-reading` | Lukee paperia/puhelinta, keskittynyt | **uusi asento** (valinnainen) | Esseepalaute "luen sun tekstiä", Kertaus |
| `still-wave` | Heiluttaa kättä | **uusi asento** (valinnainen, salute voi korvata) | Kirjautuminen, uloskirjautuminen |
| `avatar-head` | Pelkät kasvot + lakki, ympyrärajaus | rajaus `still-idle`:stä | Notifikaatiokuva, chat-tyyppiset kuplat, favicon/sovelluskuvakkeen variantti |

### 6.2 Loopit / lyhyet animaatiot

| ID | Kesto | Toisto | Formaatti verkossa | Formaatti mobiilissa | Käyttö |
|---|---|---|---|---|---|
| `anim-idle` | 2–4 s | loop, pysähtyy 2–3 kierroksen jälkeen | WebM VP9 alfa + HEVC alfa (Safari), poster `still-idle` | animoitu WebP tai sprite sheet | Polku, lataus, hero-varasuunnitelma |
| `anim-salute` | 1,5–2,5 s | kerran | kuten yllä | animoitu WebP | Loppuruutu, onboarding |
| `anim-dance` | 2–4 s (lyhennetty versio tanssista) | kerran, ohitettava | kuten yllä | animoitu WebP | Isot virstanpylväät |
| `anim-stretch` | 2–3 s | kerran | kuten yllä | animoitu WebP | Paluu tauolta, streak-paluu |
| `anim-thinking` | 2–3 s | loop latauksen ajan | kuten yllä | animoitu WebP | AI-esseepalautteen odotus (vaatii uuden animaation; muuten still + kevyt CSS/Reanimated-"hengitys") |

### 6.3 Interaktiivinen 3D

| ID | Formaatti | Käyttö |
|---|---|---|
| `abi-hero.glb` | GLB, Draco/meshopt-pakattu, tekstuurit KTX2/WebP, sisältää klipit idle + salute (+ dance) | Verkkosivun etusivun hero (three.js). Lazy-load, poster `still-idle`, reduced motion → still. Ei mobiilisovellukseen. |

### 6.4 Pudotetaan

- `stomach-hit` — ei käyttöä, joka sopisi sävyyn.

---

## 7. Ehdotettu toteutusjärjestys

1. Renderöi stillit (`still-idle`, `still-salute`, `still-celebrate`, `still-stretch`) olemassa olevista animaatioista + `avatar-head`.
2. Ota käyttöön kohdat 1, 2, 3, 9 (loppuruutu, polku, tyhjät tilat) pelkillä stilleillä → mittaa ja kerää palautetta abeilta (esim. 5 käyttäjän haastattelu: "tuntuuko lapselliselta?").
3. Lisää loopit (`anim-salute`, `anim-dance`) loppuruutuun ja virstanpylväisiin reduced motion -tuella.
4. Mallinna uudet asennot (`thinking`, `encourage`, `sleepy`, `point`) ja ota käyttöön streak, notifikaatiot, esseepalaute.
5. Verkkosivun GLB-hero viimeisenä (suurin työ, vähiten vaikutusta oppimiseen).

---

## 8. Lähteet

**Duolingo**
- Duolingo Blog – Building Character: https://blog.duolingo.com/building-character/
- Duolingo Blog – World Character Visemes (Rive): https://blog.duolingo.com/world-character-visemes
- Duolingo Blog – How the Duolingo streak builds habit: https://blog.duolingo.com/how-duolingo-streak-builds-habit
- Yancey & Settles, "A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications", KDD 2020: https://research.duolingo.com/papers/yancey.kdd20.pdf
- Design Week – Duolingo owl makeover (2019): https://www.designweek.co.uk/issues/2-6-january-2019/duolingo-owl-receives-makeover-as-app-becomes-more-gamified
- Creative Bloq – Duolingo's redesigned mascot: https://www.creativebloq.com/news/duolingos-redesigned-mascot-is-a-hoot
- Advertising Week – Why the Duolingo owl is green: https://advertisingweek.com/the-surprising-reason-why-the-duolingo-owl-is-green/
- The Mary Sue – Duolingo icon changes: https://www.themarysue.com/what-happened-to-the-duolingo-icon-explained/
- gHacks – Melting Duolingo icon: https://www.ghacks.net/?p=203379
- NPR – Duo is alive after all (2025): https://npr.org/2025/02/26/nx-s1-5309785/duolingo-owl-mascot-lives
- Entrepreneur – Duolingo says Duo is dead: https://www.entrepreneur.com/business-news/duolingo-says-its-mascot-duo-the-owl-is-dead/486944
- University XP / El País – passive-aggressive strategy: https://www.universityxp.com/news/2025/7/25/we-havent-seen-you-in-a-while-duolingos-passive-aggressive-strategy-for-keeping-users-hooked
- UX Collective – 20 days of emotional blackmail: https://uxdesign.cc/20-days-of-emotional-blackmail-from-duolingo-4f566523e3c5
- Web Designer Depot – The art of Duolingo notifications: https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/
- Screenwise – Managing Duolingo streaks: https://screenwiseapp.com/guides/managing-duolingo-streaks-when-gamification-becomes-stressful
- Debugger/Medium – Duolingo needs to chill: https://debugger.medium.com/duolingo-needs-to-chill-8f1832745ca0
- Taplytics – Duolingo stops reminders: https://taplytics.com/blog/duolingo-sends-push-notifications-to-let-users-know-they-know-theyre-not-engaging-with-their-reminders
- Fortune – Lily on the earnings call: https://fortune.com/2024/11/07/duolingo-ai-chatbot-lily-earnings-call
- Duolingo IR – Duocon 2024: https://investors.duolingo.com/news-releases/news-release-details/duolingo-introduces-ai-powered-innovations-duocon-2024
- TechBrew – Duolingo AI video chats: https://www.techbrew.com/stories/2024/09/25/duolingo-debuts-ai-video-chats

**Muut sovellukset**
- Rive Blog – Brilliant builds its tutor character (Koji): https://rive.app/blog/brilliant-builds-its-math-and-coding-tutor-character-with-rive
- Brilliant Help – How does Koji work: https://brilliant.org/help/features/how-does-koji-work/
- Brilliant (Wikipedia-peili): https://wiki.riteme.site/wiki/Brilliant_(website)
- Finch FAQ: https://befinch.notion.site/Finch-FAQ-474652d0123d4883ac7a0cd6c8f5aa70
- Appbot – Finch reviews analysis: https://appbot.co/blog/finch-app-reviews-emotional-attachment-user-retention-product-loyalty/
- Pratt IxD – Finch design critique: https://ixd.prattsi.org/2025/09/design-critique-finch-ios-app-2/
- Deconstructor of Fun – Finch widgets: https://www.deconstructoroffun.com/blog/x0hd2ssr80y5n7gv0w967pg7hwd7tl
- Advertising Week – Headspace brand character: https://advertisingweek.com/aw360/news/unlocking-headspaces-inner-brand-character/19717/
- Blush – Karen Hong on Headspace illustrations: https://blush.design/blog/post/headspace-mindfulness-app
- Meet the Creatives – Ken Seeno (Headspace): https://medium.com/meet-the-creatives/meet-ken-seeno-lead-product-designer-at-headspace-118e0b93041a
- Habitica Wiki – Rest in the Inn: https://habitica.fandom.com/wiki/Rest_in_the_Inn
- Wikipedia – Forest (application): https://en.wikipedia.org/wiki/Forest_(application)
- ClickUp – Forest review: https://clickup.com/learn/topic/productivity/tools/forest/
- Khan Academy Kids – characters: https://khankids.zendesk.com/hc/en-us/articles/360049358751-Learn-more-about-the-characters-inside-Khan-Academy-Kids
- Khan Academy Blog – ELL with Khan Academy Kids: https://blog.khanacademy.org/supporting-english-language-acquisition-with-khan-academy-kids/
- Babbel Press – Rebrand 2024: https://babbel.com/press/en-us/releases/babbel-unveils-a-bold-new-chapter-a-transformational-rebranding
- Babbel Blog – New design: https://blog.babbel.com/new-design/
- Harvard Crimson – What not to do with a paper clip (Swartz): https://www.thecrimson.com/article/2005/4/28/what-not-to-do-with-a/
- Deceptive Design – Confirmshaming: https://www.deceptive.design/types/confirmshaming

**Saavutettavuus ja tekniikka**
- W3C – Animation from Interactions (2.3.3): https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- W3C – Pause, Stop, Hide (2.2.2): https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- W3C – Three Flashes or Below Threshold (2.3.1): https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- W3C – Use of Color (1.4.1): https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- W3C – Decorative images: https://www.w3.org/WAI/tutorials/images/decorative/
- Jake Archibald – Video with alpha transparency on the web: https://jakearchibald.com/2024/video-with-transparency/
- Rotato – Transparent videos for the web: https://rotato.app/blog/transparent-videos-for-the-web
- Wikimedia Phabricator T433250 – Rive/Lottie evaluation: https://phabricator.wikimedia.org/T433250
- Rive – Rive as a Lottie alternative (myyjä): https://www.rive.app/blog/rive-as-a-lottie-alternative
- LottieFiles – LottieFiles or Rive (myyjä): https://lottiefiles.com/blog/lottie-animations/lottiefiles-or-rive
- Callstack – Lottie vs Rive: https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation

*Huom. lähteiden laadusta:* Duolingon omat blogit ja KDD-paperi ovat primäärilähteitä. Rive/Lottie-vertailut ovat pääosin myyjien materiaalia. Finchin FAQ-lainaus on hakutuloksen kautta (Notion-sivu ei renderöitynyt suoraan). Habitica-tiedot ovat yhteisöwikistä. Kokobudjetit ja frekvenssisäännöt luvuissa 3.3 ja 3.6 ovat omia suosituksia, eivät mitattuja lukuja. Mimoa ei tutkittu tähän versioon.
