# limit-anzeige

Ein Mod für Claude Code. Er zeigt über dem Eingabefeld eine Zeile mit farbigen Balken: wie viel vom 5-Stunden-Limit und vom Wochenlimit verbraucht ist. Beim 5-Stunden-Limit steht dazu, wann es wieder frei wird.

- Farben: grün, ab 70 % gelb, ab 90 % rot; ab 97 % zusätzlich „⚠️ FAST AUFGEBRAUCHT!“
- Beim Start eines Chats zeigt die Zeile grau die zuletzt bekannten Werte („zuletzt HH:MM“), nach der ersten Antwort die aktuellen.
- Die Balken passen sich der Breite an, die Zeile steht mittig.

## Installieren

In einer Claude-Code-Sitzung im Terminal eingeben:

```
/plugin install limit-anzeige --marketplace Plaste72/limit-anzeige
```

Dann `y`, um den Marktplatz hinzuzufügen, und als Bereich „user“ wählen (gilt für alle Projekte).
Das Repository ist privat: Auf dem Rechner muss GitHub mit einem Konto mit Zugriff eingerichtet sein.
