# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Backend API mode (optional)

By default the app uses **offline local storage** with seed data (`LocalFactfulnessRepository`). To use the FastAPI backend:

1. Start Postgres + API — see [`../backend/README.md`](../backend/README.md) (`uvicorn --host 0.0.0.0 --port 8000`).
2. Copy `.env.example` → `.env` and set `EXPO_PUBLIC_API_URL` (restart Expo after changes).
3. Complete nickname onboarding — dev auth headers identify your user to the API.

| Where you run the app | `EXPO_PUBLIC_API_URL` |
|-----------------------|------------------------|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://127.0.0.1:8000` |
| Physical device | `http://<your-PC-LAN-IP>:8000` |

**WSL2:** run the backend in Ubuntu, bind `0.0.0.0`, and use WSL/Windows port forwarding or mirrored networking so the emulator or phone can reach port 8000 (details in `backend/README.md`).

**Still local-only when `EXPO_PUBLIC_API_URL` is set:**

- Persisting the full app blob to AsyncStorage (API reloads from `/v1/bootstrap`)
- `claimScoreHistory` / local report ledger mirrors
- Actual push delivery (token is stored via API stub only)
- Public CDN file URLs (presigned download only in API mode)

**File evidence in API mode:** pick image/PDF → presigned upload → poll scan status on claim screen. Requires backend MinIO/R2 + ClamAV (see `backend/README.md`).

Failed network/API calls show a **retry** banner; there is no offline mutation queue.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
