# Gaming Relax — Sito Web

Sito per **Gaming Relax**, attività di tastiere custom, keycaps artisan e servizi digitali (bot Discord, consulenze, grafica). Frontend statico (HTML/CSS/JS, nessuna build richiesta), con login utenti e una Dashboard admin collegate a **Firebase** (Authentication + Firestore).

Ricreato a partire da una registrazione video del sito originale (site123.me), con la stessa struttura di pagine, testi e identità visiva (tema scuro, accento verde lime + viola).

## Struttura del progetto

```
gaming-relax/
├── index.html              Home (testi hero modificabili da Dashboard)
├── store.html               Store — prodotti caricati in automatico da Firestore
├── custom.html               Percorso "crea la tua tastiera custom"
├── art.html                  Galleria opere / keycaps artisan
├── team.html                  Team — membri caricati in automatico da Firestore
├── contatti.html               Form contatti
├── faq.html                    Domande frequenti
├── privacy.html                 Privacy Policy
├── termini.html                 Termini e Condizioni
├── login.html                   Accesso utenti / staff
├── register.html                 Registrazione nuovo utente
├── dashboard.html                 Pannello admin (solo staff)
├── firestore.rules.txt             Regole di sicurezza da incollare in Firebase
├── css/style.css                   Tutti gli stili del sito
└── js/
    ├── script.js                   Menu mobile, FAQ accordion, form contatti
    ├── firebase-config.js           Le TUE chiavi Firebase (già inserite)
    ├── firebase-init.js             Inizializza Firebase
    ├── auth.js                      Login, registrazione, logout, menu account
    ├── dashboard.js                 Logica del pannello admin
    ├── store-dynamic.js             Collega lo Store ai prodotti su Firestore
    ├── team-dynamic.js              Collega la pagina Team a Firestore
    └── content-dynamic.js            Applica testi e colori personalizzati su ogni pagina
```

## Come funziona il sistema di accesso

- **Chiunque** può registrarsi da `register.html` con la propria email e una password a scelta (minimo 6 caratteri). Un utente normale, dopo il login, non vede la Dashboard.
- **Solo l'account staff** — email `gamingrelaxadmin@gmail.com`, password impostata da te in Firebase — dopo il login viene reindirizzato automaticamente a `dashboard.html`, dove può:
  - **Prodotti**: aggiungere, modificare, eliminare prodotti. Compaiono in automatico nello Store, per tutti i visitatori.
  - **Team**: aggiungere, modificare, eliminare membri del team. Compaiono in automatico nella pagina Team.
  - **Contenuti Home**: modificare titolo, sottotitolo e testo del pulsante nella sezione hero della Home.
  - **Testi delle pagine**: selezionare qualsiasi pagina (Home, Store, Custom, Art, Team, Contatti) da un menu a tendina e modificarne titoli e testi principali, senza toccare codice.
  - **Aspetto grafico**: cambiare i colori usati in tutto il sito (con anteprima dal vivo) e impostare un logo personalizzato (via URL) senza dover ricaricare file su GitHub — si applicano subito su ogni pagina.
  - **Statistiche rapide**: in cima alla Dashboard, un riepilogo con il numero di prodotti e membri del team pubblicati, più un link per aprire il sito online.
  - **Ricerca**: nelle liste Prodotti e Team, una barra di ricerca per trovare rapidamente un elemento quando la lista cresce.

Il sito include anche una funzione **Preferiti** nello Store: chiunque (anche senza account) può salvare i prodotti che gli interessano cliccando sul cuore — restano salvati nel browser. Chi effettua il login li ritrova automaticamente anche su un altro dispositivo, perché vengono sincronizzati in modo sicuro su Firestore (ogni utente vede e modifica solo i propri preferiti, mai quelli di altri).

⚠️ **Importante sulla sicurezza**: l'email admin è visibile nel codice (è scritta in `js/firebase-config.js` e `js/auth.js`) — questo è normale e non è un problema, perché **non basta conoscerla** per accedere alla Dashboard: serve anche la password corretta, verificata da Firebase Authentication, e le regole di Firestore (vedi sotto) impediscono comunque a chiunque altro di scrivere nel database anche se scoprisse l'email.

## Configurazione già fatta

Il progetto Firebase `gaming-relax` è già collegato in `js/firebase-config.js`. Se in futuro crei un nuovo progetto Firebase, dovrai solo aggiornare quei valori (li trovi in Console Firebase → Project settings → Your apps).

### Cosa devi ancora fare tu, una volta sola

1. **Incolla le regole di sicurezza**: apri `firestore.rules.txt`, copia tutto il contenuto, vai su Console Firebase → Firestore Database → scheda "Regole", incolla e clicca "Pubblica". Senza questo passaggio lo Store e la Dashboard non funzioneranno correttamente (le richieste di lettura/scrittura verranno rifiutate).
2. **Verifica che l'utente admin esista**: Console Firebase → Authentication → Users → deve comparire `gamingrelaxadmin@gmail.com`. Se non c'è, clicca "Add user" e crealo con la password che vuoi usare.
3. **Autorizza il dominio del sito**: Console Firebase → Authentication → Settings → "Authorized domains" → aggiungi il dominio dove pubblicherai il sito (es. `<tuo-utente>.github.io`). Senza questo passaggio il login non funzionerà una volta online (in locale con `localhost` funziona già).

## Come pubblicarlo su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `gaming-relax`).
2. Carica tutti i file di questa cartella nella root del repository.
3. Vai su **Settings → Pages**.
4. In "Source" seleziona il branch `main` e la cartella `/ (root)`.
5. Salva: dopo qualche minuto il sito sarà online su `https://<tuo-utente>.github.io/gaming-relax/`.
6. Non dimenticare il punto 3 sopra (autorizzare il dominio in Firebase), altrimenti login e registrazione daranno errore online.

## Aspetto grafico e testi delle pagine

Nella Dashboard, oltre a Prodotti e Team, ci sono due sezioni pensate per modificare il sito senza toccare il codice:

- **Testi delle pagine**: scegli una pagina dal menu a tendina (Home, Store, Custom, Art, Team, Contatti) e modifica titolo, sottotitolo e altri testi principali di quella pagina. Ogni pagina ha i suoi campi specifici.
- **Aspetto grafico**: cambia i colori globali del sito (colore principale, colore secondario, sfondo, sfondo alternativo, sfondo delle card) con dei selettori colore. Si applicano subito a tutte le pagine.

**Cosa NON è (ancora) modificabile da qui**: i testi delle card di dettaglio (es. le singole voci della sezione "I nostri lavori / Custom / Opere / Team" in Home, i passaggi della pagina Custom, le domande della FAQ, i testi legali di Privacy/Termini). Il sistema è costruito per essere esteso: per rendere modificabile un nuovo testo, si aggiunge l'attributo `data-edit="nomecampo"` all'elemento HTML interessato, si registra il campo in `PAGE_FIELDS` dentro `js/dashboard.js`, e il gioco è fatto — lo stesso identico meccanismo si applica in automatico anche lì.

## Pagamenti (link Stripe per prodotto)

Non c'è un carrello multi-prodotto: ogni prodotto può avere un **link di pagamento Stripe** (creato gratis, senza scrivere codice, dal pannello Stripe → Payment Links). Se un prodotto ha questo link compilato nella Dashboard, nello Store il bottone diventa "Acquista" e porta dritto alla pagina di pagamento sicura di Stripe (carte Visa/Mastercard, PayPal e Revolut Pay, se li attivi nelle impostazioni Stripe). Se il campo è vuoto, resta il bottone "Richiedi" che porta al form Contatti — utile per servizi su preventivo o prodotti ancora da configurare.

Passaggi: crea un account su [stripe.com](https://stripe.com), attiva i metodi di pagamento che vuoi in Impostazioni → Payment methods, crea un link di pagamento per prodotto da Payment Links, e incolla l'URL nel campo "Link di pagamento Stripe" di quel prodotto nella Dashboard.

**Consiglio**: su ogni Payment Link, in "After payment" (dopo il pagamento), imposta il reindirizzamento a `https://gamingrelaxofficials.it/grazie.html` invece della pagina di conferma generica di Stripe — è una pagina di ringraziamento con lo stile del sito, già pronta.

## Novità in questo aggiornamento

- **FAQ gestibili dalla Dashboard** (nuova tab "FAQ"): domanda, risposta e un numero d'ordine. La pagina `faq.html` ora parte vuota — ri-aggiungi le domande che vuoi tramite la Dashboard (2 minuti). Le 5 domande originali, se vuoi ripartire da quelle: "Quali sono i tempi di consegna per una tastiera custom?", "Come funziona la licenza per i Bot Discord sviluppati da voi?", "Come posso ricevere supporto per un prodotto acquistato?", "Effettuate modding su tastiere pre-assemblate?", "Posso richiedere un design grafico su misura per il mio server?".
- **Preferiti nello Store**: chiunque (anche senza account) salva prodotti cliccando il cuore ♡ — restano nel browser. Chi fa login li ritrova anche su un altro dispositivo (sincronizzati su Firestore, ogni utente vede solo i propri).
- **Badge "Novità"** automatico sui prodotti aggiunti negli ultimi 14 giorni.
- **Barra di fiducia** nello Store (pagamento sicuro, fatto a mano, spedizione tracciata, assistenza Discord).
- **Pulsante Discord flottante** in basso a sinistra su tutto il sito.
- **Banner informativo cookie** (mostrato una sola volta per visitatore).
- **Pagina di ringraziamento** (`grazie.html`) dopo un acquisto — vedi sopra come collegarla a Stripe.
- **Esperienza visiva**: fade-in delle sezioni scorrendo la pagina, bagliore al passaggio del mouse sulle card, pulsante "torna su", pagina 404 personalizzata.
- **Dashboard più gestibile**: statistiche rapide (numero prodotti/team), barra di ricerca nelle liste, anteprima colori dal vivo, logo personalizzabile via URL senza toccare GitHub.
- **Contatti & Social gestibili dalla Dashboard** (nuova tab): email di supporto, orari, e i 4 link social (Discord, YouTube, Instagram, TikTok) si modificano da lì e si aggiornano subito su tutte le pagine — utile quando cambi canale o email in futuro, senza dover più toccare il codice.
- **Galleria Art gestibile dalla Dashboard** (nuova tab "Galleria Art"): aggiungi/modifica/elimina foto (URL immagine + didascalia), compaiono subito nella pagina Art. La pagina parte vuota — se vuoi ripartire dai placeholder originali, il testo lo trovi nella cronologia di questo progetto.
- **Voucher — registro interno** (nuova tab "Voucher"): crea codici voucher, assegnali a uno staffer o creator, indica sconto e note. **Importante**: questo è solo un archivio interno per tenere traccia di chi ha quale codice — non applica lo sconto da solo. Per far funzionare davvero lo sconto al pagamento, devi anche creare lo stesso codice come "Promotion code" su Stripe (Stripe Dashboard → Product catalog → Coupons, poi Payment Links → il tuo link → abilita "Allow promotion codes"). Il registro nella tua Dashboard e il codice su Stripe sono due cose separate che vanno tenute sincronizzate manualmente.
- **Richieste dal form Contatti, salvate davvero** (nuova tab "Richieste"): ogni volta che qualcuno compila il form in `contatti.html`, il messaggio arriva nella Dashboard — con filtri "Nuove/Gestite", ricerca, e un contatore nelle statistiche in cima. Prima era solo un messaggio finto, ora è reale.
- **Galleria Art con categorie filtrabili**: ogni foto ha ora anche una categoria (Tastiere Custom, Keycaps, Setup & RGB, Grafica/Identità visiva), scelta dalla Dashboard. Nella pagina Art i visitatori possono filtrare per categoria, come già succede nello Store e nel Team.
- **Sfondi personalizzati per pagina**: nella tab "Testi delle pagine" della Dashboard, ogni pagina (Home, Store, Custom, Art, Team, Contatti) ha ora anche un campo "Immagine di sfondo della pagina" — incolla l'URL di una tua foto e sostituirà lo sfondo grafico predefinito nella sezione in cima a quella pagina.
- **Nuova pagina "Novità"** (`novita.html`, aggiunta al menu di navigazione): un feed di annunci — nuovi prodotti, aggiornamenti dello Store, comunicazioni ai clienti. Si gestisce dalla Dashboard (nuova tab "Novità"): titolo, immagine opzionale, testo — pubblichi e appare subito in cima al feed, più recenti prima. Anche i testi della pagina (titolo, sottotitolo, sfondo) sono modificabili dalla tab "Testi delle pagine", come le altre.
- **Pagina prodotto dedicata** (`prodotto.html?id=...`): ogni prodotto ha ora una sua pagina, raggiungibile cliccando il nome o l'immagine nello Store, con un invito a leggere o lasciare una recensione sulla pagina Recensioni.
- **Recensioni con foto — un solo punto di raccolta**: le recensioni si lasciano esclusivamente dalla pagina "Recensioni" (raggiungibile dalla card 04 della Home o dal menu) — nome, stelle (1-5), testo e opzionalmente l'URL di una foto del setup. **Non compaiono subito**: partono "in attesa" e vanno approvate dalla Dashboard (tab "Recensioni") prima di diventare pubbliche, per proteggerti da spam o contenuti inappropriati. Una volta approvate, appaiono automaticamente e per tutti nella pagina pubblica — non serve altro. Puoi approvare, rimuovere una pubblicazione, o eliminare definitivamente.
- **Avviso "Torna disponibile" per i prodotti esauriti**: nel form Prodotti della Dashboard c'è ora una casella "Disponibile in Store" — togliendo la spunta, quel prodotto mostra "Esaurito" nello Store al posto del bottone di acquisto, con un pulsante "Avvisami 🔔" dove il cliente lascia la sua email. Le iscrizioni si vedono nella nuova tab "Avvisi Restock": quando rifai il drop, hai lì l'elenco di chi contattare (l'invio dell'email resta manuale, non è automatico).
- **Pagina "Recensioni" generale** (`recensioni.html`, raggiungibile dal menu e dalla card 04 della Home, dove prima c'era Team): mostra la media stelle e tutte le recensioni approvate di qualsiasi prodotto, più un form per lasciarne una nuova senza dover passare dalla pagina di un prodotto specifico. Anche queste recensioni passano dalla moderazione nella tab "Recensioni" della Dashboard, esattamente come quelle lasciate sulle singole pagine prodotto — è lo stesso archivio, distinto solo dal fatto che qui il campo "prodotto" è libero o assente.

⚠️ **Nota tecnica sulle Recensioni**: la prima volta che qualcuno apre la pagina di un prodotto con recensioni, Firestore potrebbe richiedere una piccola configurazione automatica ("indice composito") — se succede, nella Console del browser (F12) comparirà un errore con un link diretto: clicca quel link, Firebase crea l'indice da solo in circa un minuto, poi tutto funziona normalmente. Capita una sola volta.

## Cosa completare prima di andare online

- **Immagini reali**: logo, foto team, foto prodotti, galleria Art. Nella Dashboard i campi "URL immagine" accettano un link diretto a un'immagine (puoi caricarla su un servizio come Imgur, o su un tuo hosting, e incollare qui il link).
- **Pagamenti reali nello Store**: vedi la sezione dedicata sopra ("Pagamenti (link Stripe per prodotto)").
- **Form contatti** (`contatti.html`): al momento mostra solo un messaggio di conferma, senza inviare nulla. Collegalo a [Formspree](https://formspree.io) o [EmailJS](https://www.emailjs.com), oppure a un tuo backend.
- **Link social**: sostituisci i link `#` di Discord, YouTube, Instagram, TikTok con quelli reali.
- **Testi legali**: Privacy Policy e Termini sono indicativi — fatti revisionare da un professionista prima della pubblicazione (nota anche che ora il sito raccoglie account utente: la Privacy Policy andrebbe aggiornata per menzionarlo esplicitamente).

## Estendere la Dashboard ad altre pagine

Il pattern usato per Prodotti / Team / Testi delle pagine è sempre lo stesso: una collezione o un documento Firestore + un form nella Dashboard che scrive lì + uno script "dinamico" nella pagina pubblica che lo legge (per i testi, è `js/content-dynamic.js`, che funziona su tutte le pagine tramite gli attributi `data-page` e `data-edit` nell'HTML).

## Personalizzazione rapida

- Colori: variabili CSS in cima a `css/style.css` (`--lime`, `--purple`, `--bg`…).
- Font: Space Grotesk (titoli) + Inter (testo), caricati da Google Fonts.
- Menu e footer sono ripetuti in ogni pagina HTML (sito statico semplice, senza componenti); se in futuro vuoi evitare di modificare ogni file singolarmente, valuta un framework come Astro o degli include lato build.
