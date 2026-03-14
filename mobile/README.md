# QRBulkGen Mobile Scaffold

This folder closes the Week 1 mobile auth structure gap without affecting the current web/backend flow.

Included:
- `App.js`
- `src/screens/LoginScreen.js`
- `src/screens/RegisterScreen.js`
- `src/context/AuthContext.js`
- `src/lib/api.js`

This is intentionally a minimal Expo/React Native auth structure:
- login/register call the backend auth API
- auth state is held in React context
- persistence and full navigation are deferred to later mobile work
