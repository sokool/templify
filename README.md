# Templify

Templify służy do komponowania interfejsów oraz dostosowywania komponentów i theme
(look and feel) do potrzeb użytkownika. Wykorzystuje do tego komponenty, ich
konfiguratory oraz wspólne narzędzia projektowe.

Docelowo pozwoli eksportować komponenty, ustawienia i theme do wykorzystania przy
budowie innych aplikacji. **Docelowe technologie i formaty eksportu nie są jeszcze
ustalone.** Decyzje te podejmiemy osobno; obecny podział kodu ma zachować możliwość
eksportu, a nie przesądzać jego implementację.

Templify rysuje własny interfejs tymi samymi komponentami, które udostępnia
użytkownikowi. Narzędzia i konfiguratory nie mają osobnego, równoległego zestawu UI.

## Uruchomienie

Otwórz [app/index.html](app/index.html) w przeglądarce. Można też udostępnić katalog
repozytorium przez dowolny serwer statyczny. Nie jest wymagany bundler ani instalacja
pakietów. Podgląd fontów Google wymaga połączenia z siecią.

[top-schrank-ui.html](top-schrank-ui.html) pozostaje historycznym playgroundem,
korzystającym ze współdzielonych plików. Główną aplikacją jest `app/`.

## Struktura

```text
ui/
  defaults.css                 domyślne zmienne wyglądu
  primitives.css               bazowe reguły CSS, m.in. focus i box-sizing
  colours/                     role kolorów i logika kolorystyczna
  shadows/                     definicje i obsługa cieni
  themes/                      kontroler motywów
    tokens/                    dokumenty DTCG, walidacja i konwersja
  assets/icons/                SVG, renderer i licencje
  components/<nazwa>/          działający komponent, manifest, dokumentacja, testy
    configurator/              opcjonalny edytor jego ustawień
  tools/                       globalne edytory i przeglądarki
    shared/                    wspólne zaplecze narzędzi i konfiguratorów
  examples/                    samodzielne przykłady integracji
  testing/                     wspólne testy i środowisko testowe
  scripts/                     generatory i kontrole developerskie
app/
  index.html                   wejście do Templify
  workspace/                   menu, routing, kompozycja i podglądy
  storage/                     zapis konfiguracji i sesji, adaptery hosta
```

Nie tworzymy pustych katalogów na zapas. Osobne obszary typografii, odstępów lub
lokalnych plików fontów powstaną, kiedy faktycznie będą miały własną zawartość.

## Zasady projektowania

### Komponenty

- Działają bez aplikacji Templify, narzędzi i konfiguratorów.
- Udostępniają jawne API konfiguracji, aktualizacji i zwalniania zasobów.
- Korzystają ze wspólnych zmiennych CSS; lokalne nadpisania mają określony zakres.
- Nie importują konfiguratorów, narzędzi ani kodu aplikacji.
- Nie odczytują samodzielnie pamięci przeglądarki ani globalnych ustawień aplikacji.
  Ustawienia i zależności dostarcza host.
- Komponenty mogą korzystać z innych komponentów Templify przez ich publiczne API
  lub jawnie przekazany renderer. Zależności są jawne, zadeklarowane w manifeście
  i nie tworzą cykli.
- Strona każdego komponentu w Templify musi zawierać sekcję „Używane komponenty”:
  listę komponentów, z których korzysta, krótki opis ich zastosowania oraz linki
  do ich stron w Templify. Jeśli nie korzysta z innych komponentów, sekcja musi
  to jasno wskazywać.
- Dane demonstracyjne, routing i logika edytora pozostają poza kodem komponentu.
- Dostępność, klawiatura, focus, responsywność i poprawne sprzątanie po demontażu
  są częścią projektu, a nie dodatkiem.

### Konfiguratory

- Edytują konkretny komponent i mieszkają w jego katalogu `configurator/`.
- Korzystają z publicznego API i udokumentowanych zmiennych CSS, a nie z prywatnej
  struktury DOM komponentu.
- Podgląd jest rzeczywistym komponentem, nie jego skopiowaną implementacją.
- Muszą budować swój interfejs z komponentów Templify i korzystać ze wspólnych
  narzędzi, zamiast tworzyć własne odpowiedniki kontrolek lub kopiować ich kod.
- Oddzielają konfigurację komponentu od stanu sesji i preferencji podglądu.
- Są ładowane jawnie przez hosta i nie należą do produkcyjnego eksportu komponentu.
- Kompaktowy wygląd panelu edycyjnego nie może zmieniać wymiarów ani typografii
  prezentowanego komponentu.

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

Wyjątkiem lokalizacyjnym jest `components/*/configurator/`: bliskość plików nie
oznacza zależności komponentu od konfiguratora. Granicę określają API i manifest.

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
- Przenoszenie katalogów nie zmienia automatycznie identyfikatorów, publicznych
  nazw JS, schematów ani kluczy zapisanych ustawień.

### Granica eksportu

Manifest komponentu opisuje wymagane pliki i zależności. Przyszły eksport powinien
uwzględniać ich sumę bez duplikowania współdzielonych zasobów, a pomijać
konfiguratory, narzędzia, przykłady i stan sesji Templify.

Nie zakładamy jeszcze frameworka, platformy ani formatu paczki. Istniejące funkcje
eksportowania konfiguracji lub CSS nie stanowią decyzji o docelowym eksporcie
kompletnego interfejsu.

## Menu a katalogi

Menu grupuje zadania użytkownika, nie ścieżki kodu:

- **Theme:** Colours, Typography, Icons and Glyphs, Shadows.
- **Components:** komponenty i ich konfiguracja.
- **Tools:** Contrast checker, Palette picker.
- **Settings:** ustawienia aplikacji i istniejące operacje na konfiguracji.

Desktop / Tablet / Mobile, przełączanie aktywnego motywu i zwijanie sidebara są
kontrolkami workspace, nie osobnymi obszarami biblioteki.

## Weryfikacja

```sh
node ui/scripts/check.cjs
node ui/scripts/build-colour-roles.cjs
node ui/scripts/build-defaults.cjs
```

Testy obejmują zachowanie, ścieżki, manifesty i granice zależności. Weryfikacja
wizualna, rzeczywisty layout i interakcje przeglądarkowe wymagają osobnego sprawdzenia.

### Znane problemy sprzed reorganizacji

- Test Navigation „fold and unfold retain the open submenu in both presentations”
  nie przechodzi również na wersji sprzed przenosin.
- Historyczny `top-schrank-ui.html` zgłasza `menuScrollResizeObserver is not defined`.
  Problem nie występuje przy uruchamianiu głównej aplikacji `app/index.html`.
