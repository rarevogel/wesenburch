#!/bin/sh
# Builds Wesenbuch.apk without Gradle: aapt2 -> javac -> d8/dalvik-exchange -> zipalign -> apksigner.
# ANDROID_JAR=.../android-34.jar KEYSTORE_FILE=wesenbuch.jks KEYSTORE_PASSWORD=... KEY_ALIAS=wesenbuch ./build.sh
set -e
cd "$(dirname "$0")"
: "${ANDROID_JAR:?set ANDROID_JAR to android.jar (API 34)}"
: "${KEYSTORE_FILE:?}"; : "${KEYSTORE_PASSWORD:?}"; : "${KEY_ALIAS:=wesenbuch}"
VERSION_CODE=${VERSION_CODE:-1}; VERSION_NAME=${VERSION_NAME:-1.0}
rm -rf build; mkdir -p build/res build/classes build/dex
aapt2 compile --dir res -o build/res/res.zip
aapt2 link -o build/base.apk -I "$ANDROID_JAR" --manifest AndroidManifest.xml -A assets build/res/res.zip \
  --min-sdk-version 24 --target-sdk-version 35 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" --java build/gen
javac -source 8 -target 8 -nowarn -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" -d build/classes $(find src build/gen -name '*.java')
if command -v d8 >/dev/null; then d8 --min-api 24 --lib "$ANDROID_JAR" --output build/dex $(find build/classes -name '*.class')
else (cd build/classes && dalvik-exchange --dex --min-sdk-version=24 --output=../dex/classes.dex .); fi
cp build/base.apk build/unaligned.apk
(cd build/dex && zip -q ../unaligned.apk classes.dex)
zipalign -f 4 build/unaligned.apk build/aligned.apk
apksigner sign --ks "$KEYSTORE_FILE" --ks-pass "pass:$KEYSTORE_PASSWORD" --ks-key-alias "$KEY_ALIAS" --out Wesenbuch.apk build/aligned.apk
echo "built $(pwd)/Wesenbuch.apk"
