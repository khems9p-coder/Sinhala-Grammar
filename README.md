# Sinhala Grammar for Beginners: Android app

An offline reader for the whole book (32 lessons, 6 revision tests, 14 appendices) with
search, saved places, dark mode and adjustable text size.

* `www/` is the app itself (plain HTML, CSS and JavaScript, no internet needed).
* `.github/workflows/android.yml` builds the Android files automatically on GitHub.

## Get the APK (no Android Studio needed)

1. Create a new **private** repository on github.com.
2. Upload everything in this folder. With git:
   ```
   git init && git add -A && git commit -m "Sinhala Grammar app"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```
   If you upload through the website, the hidden `.github` folder may not be selectable. In that case choose
   **Add file → Create new file**, type `.github/workflows/android.yml` as the name and paste the contents of
   `android-workflow-copy.yml`.
3. Open the **Actions** tab. The "Build Android app" run starts by itself (about 5 to 8 minutes).
   Use **Run workflow** if it does not.
4. When it turns green, open the run and download **Sinhala-Grammar-APK** from *Artifacts*. Unzip it and
   copy `app-debug.apk` to your phone. Allow "install unknown apps" for your file manager or browser, then tap the file.

This APK is signed with a temporary debug key. It installs and works normally, but Google Play will not accept it.

## For the Play Store (signed release)

1. Make a keystore once (on any computer with Java):
   `keytool -genkey -v -keystore release.jks -alias sinhala -keyalg RSA -keysize 2048 -validity 10000`
   Keep this file and its passwords safe forever. You need the same key for every future update.
2. Turn it into text: `base64 -w0 release.jks` (on Mac: `base64 -i release.jks`).
3. In the repository go to **Settings → Secrets and variables → Actions** and add four secrets:
   `KEYSTORE_BASE64` (the text from step 2), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (for example `sinhala`) and `KEY_PASSWORD`.
4. Run the workflow again. The artifact **Sinhala-Grammar-release** will contain a signed `.aab` (upload this
   to the Play Console) and a signed `.apk`.

## Contact details, privacy policy and terms

* Open `www/config.js` and type your public e-mail address (and website, if any) between the quotes. The About
  screen, the Privacy Policy and the Terms page then show it, and a "Send feedback" button appears.
  It is left empty on purpose so that no address is published without your choice.
* `www/privacy.html` and `www/terms.html` are ready-made pages. The Play Store asks for a web address for the
  privacy policy: turn on GitHub Pages for the repository (Settings, Pages, deploy from the `www` folder or
  copy `www` to a `docs` folder) and use `https://YOUR-NAME.github.io/YOUR-REPO/privacy.html`.

## Try it in a browser first

Serve the `www` folder (for example `python3 -m http.server -d www`) and open it on the phone. In Chrome choose
*Add to Home screen*; it will also work offline.

## Change the book

The lesson pages are in `www/data/ch_*.html`, and the search index is `www/data/search.json`.
If the Word book changes, send me the new file and I will regenerate both.
