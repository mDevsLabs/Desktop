# mAI

Super application **bureau et mobile** réunissant l’écosystème mAI.

- **Bureau (Linux, macOS, Windows)** : mAI CLI, mAI Web et mAI Website.
- **Mobile (Android, iOS)** : mAI Web et mAI Website.
- Nom de produit : `mAI`
- Package/application ID : `com.mai.app`

![Logo mAI](assets/icon.png)

## Fonctionnalités

### Bureau

- Plusieurs fenêtres Electron indépendantes (`Ctrl/Cmd + N`).
- Plusieurs onglets par fenêtre (`Ctrl/Cmd + T`).
- Plusieurs vrais terminaux locaux simultanés grâce à `node-pty` et xterm.js.
- Restauration des fenêtres, de leur position, des onglets, de leur ordre et des terminaux.
- Barre terminal : recherche, copier/coller, effacement, taille de police, renommage et duplication.
- Gestionnaire de téléchargements avec progression, annulation, ouverture et affichage dans le dossier.
- Paramètres persistants : thème, notifications, animations et politique de restauration des terminaux.
- Détection de la commande `mai` et de `npm`.
- Installation **après confirmation** avec `npm install -g @mdevs/mai-cli` lorsque nécessaire.
- Intégration isolée de mAI Web et mAI Website avec navigation retour, actualisation et ouverture externe.

### Mobile

- Interface tactile et respect des zones sûres.
- mAI Web et mAI Website, sans accès au terminal local.
- Retour Android, navigation interne et repli vers le navigateur natif.

## Prérequis

- Node.js 22 ou supérieur et npm.
- Pour mAI CLI : Node.js/npm accessibles depuis le shell utilisateur.
- Android : Android Studio/SDK et Java 21.
- iOS : macOS avec Xcode récent et CocoaPods.

## Développement

```bash
npm install
npm run dev:desktop        # application Electron
npm run dev                # interface Web/mobile dans le navigateur
```

Compilation locale :

```bash
npm run lint
npm test
npm run build:desktop      # paquet natif du système courant
npm run cap:sync           # synchroniser Android et iOS
npm run cap:android        # ouvrir Android Studio
npm run cap:ios            # ouvrir Xcode (macOS uniquement)
```

## Organisation

```text
electron/                   processus principal, preload et PTY
src/                        interface React partagée
android/ et ios/            projets Capacitor natifs
assets/                      identité visuelle
.github/workflows/build.yml  CI multiplateforme
```

## Sécurité

Les contenus distants ne reçoivent jamais d’accès à Node.js. Electron utilise `contextIsolation`, un preload à API limitée et une liste blanche contenant uniquement :

- `https://mai-officiel.vercel.app`
- `https://mai-devs.vercel.app`

Les nouvelles fenêtres et navigations externes sont envoyées vers le navigateur système. Les permissions WebView sont refusées par défaut. Le terminal n’est disponible que sur bureau et chaque PTY est détruit avec son onglet ou sa fenêtre.

> Les sites distants peuvent modifier leur politique CSP ou leur comportement. Le bouton « ouvrir dans le navigateur » reste disponible comme solution de repli.

## GitHub Actions

Le workflow comporte trois niveaux :

1. TypeScript et tests.
2. **Linux, Windows et macOS en parallèle**.
3. Après leur réussite, **Android et iOS en parallèle**.

Artefacts produits sans signature : AppImage/DEB, EXE NSIS/portable, DMG/ZIP, APK/AAB, application iOS Simulator et véritable binaire iOS pour appareil (`.app` et `.ipa` non signés).

### Build iOS réel

Le job iOS compile deux cibles Xcode distinctes :

- `generic/platform=iOS Simulator` pour les tests dans Simulator ;
- `generic/platform=iOS` en configuration Release pour arm64 et les appareils physiques.

Le second build est assemblé dans `mAI-iOS-device-unsigned.ipa`. Il s’agit d’une vraie application iOS, mais Apple interdit son installation sur un appareil tant qu’elle n’a pas été signée avec un certificat et un profil de provisioning valides. Le workflow reste volontairement sans secrets et conserve donc la version non signée comme artefact de compilation.

### Signature et publication

La CI actuelle produit volontairement des artefacts non signés. Une diffusion publique demandera :

- Windows : certificat Authenticode ;
- macOS : certificat Developer ID et notarisation Apple ;
- Android : keystore de publication ;
- iOS : compte Apple Developer, certificat et profil de provisioning.

Ces secrets doivent être ajoutés aux *GitHub Actions Secrets* et ne doivent jamais être commités.

## Personnalisation

Le nom et l’identifiant sont configurés dans `package.json` et `capacitor.config.ts`. L’icône source est `assets/icon.png`. Après modification d’une ressource mobile, régénérez les icônes natives ou remplacez les fichiers correspondants dans les projets Android/iOS.

## Version 1.1.0

Cette version ajoute la persistance multi-fenêtres, la restauration contrôlée des terminaux, les onglets réordonnables, le terminal avancé, les paramètres, les thèmes, les téléchargements Electron et les notifications. Elle corrige également la perte possible des premières données PTY, la commande d’installation sous `cmd.exe`, la conservation des terminaux masqués et plusieurs validations IPC.
