# Templify UI

Biblioteka HTML-first: serwer dostarcza treść i stan początkowy, CSS wygląd,
JS lokalne zachowanie, a HTMX komunikację i wymianę fragmentów HTML.

Na urządzeniach dotykowych pola tekstowe mają minimum 16 px, również w kompaktowych
narzędziach. Zapobiega to automatycznemu przybliżaniu po skupieniu pola w Safari na
iPhonie. Większe rozmiary tekstu są zachowane, a powiększanie gestem pozostaje dostępne.
Zasada jest częścią wspólnych stylów i obowiązuje również w eksporcie.

## Źródła komponentu

Komentarze dokumentacyjne w HTML są zawsze po angielsku. Wzorzec zaczyna się
opisem z sekcjami `Component`, `Purpose`, `Elements` i `JavaScript behavior`;
eksporter kopiuje go bez zmian.

```text
components/<nazwa>/
  <nazwa>.html    wzorzec z opisem przeznaczenia, elementów i zachowania JS
  <nazwa>.css     style
  client.js      opcjonalny moduł ES, inicjalizujący istniejący HTML
  <nazwa>.js     klasyczne API mount/update dla obecnego workspace
```

Nie ma manifestów komponentów ani konfiguratorów. Shortcuts jest samodzielnym
komponentem edycji skrótów. Role kolorów komponentów są osobnymi dokumentami
`colour-roles.json` używanymi przez generator katalogu kolorów, nie przez eksporter.

## Eksport

### Z przeglądarki

Po `npm ci` i `npm run build` otwórz aplikację przez HTTP i wybierz **Tools → Export**
(`#topschrank.tools.export`). Zaznacz komponenty i kliknij **Download ZIP**.
Wymagane zależności są dołączane automatycznie z opisem przyczyny.
**Select all / Clear selection** obsługują cały wybór; pustego zestawu nie można pobrać.

Narzędzie generuje paczkę lokalnie w przeglądarce. Nie przesyła danych na serwer
i nie wymaga usługi eksportowej. Pierwszy eksport pobiera lokalny kompilator WASM;
następne korzystają z tej samej instancji. Do paczki nie trafia kompilator ani narzędzie.
`ui.css` zawiera aktualną konfigurację wszystkich motywów: kolory, typografię,
parametry ikon, cienie, zaokrąglenia i ustawienia komponentów. Aktywny motyw staje się motywem
początkowym eksportu. Fonty wybrane w motywach są pobierane z Google Fonts i wymagają
połączenia z siecią. Importy i backupy ustawień workspace pozostają w Settings.

`npm run build` generuje `tools/export/dist/` ze źródeł, w tym źródłowy snapshot dla
przeglądarki (nie ręczny rejestr/manifest komponentów). Katalog nie jest wersjonowany;
Docker generuje go podczas budowy. Po zmianie komponentów ponów build. Zarówno CLI,
jak i przeglądarka używają tych samych reguł z `ui/export/project.cjs`.

### Z CLI

W katalogu repozytorium:

```sh
npm ci
npm run export
npm run export -- --components card,tabs --out ./export-selected
```

Domyślnie eksportowane są wszystkie komponenty do `export/`. Katalog docelowy musi
być nowy lub pusty — eksporter nie usuwa i nie nadpisuje istniejącej pracy.

```text
export/
  index.html          prezentacja wszystkich wyeksportowanych komponentów
  ui.css              jeden CSS, wraz ze wspólnymi stylami i motywami
  ui.js               jeden JS, z modułów wybranych komponentów
  htmx.min.js         lokalna, przypięta wersja HTMX
  components/*.html   kopie źródłowych HTML wraz z komentarzami
  licenses/           licencje biblioteki i HTMX
```

Zależności kompozycji wynikają z `data-ui` w HTML (np. Kanban zawiera Card).
Zależności JS/CSS wynikają z importów; esbuild łączy je bez duplikatów.
Konfiguratory, workspace, storage, testy i narzędzia projektowe nie są eksportowane.
Build jest potrzebny do **utworzenia** eksportu, nie do jego używania.

## Użycie w aplikacji

```html
<link rel="stylesheet" href="/assets/ui.css">
<script src="/assets/htmx.min.js" defer></script>
<script src="/assets/ui.js" defer></script>
```

Skopiuj strukturę z `components/*.html` do szablonów backendu i podstaw własne dane.
HTML eksportu nie zawiera składni konkretnego silnika szablonów. Atrybuty `hx-get`,
`hx-post`, `hx-target` i adresy endpointów dodaje aplikacja. Do testowania żądań HTMX
potrzebny jest serwer HTTP; lokalne interakcje nie wymagają backendu.

Identyfikatory HTML muszą być unikalne na stronie: przy powielaniu wzorca zmień
również powiązane `for`, `aria-controls`, `aria-labelledby` i `data-ui-open`.
Obecny kontroler Navigation zachowuje ograniczenie do jednej instancji na dokument
i wymaga pokazanych w jego HTML identyfikatorów.

JS nie zastępuje serwerowej treści komponentu. Może tworzyć elementy pomocnicze,
np. tooltip, chips wyboru lub wskaźniki przeciągania. Moduły rejestrują się przez
`data-ui` i inicjalizują przy starcie oraz `htmx:afterSwap`/`htmx:load`.
`htmx:beforeCleanupElement` usuwa listenery, timery, obserwatory i blokady scrolla.
Wielokrotna inicjalizacja tego samego elementu nie dodaje kolejnych handlerów.

```js
const dialog = document.querySelector('[data-ui="window"]');
const view = Templify.get(dialog);
view.update({ mode: 'side', side: 'left', resizable: true });
view.open();

// Przy ręcznej zmianie DOM poza HTMX:
Templify.destroy(fragment); // przed usunięciem
Templify.init(newFragment); // po wstawieniu
```

Nieinteraktywne komponenty mogą nie mieć instancji JS. Ich dane aktualizuje HTML
serwera. Szczegóły API eksportowego są w komentarzu źródłowego HTML każdego
komponentu; starsze README opisują również kompatybilne klasyczne API `mount()`.

## Weryfikacja

```sh
npm test
npx playwright install chromium
npm run test:browser
```

Testy przeglądarkowe obejmują eksport, podmiany przez prawdziwy HTMX, zachowanie DOM,
Window oraz podglądy workspace. Nie zastępują przeglądu wizualnego wszystkich wariantów.
