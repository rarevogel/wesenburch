# Wesenbuch

A field guide to the Wesen and other creatures of the TV series *Grimm* (NBC, 2011–2017): a single web page and an Android app (phone and tablet). A fan reference, not affiliated with NBC or Universal.

    npm install          # fonts: IM Fell English, EB Garamond (@fontsource, OFL)
    python3 build.py     # -> dist/wesenbuch.html and android/assets/index.html
    cd android && ANDROID_JAR=... KEYSTORE_FILE=... KEYSTORE_PASSWORD=... KEY_ALIAS=wesenbuch ./build.sh

- `web/data.js` – creatures and episodes. First appearances follow the “List of Wesen and other creatures” table in Wikipedia’s *List of Grimm characters*; descriptions are written for this project.
- `sketches.txt` – which sketch each creature gets, and its caption.
- `icons/` – source icons from game-icons.net by Lorc, Delapouite, Skoll, Caro Asercion, Cathelineau, DarkZaitzev and Carl Olsen (CC BY 3.0, see icons/license.txt); `icons/own/hippo.svg` is drawn for this project. The pencil look is applied at runtime with SVG filters (`tools/pencil-defs.svg`).
- The keystore is not part of this source.
