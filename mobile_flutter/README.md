# QRBulkGen Flutter Mobile

This is the Flutter rebuild of the existing `mobile/` React Native app.

## Current Scope

- Login and register with the existing QRBulkGen API
- Persisted auth session
- Mobile shell with Generate, Analysis, and Scanner sections
- Generate workspace for QR, short URL, barcode, and label flows
- Single QR form that calls `/api/qr/single`
- Analysis workspace shell with metric cards

## Run

```powershell
cd mobile_flutter
flutter pub get
flutter run
```

If platform folders are missing because this was scaffolded inside an existing repo, run:

```powershell
flutter create . --platforms=android,ios
flutter pub get
```

## API

The app uses:

`https://qrbulkgen-production.up.railway.app/api`
