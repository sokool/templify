# Theme runtime

`themes.js` to opcjonalny kontroler wspólnego look and feel, bez interfejsu edytora.
Edytory znajdują się w `../tools/`, a kod aplikacji w `../../workspace/` i `../../storage/`.

Kontroler korzysta z `../colours/colour-roles.js`, `../colours/colour-system.js`,
`../shadows/shadows.js`, `../corners/corners.js` i modułów `tokens/`. W przeglądarce należy załadować te
zależności przed kontrolerem; przykład kolejności jest w `../../index.html`.

`DesignSystemThemes.create({target, settings?, storage?, initialTheme?})` tworzy
kontroler dla wskazanego elementu. Host przekazuje zapis ustawień; bez niego
kontroler działa w pamięci. Istniejące nazwy JS i identyfikatory motywów są zachowane.

Komponenty nie muszą importować kontrolera ani DTCG: konsumują zmienne CSS.
`../defaults.css` zawiera domyślne wartości dla użycia bez JavaScriptu motywów;
zgodność z dokumentami domyślnymi kontrolują testy.

`tokens/palette.tokens.json` jest źródłem dokumentu DTCG, a `tokens/defaults.js`
wygenerowaną wersją działającą również przez file://. Generator:
`node ui/scripts/build-defaults.cjs` z katalogu repozytorium.

Zaokrąglenia konfiguruje **Theme → Corners**. Profile i przypisania do grup są
niezależne dla każdego motywu i zapisują się w rozszerzeniu `org.topschrank.corners`.
`setCorners(id, { profiles, assignments })` scala częściową zmianę;
`resetCorners(id)` przywraca całą sekcję. Opcjonalne argumenty `section, key`
pozwalają resetować pojedynczy profil (`profiles`) lub przypisanie (`assignments`).
Eksport CSS i paczki komponentów zawierają zmienne `--ds-radius-*`, bez edytora.
Szczegóły: `../tools/corners/README.md`.
