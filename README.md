# Tracker Web DT v6_bis

Versione web (HTML/CSS/JavaScript, nessuna dipendenza) per l'analisi video di moti e per simulazioni con sistemi di riferimento, ispirata a Tracker.

La v6_bis parte dalla v6 e rende più leggibili e controllabili le procedure automatiche, i grafici, le tabelle, la registrazione video e la scelta del sistema di riferimento con cui osservare il moto.

## Novità della v6_bis

### Procedure automatiche più lente e visibili
- Selettore **Velocità delle procedure automatiche**: Istantaneo, Rapido, Normale, Lento, Molto lento.
- Vale per **Auto traccia** e **Rileva intervallo**.
- Il default è **Lento** (90 ms/frame): il punto avanza frame per frame e si vede cosa sta succedendo.
- Il pannello di avanzamento mostra la percentuale e permette di **annullare**.

### Grafici interpolati
- Pulsante **Interpola** nella scheda **Analisi**: attiva una curva morbida su tutti i grafici (spazio-tempo, velocità-tempo, energia-tempo).
- I dati vengono prima levigati e poi uniti con curve Catmull-Rom, così il grafico non appare a gradini.
- Il pulsante mostra **Interpolato**; premi di nuovo per tornare ai segmenti.

### Tabelle modificabili
- Le celle di `x`, `y`, `vx`, `vy`, `KE` e `PE` sono modificabili: clicca, scrivi e premi Invio.
- I valori modificati sono evidenziati in ambra.
- **Ripristina** rimette i valori originali di quella tabella.
- Le modifiche a posizione e velocità aggiornano grafici, sovrapposizione e valori derivati.

### Scelta del sistema di riferimento della vista
- **Visualizzazione del moto → Mostra i corpi rispetto a**: sistema principale **S1**, secondo sistema **S2** o **laboratorio fisso**.
- Cambiare vista ricalcola posizioni, grafici, tabelle, scala e calibrazione nel sistema osservato, senza modificare i parametri del moto.
- Esempio: un corpo in caduta libera dentro un sistema inerziale in moto appare verticale rispetto a S2, ma parabolico rispetto al laboratorio fisso.
- La vista scelta viene salvata nel progetto e nell'autosalvataggio.

### Video simulato con velocità regolabile
- Selettore **Velocità video**: `0,25×`, `0,5×`, `1×`, `2×`, `4×`.
- `0,25×` rallenta la registrazione (impiega quattro volte la durata della simulazione) e produce un video più lento da osservare.
- Il pulsante **Video simulato** mostra l'avanzamento percentuale.
- Formato preferito **MP4** (H.264) quando supportato; altrimenti **WebM**.

### Forze e moto composto
- Ogni corpo può avere **massa**, forze `Fx`/`Fy` e accelerazioni aggiuntive `ax`/`ay`.
- Le forze producono un'accelerazione `F/m`; `g = 9,81 m/s²` si aggiunge solo se **Applica g** è attivo.
- Esempio: velocità iniziale lungo y e forza lungo x producono un moto parabolico nel laboratorio.

### Nome e riferimenti
- Il software si chiama **Tracker Web DT** in interfaccia, report PDF, README e manuale.
- L'autosalvataggio usa la chiave `trackerweb.dt.v6.autosave`.

## Funzioni dalla v5/v6

### Video
- Apertura da file, drag-and-drop o link `?video=URL`.
- Play/pausa, passo avanti/indietro, slider dei frame, velocità di riproduzione.
- FPS automatici con `requestVideoFrameCallback`, modificabili.
- Rilevamento automatico dell'intervallo di apparizione/scomparsa del corpo.
- Tracciamento manuale, avanzamento automatico, auto traccia con template matching.

### Calibrazione e assi
- Calibrazione con due clic, snap al gradiente e preset (A4, monete, righello, banconota, penna).
- Assi manuali, numerici e automatici.

### Simulazione
- Fino a 2 corpi con tipo di moto, posizione, velocità, accelerazione, raggio/periodo/ampiezza, dimensione e rumore indipendenti.
- Tipi: MRU, MRUA, caduta libera, parabolico, circolare uniforme, armonico, personalizzato.
- Fino a 2 sistemi di riferimento: laboratorio, inerziale in moto rettilineo uniforme, non inerziale accelerato, non inerziale rotante.
- Ogni corpo può essere definito nel sistema principale o nel secondario.

### Energia
- `KE = ½ m |v|²`.
- Potenziale gravitazionale `PE = m g h`.
- Potenziale elastica per il moto armonico.
- Grafico e tabelle KE, PE, E con esportazione CSV.

### PDF e progetto
- Report PDF A4 con metadati, grafici e tabelle.
- Salvataggio/caricamento `.json`.
- Autosalvataggio nel browser.

## Struttura

```
index.html
css/styles.css
js/vision.js   # FPS, rilevamento intervallo, snap, tracking
js/app.js      # stato, UI, intervallo, grafici, simulazione, energia, video, PDF
.nojekyll
```

## Uso locale

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Pubblicazione su GitHub Pages

1. Crea un repository e carica il contenuto di questa cartella (non la cartella stessa).
2. Settings → Pages → Branch `main`, cartella `/ (root)`.
3. Il file `.nojekyll` evita l'elaborazione Jekyll.
4. Apri `https://<utente>.github.io/<repo>/`.

Per aprire un video all'avvio: `?video=https://.../mio-video.mp4` (il server deve consentire CORS).

## Limiti noti

- La simulazione non è un video: non ha FPS rilevati né tracciamento automatico; gli FPS si scelgono nel pannello Simula.
- Il video simulato è registrato in tempo reale diviso per la velocità scelta: una simulazione lunga a `0,25×` richiede molto tempo.
- MP4 dipende dal supporto del browser; altrimenti viene prodotto WebM.
- Il rilevamento automatico dell'intervallo funziona meglio con camera fissa e sfondo stabile.
- L'auto-tracciamento vale solo per i video e assume una camera fissa con buon contrasto.
- Nei sistemi non inerziali l'energia meccanica non è in generale conservata.
- Cambiare vista azzera le modifiche manuali delle tabelle, perché sono riferite al sistema di riferimento precedente.
- I progetti salvati con versioni precedenti possono non avere i dati necessari per cambiare vista: in quel caso rigenera la simulazione.

## Note

- La v1 (`../tracker-web/`), la v2 (`../tracker-web-v2/`), la v3 (`../tracker-web-v3/`), la v4 (`../tracker-web-v4/`), la v5 e la v6 restano invariate.
- I video di esempio di Tracker non sono inclusi per motivi di copyright.
