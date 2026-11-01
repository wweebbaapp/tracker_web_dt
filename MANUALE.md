# Tracker Web DT — Manuale rapido delle procedure

Guida operativa essenziale. Per l'elenco completo delle funzioni vedi `README.md`.

## 1. Avvio

### In locale
```bash
cd tracker-web-v6_bis
python3 -m http.server 8000
```
Apri `http://localhost:8000`.

### Su GitHub Pages
1. Carica il contenuto della cartella in un repository.
2. Settings → Pages → Branch `main`, cartella `/ (root)`.
3. Apri `https://<utente>.github.io/<repo>/`.

Non servono installazioni: l'app è composta da HTML, CSS e JavaScript.

---

## 2. Procedura: analizzare un video

Percorso minimo: **video → FPS → intervallo → calibrazione → assi → traccia → analisi → export**.

1. Premi **Apri video** e scegli un file, oppure trascinalo nella finestra.
   - In alternativa usa un link: `?video=URL`.
2. Controlla gli **FPS**.
   - L'app prova a rilevarli automaticamente.
   - Sotto il lettore vedi anche `t` del frame corrente e `Δt = 1/FPS`.
3. Controlla l'**intervallo di analisi**.
   - Viene rilevato automaticamente: l'app cerca il momento in cui il corpo compare e quello in cui scompare.
   - La barra dell'intervallo è sia nella scheda **Intervallo** sia sotto il lettore: sono sincronizzate.
   - **Rileva intervallo**: ripete il rilevamento automatico.
   - La velocità delle procedure automatiche si regola nella scheda **Traccia** (selettore **Velocità delle procedure automatiche**). Il default è **Lento** (90 ms/frame) e lascia vedere il lavoro frame per frame; **Annulla** interrompe.
   - **Cursori** o campi **Inizio/Fine**: correzione manuale.
   - **Reset**: riporta l'intervallo a tutto il video.
   - **Play**, **⏮** e **⏭** riproducono e spostano il cursore solo nell'intervallo; comandano anche il lettore principale.
   - Il selettore **Velocità** (`−4×`…`4×`) rallenta o velocizza la riproduzione; i valori negativi indicano rallentamento (es. `−2×` = metà velocità).
4. **Calibra** la scala.
   - Vai nella scheda **Calibra**.
   - Scegli un preset (A4, monete, righello, banconota, penna) oppure inserisci la misura.
   - Clicca i due estremi dell'oggetto di misura noto.
   - Inserisci la lunghezza reale in metri.
   - Lo snap al bordo è attivo se selezionato; per un nuovo bordo premi **Reimposta**.
5. Imposta gli **assi**.
   - Vai nella scheda **Assi**.
   - **Posiziona col mouse**: clicca l'origine; trascina per ruotare l'asse x.
   - Oppure inserisci **X**, **Y**, **Angolo** e premi **Applica**.
   - **Auto**: origine sul corpo tracciato e asse x parallelo al moto.
6. **Traccia** il punto.
   - Vai nella scheda **Traccia**.
   - **+ Aggiungi punto** crea un punto; selezionalo nella lista.
   - Clicca sul corpo nel frame corrente: il punto viene salvato e il cursore passa automaticamente al frame successivo.
   - L'opzione **Avanza al frame successivo dopo ogni clic** è attiva per default; disattivala se vuoi più punti sullo stesso frame.
   - **Moto** attiva la cattura continua: un clic per frame fino alla fine dell'intervallo.
   - **Auto traccia** (solo video) segue il corpo dal punto marcato nel frame corrente. Porta il cursore su un frame in cui il corpo è visibile, cliccalo, poi premi Auto traccia.
   - Il selettore **Velocità delle procedure automatiche** rallenta Auto traccia e Rileva intervallo: scegli **Lento** o **Molto lento** per seguire visivamente il punto che avanza.
7. Controlla i risultati nella scheda **Analisi**.
   - **Spazio-tempo**: x, y; dal menu puoi mettere il **tempo in ascisse** o in **ordinate**.
   - **Velocità-tempo**: vx, vy, |v|.
   - **Energia**: KE, PE, E.
   - L'asse del tempo copre esattamente l'intervallo selezionato.
   - **Interpola** rende i tre grafici più lisci e uniformi: utile per riconoscere a colpo d'occhio il tipo di moto. Premi di nuovo per tornare ai segmenti.
   - Le celle delle tabelle sono **modificabili**: clicca un valore, scrivilo e premi Invio. I valori corretti sono evidenziati in ambra. **Ripristina** rimette i valori originali di quella tabella.
8. Esporta.
   - **CSV** su ciascun grafico per i dati di quella sezione.
   - **PDF** in alto per il report completo.
   - **Salva** per il progetto `.json`.

---

## 3. Procedura: simulazione senza video

1. Apri la scheda **Simula**.
2. Scegli il tipo di moto del **Corpo 1**:
   - MRU
   - MRUA
   - caduta libera
   - parabolico
   - circolare uniforme
   - armonico
   - **Personalizzato**: imposti direttamente `vx₀`, `vy₀`, `ax`, `ay`
3. Imposta i parametri richiesti.
   - **Applica g**: attiva o disattiva la gravità `9,81 m/s²` (per caduta e parabolico è attiva di default).
   - **ax**, **ay**: accelerazione aggiuntiva lungo i due assi.
   - **Massa**, **Fx**, **Fy**: le forze producono un'accelerazione `F/m`; si sommano ad `ax`/`ay` e a `g`.
4. Scegli il **Sistema di riferimento del corpo**: **Principale** oppure **Secondario (S2)**.
   - Il moto viene calcolato nel sistema scelto e poi trasformato per la scena.
   - Per usare **Secondario** devi prima attivare il secondo sistema di riferimento.
5. Se vuoi, attiva **Aggiungi un secondo corpo in movimento** e configuralo allo stesso modo.
6. Imposta **Durata**, **FPS**, **Corpo** e **Rumore** per ciascun corpo.
   - Rumore `0`: dati esatti.
   - Rumore maggiore di `0`: errore casuale in pixel.
7. Scegli il **sistema di riferimento principale** (vedi sezione 4).
8. Se vuoi, attiva il **secondo sistema di riferimento** e configuralo.
9. Scegli **Mostra i corpi rispetto a**: sistema principale **S1**, secondo sistema **S2** o **laboratorio fisso**. La scelta ricalcola posizioni, grafici e tabelle nel sistema osservato, senza cambiare i parametri del moto.
10. Imposta la **Velocità video** per la registrazione: `0,25×` rallenta fino a quattro volte, `4×` velocizza. Vale solo per **Video simulato**.
11. Premi **Genera simulazione**.
   - In alternativa **Esempio** carica valori tipici mantenendo durata, FPS, corpi e rumore.
12. La scena virtuale e i dati vengono creati automaticamente.
   - Assi, scala e calibrazione sono già impostati.
   - Auto traccia e rilevamento automatico dell'intervallo non sono disponibili: i dati sono già esatti.
   - Per analizzare il secondo corpo selezionalo nella lista della scheda **Traccia**.

Esempio di forza: scegli **Personalizzato**, metti `vx₀ = 0`, `vy₀ = 6`, `Fx = 4 N` con massa `1 kg` e `Fy = 0`. Il corpo parte lungo y e la forza lungo x lo incurva: nella vista del laboratorio il moto risultante è parabolico.

---

## 4. Procedura: scegliere i sistemi di riferimento

Nel pannello **Simula**:

### Sistema principale

| Tipo | Significato | Parametri |
|---|---|---|
| Laboratorio | Sistema inerziale di riferimento | nessuno |
| In moto rettilineo uniforme | Sistema inerziale traslato | `Vx`, `Vy` |
| Accelerato | Sistema non inerziale | `Ax`, `Ay` |
| Rotante | Sistema non inerziale | `ω` |

I dati, la griglia e i corpi sono mostrati nel sistema principale scelto.

### Secondo sistema (opzionale)

- Attiva **Sovrapponi un secondo sistema di riferimento**.
- Scegli tra inerziale in moto rettilineo uniforme, non inerziale accelerato, rotante o laboratorio.
- Gli assi del secondo sistema sono disegnati tratteggiati e marcati `S2 X`, `S2 Y`.
- Ogni corpo può essere assegnato al sistema **Principale** o **Secondario**. Il moto viene calcolato nel sistema assegnato e poi trasformato per la scena e i grafici.
- Esempio: un corpo in caduta libera nel secondo sistema inerziale in moto appare parabolico nel sistema fisso.
- Se un corpo è assegnato al secondario, attiva prima il secondo sistema; altrimenti l'app chiede di scegliere il principale.

### Vista del moto

Il selettore **Visualizzazione del moto → Mostra i corpi rispetto a** permette di osservare lo stesso moto da tre punti di vista:

- **Sistema principale (S1)**: dati nel sistema inerziale/non inerziale scelto come principale.
- **Secondo sistema (S2)**: dati nel sistema sovrapposto; utile per mostrare che una caduta libera in S2 è un arco parabolico nel laboratorio.
- **Laboratorio (sistema fisso)**: dati nel sistema fisso, indipendente da S1 e S2.

Cambiare vista non modifica i parametri del corpo: ricalcola solo posizioni, grafici, tabelle, scala e calibrazione della scena. Le eventuali modifiche manuali alle tabelle vengono azzerate perché riferite al sistema precedente. Se la simulazione non include S2, la vista S2 non è disponibile.

Regole utili:
- **Inerziale** = accelerazione nulla, eventualmente con velocità.
- **Non inerziale** = accelerazione diversa da zero (e/o rotazione).
- Nei sistemi accelerati e rotanti compaiono forze apparenti; l'energia meccanica può non conservarsi.

---

## 5. Procedura: analisi dell'energia

Nella scheda **Analisi**, sezione **Energia**:

1. Imposta **Massa (kg)** e **g (m/s²)**.
2. Leggi il grafico **KE, PE, E** e la tabella.
3. Usa **CSV** per esportare `frame, t, KE, PE, E`.

Modelli usati:

- Energia cinetica: `KE = ½ m |v|²`.
- Potenziale gravitazionale: `PE = m g h`, con `h` la quota nel sistema del laboratorio e zero sull'asse x tracciato.
- Potenziale elastica per il moto armonico: `PE = ½ k (x − x_eq)²`, con `k = m ω²` e `ω = 2π/periodo`.
- Energia totale: `E = KE + PE`.

Note:

- PE può essere negativa se il corpo si trova sotto la quota di riferimento.
- Nei sistemi non inerziali E può variare: non è un errore di calcolo.
- Massa e g vengono salvati nel progetto e usati anche nel PDF.

---

## 6. Procedura: registrare il video simulato

1. Genera una simulazione.
2. Imposta l'**intervallo di analisi** che vuoi registrare.
3. Scegli la **Velocità video**: `0,25×` rende il file molto lento, `1×` è la velocità normale, `4×` lo velocizza. La registrazione dura `durata / velocità`.
4. Premi **Video simulato**: il pulsante mostra l'avanzamento percentuale.
5. Attendi la fine della registrazione.
6. Il file viene scaricato automaticamente.
   - **MP4** se il browser supporta la registrazione H.264.
   - Altrimenti **WebM** (VP9/VP8).
   - Risoluzione della scena: 960×540.
   - FPS: quelli della simulazione.

Il video contiene griglia, traiettoria, corpi, assi del laboratorio, secondo sistema di riferimento e HUD con tempo.

---

## 7. Procedura: esportare il PDF

1. Apri la scheda **Analisi**.
2. Assicurati che ci siano punti tracciati nell'intervallo e che la calibrazione sia presente.
3. Premi **PDF**.
4. Il report viene scaricato come `<nome>-analisi.pdf`.

Il PDF contiene:

- punto analizzato, sorgente e data;
- sistema di riferimento, massa, g, FPS, intervallo e calibrazione;
- grafici spazio-tempo, velocità-tempo ed energia-tempo;
- tabelle complete dell'intervallo, su più pagine se necessario.

Non usa il dialogo di stampa: il PDF viene generato direttamente dall'app.

---

## 8. Procedura: salvare e ripristinare il lavoro

- **Salva**: scarica un progetto `.json` con punti, calibrazione, assi, intervallo, simulazione, sistemi di riferimento, massa e g.
- **Apri progetto**: carica un `.json` salvato.
- **Autosalvataggio**: l'app salva nel browser con chiave `trackerweb.dt.v6.autosave`; alla riapertura propone il ripristino.
- **Nuovo**: azzera punti, calibrazione, assi e autosalvataggio; riporta massa, g e assi del laboratorio ai valori iniziali.

Per conservare un lavoro importante, usa **Salva**: l'autosalvataggio può essere sovrascritto.

---

## 9. Controlli rapidi prima di esportare

- [ ] Il video o la simulazione è caricato.
- [ ] Gli FPS sono corretti.
- [ ] L'intervallo contiene i frame utili (inizio e fine).
- [ ] La calibrazione è completata.
- [ ] Gli assi hanno l'origine e la direzione desiderate.
- [ ] Il punto attivo ha marcatori nell'intervallo.
- [ ] Massa e g sono corretti.
- [ ] Il grafico dell'energia è coerente con il sistema scelto.

---

## 10. Problemi comuni

| Problema | Controllo |
|---|---|
| Grafici vuoti | Calibrazione assente, nessun punto attivo o nessun marcatore nell'intervallo. |
| Valori in pixel invece che in metri | Calibrazione non completata. |
| Intervallo automatico sbagliato | Correggi con i cursori o Reset; il rilevamento funziona meglio con camera fissa e sfondo stabile. |
| Punti tutti sullo stesso frame | Controlla l'opzione **Avanza al frame successivo** nella scheda Traccia. |
| FPS sbagliati | Imposta il valore manualmente nel campo FPS. |
| Auto traccia imprecisa | Camera non fissa, poco contrasto, corpo piccolo/veloce o punto iniziale errato. |
| Energia non conservata | Sistema accelerato/rotante oppure quota di riferimento degli assi non adatta. |
| PE tutta nulla | Asse x degli assi sovrapposto al moto orizzontale o corpo sulla quota zero. |
| PDF non esportato | Servono almeno un punto tracciato e la calibrazione. |
| Video simulato non disponibile | Genera prima una simulazione; verifica il supporto del browser a `MediaRecorder`. |
| Esce WebM invece di MP4 | Il browser non supporta la registrazione MP4: usa WebM o converti il file. |
| Registrazione lenta | La durata dipende dalla **Velocità video**: usa `1×` o più per ridurla. |
| La vista non cambia | Verifica che la simulazione sia attiva e, per S2, che la simulazione includa il secondo sistema; rigenera se il progetto è vecchio. |
| Grafici ancora a gradini | Premi **Interpola** nella scheda Analisi; controlla anche che l'intervallo e la calibrazione siano corretti. |
| Progetto vecchio non ripristinato | L'autosalvataggio v6 DT usa `trackerweb.dt.v6.autosave`; carica il `.json` salvato. |

---

## 11. Flusso consigliato per una lezione

1. Genera un moto parabolico con rumore `0`.
2. Mostra spazio-tempo e velocità-tempo.
3. Aggiungi un secondo corpo con moto personalizzato (`vx₀`, `vy₀`, `ax`, `ay`).
4. Sovrapponi un secondo sistema di riferimento inerziale o accelerato.
5. Passa a un sistema non inerziale e mostra la trasformazione degli assi.
6. Torna al laboratorio e commenta KE, PE ed E.
7. Esporta il PDF e, se serve, il video simulato in MP4.
8. Salva il progetto per riaprirlo la lezione successiva.
