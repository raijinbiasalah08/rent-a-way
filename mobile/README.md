# Rent-A-Way mobile app

Native Flutter client for Android and iOS. The existing React/Vite PWA remains the browser app. Both clients use the same Express API and database.

## Run on an Android emulator

Start the backend from `server` with `npm run dev`, then run:

```powershell
cd mobile
flutter pub get
flutter run --dart-define=RENT_AWAY_API_ORIGIN=http://10.0.2.2:5000
```

`10.0.2.2` is the Android emulator's route to the development computer. For a physical Android phone, use the computer's reachable LAN address, such as `http://192.168.1.20:5000`, and keep the phone and computer on the same network. Debug builds allow cleartext HTTP for local development; release builds should use HTTPS.

## Run on iOS Simulator

On macOS with Xcode installed, start the API and run:

```sh
cd mobile
flutter pub get
flutter run --dart-define=RENT_AWAY_API_ORIGIN=http://127.0.0.1:5000
```

For an iPhone, use a public HTTPS backend origin. Apple signing and provisioning are required to install a release app on physical iOS devices.

## Build a release

Set `RENT_AWAY_API_ORIGIN` to the deployed backend origin without `/api`:

```sh
flutter build appbundle --dart-define=RENT_AWAY_API_ORIGIN=https://your-api-origin
```

On macOS, build the iOS archive with:

```sh
flutter build ipa --dart-define=RENT_AWAY_API_ORIGIN=https://your-api-origin
```

Configure the Android release signing key and Apple signing account before publishing. Never put server secrets in `--dart-define`; the API origin is public configuration.

## Included mobile workflows

- Public equipment browsing, search, categories, and product details
- Map browsing around Roxas and equipment markers
- Customer and supplier sign-in and account creation, with access tokens in secure storage
- Saved equipment, date-based rental requests, rental status actions, and eligible post-rental reviews
- Supplier listing creation/editing/removal with optional cover photos and rental request actions
- Profile editing, community posts, text conversations, and notifications
- Admin overview, user/listing/complaint management, reports, and rental status actions

## Current limitations

- Supplier signup places the initial map pin at the selected barangay center. Set an exact pickup pin from the existing web profile before publishing listings.
- Google sign-in, password reset, image/location chat messages, live socket updates, push notifications, and some advanced web admin tools remain on the React PWA.
- The mobile client uses the existing API; it does not include a local backend or any production credentials.
- The map uses OpenStreetMap tiles with attribution. Check the [tile service usage policy](https://operations.osmfoundation.org/policies/tiles/) and choose an appropriate tile provider before a public launch.
