# Templify

Templify służy do komponowania interfejsów oraz dostosowywania komponentów i theme
(look and feel) do potrzeb użytkownika. Wykorzystuje do tego komponenty oraz
wspólne narzędzia projektowe. Konfiguratory komponentów zostały usunięte.

Komponenty można eksportować do HTML-first/HTMX: jeden CSS, jeden JS, lokalny HTMX,
opisane wzorce HTML oraz wspólny `index.html`. Instrukcja i kontrakt:
[ui/README.md](ui/README.md). Generowanie: `npm ci`, następnie `npm run export`.

Templify rysuje własny interfejs tymi samymi komponentami, które udostępnia
użytkownikowi. Narzędzia nie mają osobnego, równoległego zestawu UI.

## Uruchomienie

Przygotuj lokalne zasoby narzędzia Export i udostępnij repozytorium przez serwer statyczny:

```sh
npm ci
npm run build
python3 -m http.server 8080
```

Otwórz `http://localhost:8080/`. **Tools → Export** pozwala wybrać komponenty
i pobrać ZIP bez backendu. Kompilator i ZIP działają w przeglądarce, z lokalnych
zasobów (bez CDN); pierwszy eksport pobiera kompilator WASM. Po zmianach źródeł
komponentów ponów `npm run build`. Pozostałe podglądy można otwierać także przez
[index.html](index.html) jako plik; narzędzie Export wymaga HTTP.
Podgląd fontów Google wymaga połączenia z siecią.

Główna aplikacja ma jedno wejście w katalogu głównym. Kod hosta jest w `workspace/` i `storage/`,
a samodzielne przykłady komponentów w `ui/examples/` nie zależą od aplikacji.

### Instalacja PWA

Templify ma manifest i ikony aplikacji. Po uruchomieniu przez HTTPS (lub lokalnie
przez localhost) wspierana przeglądarka może zaproponować instalację. Nieblokujący
baner pojawia się po 5 sekundach od zamontowania, jeżeli dostępny jest instalator
lub rozpoznano platformę z ręczną instalacją. „Not now” zapamiętuje odrzucenie na
7 dni. Strona **Components → PWA** udostępnia również przycisk i instrukcje.

Ta wersja nie zapewnia działania offline ani push i nie rejestruje service workera.
Własne aplikacje używające eksportu dostarczają własny manifest oraz zapis
preferencji; szczegóły: [PWA](ui/components/pwa/README.md).
Ikony hosta można odtworzyć przez `node ui/scripts/build-pwa-icons.cjs`.

### Kompozycja aplikacji

- `workspace/workspace.js` składa Navigation, Breadcrumbs, routing, podglądy,
  i narzędzia przez ich publiczne API.
- `workspace/` zawiera też dane demonstracyjne i style podglądów stron.
- `workspace/windows.js` składa Window ze wspólnymi ustawieniami scrolla/resize
  i rozmiarami okien zapisywanymi pod stabilnym ID w `preview.windows`, poza eksportem.
- `storage/settings.js` dostarcza wstrzykiwany zapis ustawień;
  `storage/workspace-settings.js` zarządza zakresami i migracją starych kluczy.
  Komponenty runtime nigdy nie importują tych modułów.
- Definicje UI, zasoby, komponenty i narzędzia znajdują się w `ui/`.

Zmiana położenia wejścia nie zmienia istniejących kotwic routingu, kluczy zapisu
ani publicznych nazw JavaScript. Przegląd Theme jest pod `#templify.theme`.

## Wdrożenie

Główny `Dockerfile` przygotowuje zasoby Export w etapie Node, a następnie buduje
statyczny serwer HTTP na porcie kontenera `8080`. W wynikowym obrazie nie ma backendu Node.
Kopiuje `index.html`, `workspace/`, `storage/` i `ui/`; Nginx udostępnia aplikację bezpośrednio pod `/`.
Repozytoryjny `compose.yaml` jest opcjonalny; bez niego Compose generuje centralny
deployer i publikuje port hosta tylko na `127.0.0.1`.

Nowy tag `templify.mintsoft.eu@v1.0.0` uruchamia build, start kontenera i
kontrolę HTTP. Centralny deployer obsługuje istniejącą trasę Cloudflare Tunnel
i DNS dla `templify.mintsoft.eu`.

### Wersja wydania w interfejsie

Przy każdym wydaniu oznaczanym tagiem należy zadbać, aby aplikacja z tego tagu
wyświetlała numer jego wersji w prawym górnym rogu nagłówka, zamiast litery „T”.
Przykład: tag `templify.mintsoft.eu@v1.0.0` oznacza widoczną etykietę `v1.0.0`.
Numer musi odpowiadać wersji faktycznie budowanego wydania, a nie najnowszemu
tagowi w repozytorium. Przed publikacją należy sprawdzić etykietę w obrazie Dockera.

## Struktura

```text
index.html                     wejście do Templify
ui/
  defaults.css                 domyślne zmienne wyglądu
  primitives.css               bazowe reguły CSS, m.in. focus i box-sizing
  colours/                     role kolorów i logika kolorystyczna
  shadows/                     definicje i obsługa cieni
  themes/                      kontroler motywów
    tokens/                    dokumenty DTCG, walidacja i konwersja
  assets/icons/                SVG, renderer i licencje
  components/<nazwa>/          HTML z opisem, CSS, JS, dokumentacja i testy
  runtime/                     inicjalizacja HTML i integracja z HTMX
  tools/                       globalne edytory i przeglądarki
    shared/                    wspólne zaplecze narzędzi
  examples/                    samodzielne przykłady integracji
  testing/                     wspólne testy i środowisko testowe
  scripts/                     generatory i kontrole developerskie
workspace/                     menu, routing, kompozycja i podglądy
storage/                       zapis konfiguracji i sesji, adaptery hosta
```

Nie tworzymy pustych katalogów na zapas. Osobne obszary typografii, odstępów lub
lokalnych plików fontów powstaną, kiedy faktycznie będą miały własną zawartość.

## Zasady projektowania

### Komponenty

- Komentarze dokumentacyjne w HTML komponentów piszemy po angielsku. Każdy wzorzec
  eksportowy zaczyna się sekcjami `Component`, `Purpose`, `Elements` i
  `JavaScript behavior`; eksport kopiuje opis bez zmian ze źródła.
- Działają bez aplikacji Templify, narzędzi i konfiguratorów.
- Udostępniają jawne API konfiguracji, aktualizacji i zwalniania zasobów.
- Korzystają ze wspólnych zmiennych CSS; lokalne nadpisania mają określony zakres.
- Nie importują konfiguratorów, narzędzi ani kodu aplikacji.
- Nie odczytują samodzielnie pamięci przeglądarki ani globalnych ustawień aplikacji.
  Ustawienia i zależności dostarcza host.
- Komponenty mogą korzystać z innych komponentów Templify przez ich publiczne API
  lub jawnie przekazany renderer. Zależności wynikają z importów oraz kompozycji
  HTML (`data-ui`); nie tworzą cykli importów komponentów.
- Strona każdego komponentu w Templify udostępnia „Used components” (używane
  komponenty) w prawym panelu komponentu Window (`mode: 'side'`, `side: 'right'`),
  zamiast stałej sekcji pod podglądem. Panel otwiera pionowa zakładka z ikoną
  i etykietą, przyklejona do prawej krawędzi okna przeglądarki, nie podglądu.
  Zakładka pozostaje na miejscu podczas przewijania i zmiany rozmiaru podglądu;
  układ pozwala dodawać kolejne zakładki paneli. Są to przyciski otwierające okna,
  nie przełączniki ARIA Tabs.
- Panel zawiera listę komponentów z opisami zastosowania i linkami do ich stron
  w Templify. Rozróżnia zależności runtime od kompozycji hosta, konfiguratora
  i zależności pośrednich; brak zależności runtime wskazuje wprost. Panel i jego
  zakładka należą do aplikacji, nie runtime ani eksportu prezentowanego komponentu.
  Escape, przycisk zamknięcia i tło zamykają panel; focus wraca do zakładki.
  Wzorzec jest wdrożony pilotażowo na stronie Kanban, pozostałe strony będą
  dostosowywane osobno. Panel Kanbana jest zawsze nieblokujący (`lockScroll: false`),
  niezależnie od globalnej blokady scrolla Window, aby można było przewijać tablicę.
- Dane demonstracyjne, routing i logika edytora pozostają poza kodem komponentu.
- Dostępność, klawiatura, focus, responsywność i poprawne sprzątanie po demontażu
  są częścią projektu, a nie dodatkiem.

### Narzędzia

- Służą zadaniom ogólnym: edycji kolorów, typografii i cieni, przeglądaniu ikon
  oraz sprawdzaniu kontrastu.
- Muszą budować swój interfejs z komponentów Templify, zamiast tworzyć własne
  odpowiedniki kontrolek lub kopiować ich kod.
- Definicje wyglądu są oddzielone od ich edytorów: np. `ui/shadows/` przechowuje
  definicje, a `ui/tools/shadows/` interfejs do ich zmiany.
- Wspólny kod kontrolek trafia do `ui/tools/shared/` lub do samodzielnego narzędzia
  wielokrotnego użytku, a nie do kopii w każdym konfiguratorze.
- Skrypty generujące pliki należą do `ui/scripts/`, nie do interfejsów narzędzi.
- Sam brak interfejsu nie czyni modułu narzędziem: przetwarzanie DTCG potrzebne
  kontrolerowi motywów pozostaje przy `ui/themes/`, poza narzędziami edycyjnymi.

### Zależności i własny interfejs

Fundament wizualny i zasoby nie zależą od narzędzi ani aplikacji. Kod komponentów
może zależeć od fundamentu i jawnie zadeklarowanych komponentów. Narzędzia oraz
konfiguratory korzystają z komponentów, nigdy odwrotnie. Aplikacja składa całość.

Komponenty nie mają manifestów ani katalogów konfiguratorów. Granicę wyznaczają
źródłowe HTML/CSS i importy modułów zachowania.

Templify używa tego samego kodu komponentów we własnym menu, narzędziach,
konfiguratorach i podglądach. Wykorzystanie we własnej aplikacji nie może
uzależniać komponentu od hosta Templify.

### Theme, konfiguracja i zapis

- Wspólne wartości wizualne należą do theme; zachowanie komponentu do jego opcji.
- Theme zapewnia wartości domyślne. Nadpisania komponentu są jawne i lokalne.
- Dokumenty projektowe używają obsługiwanego profilu DTCG. Komponenty konsumują
  CSS i zwykłe opcje, nie muszą parsować DTCG.
- Nie utrzymujemy niezależnych kopii tych samych wartości. Wygenerowane pliki
  mają wskazane źródło, generator i kontrolę zgodności.
- Host zarządza zapisem i przekazuje potrzebne usługi. Konfiguracja do zapisu
  nie zawiera DOM, funkcji ani obiektów wykonawczych.
- Stan edytora, rozmiar podglądu i przykładowe dane sesji nie należą do konfiguracji
  przeznaczonej do eksportu.
- Ręcznie zmieniony rozmiar Window jest preferencją użytkownika zapisywaną osobno
  dla konkretnego okna (stabilne ID), poza theme i eksportem template. Przywracamy
  go po ponownym otwarciu, nawigacji i odświeżeniu. Dostosowanie do mniejszego ekranu
  nie nadpisuje zapamiętanego rozmiaru. Blokadę scrolla i możliwość ręcznego resize
  ustawia host przez API Window; wyłączenie blokady pozostawia stronę interaktywną.
- Przenoszenie katalogów nie zmienia automatycznie identyfikatorów, publicznych
  nazw JS, schematów ani kluczy zapisanych ustawień.

### Granica eksportu

`ui/scripts/export.cjs` rozpoznaje komponenty po `<nazwa>.html`, zbiera kompozycję
`data-ui` i łączy importy JS/CSS przez esbuild. Wynik nie zależy od workspace,
storage ani narzędzi. HTML kopiowany jest z komentarzami bez składni konkretnego
backendu. Eksport uruchamiany z aplikacji otrzymuje aktualne kolory, typografię,
parametry ikon, cienie i ustawienia komponentów dla wszystkich motywów; aktywny
motyw jest ustawieniem początkowym. HTMX nie jest wbudowany w `ui.js`, lecz
dostarczany osobno.

## Menu a katalogi

Menu grupuje zadania użytkownika, nie ścieżki kodu:

- **Theme:** Colours, Typography, Icons and Glyphs, Shadows.
- **Components:** komponenty i ich konfiguracja.
- **Tools:** Contrast checker, Palette picker, Export.
- **Settings:** ustawienia aplikacji i istniejące operacje na konfiguracji.

Desktop / Tablet / Mobile, przełączanie aktywnego motywu i zwijanie sidebara są
kontrolkami workspace, nie osobnymi obszarami biblioteki.

## Weryfikacja

```sh
npm test
npm run test:browser
node ui/scripts/build-colour-roles.cjs
node ui/scripts/build-defaults.cjs
```

Testy obejmują zachowanie, ścieżki, eksport i granice zależności. Weryfikacja
wizualna, rzeczywisty layout i interakcje przeglądarkowe wymagają osobnego sprawdzenia.

### Znane problemy sprzed reorganizacji

- Test Navigation „fold and unfold retain the open submenu in both presentations”
  nie przechodzi również na wersji sprzed przenosin.
