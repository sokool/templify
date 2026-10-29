# Templify UI

Wspólna biblioteka interfejsu i narzędzi Templify. Zasady projektowania oraz
docelowe granice eksportu opisuje [główny README](../README.md).

## Warstwy

- `defaults.css`, `primitives.css`: wspólne zmienne CSS i bazowe reguły; ładowane
  raz, przed stylami komponentów.
- `colours/`, `shadows/`, `themes/`: definicje wyglądu i opcjonalny kontroler motywów,
  niezależne od interfejsów edycji.
- `themes/tokens/`: źródłowe dokumenty DTCG oraz ich walidacja i konwersja.
- `assets/icons/`: przenośne SVG, opcjonalny renderer i licencje.
- `components/`: komponenty wraz z manifestami, testami i opcjonalnymi katalogami
  `configurator/`. Kod komponentu nigdy nie importuje konfiguratora.
- `tools/`: globalne edytory, przeglądarki i narzędzia pomocnicze.
- `examples/`: małe, samodzielne demonstracje użycia.
- `testing/`: współdzielone testy i fixtures; poza kodem produkcyjnym.
- `scripts/`: generatory i skrypt uruchamiający testy.

Główna aplikacja jest w [app/index.html](../app/index.html), nie w `examples/`.
Host odpowiada za routing, zapis ustawień i kompozycję publicznych API.

## Komponenty i eksport

Manifest zawiera lokalne `runtimeFiles`, jawne `dependencies` i `exportFiles`.
Ścieżki są względne do katalogu manifestu. Zachowaj układ katalogów podczas
przenoszenia biblioteki; przyszły eksporter może przepisywać ścieżki.

Breadcrumbs i Tabs współdzielą `defaults.css` oraz `primitives.css`; wspólny eksport
potrzebuje sześciu plików runtime: dwóch JS, dwóch CSS komponentów i dwóch CSS
fundamentu. Narzędzia i konfiguratory pozostają poza tą granicą.

Metadane `tool` w istniejących manifestach wskazują teraz `configurator/`.
Nazwa pola i publiczne nazwy JS pozostają zachowane dla kompatybilności.

Nie jest wymagany build do uruchomienia przykładów. Docelowa technologia i format
eksportu kompletnych komponentów oraz theme nie zostały jeszcze ustalone.

## Kontrole

Z katalogu repozytorium: `node ui/scripts/check.cjs`.
