# Mobile plan (React Native / Expo)

The mobile app lives in `apps/mobile` (placeholder today). It reuses the whole
`packages/shared` package and rebuilds only the screens.

## Reused as-is from packages/shared

| What | How the mobile app uses it |
| --- | --- |
| `types/`, `schemas/` | Same domain types and zod validation in forms (react-hook-form works in React Native). |
| `api/` services | `createApiClient({ apiMode, apiUrl, storage: AsyncStorage, fetch })`. Same functions: `api.venues.list()`, `api.bookings.create()`... |
| Auth session | `SessionStore` persists tokens through the injected storage. Token refresh is already handled by the transport. |
| `domain/` | Slot grid generation, range selection (`selectRange`), conflict detection, `calculatePrice`, KHR conversion, cancellation rules, `.ics` builder. |
| `mock/` | The mock server runs on device too, so the app can be built before the backend exists. |
| `i18n/en.json`, `km.json` | Load with `i18next` or `use-intl` (same ICU message syntax as next-intl). |
| `config.ts` `APP` | Timezone, KHR rate, slot length, fees. |
| TanStack Query | Works unchanged in React Native; copy `lib/query.ts` (query keys). |

Setup sketch:

```ts
// apps/mobile/src/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createApiClient } from "@pitchkh/shared";

export const api = createApiClient({
  apiMode: process.env.EXPO_PUBLIC_API_MODE === "real" ? "real" : "mock",
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  storage: AsyncStorage,            // already matches StorageAdapter
  fetch: (url, init) => fetch(url, init),
});
```

Metro must be told to watch the workspace root and resolve
`@pitchkh/shared` (it ships TypeScript source).

## Must be rebuilt natively

| Web piece | Native replacement |
| --- | --- |
| Next.js routes, `[locale]` segment | Expo Router: `(tabs)/index, venues, matches, bookings, profile` + stacks |
| Tailwind + shadcn/Radix components | NativeWind or StyleSheet components; reuse the design tokens (colours, radius, type scale) from `apps/web/src/app/globals.css` |
| Bottom tab bar, sticky bars | Expo Router Tabs, `react-native-safe-area-context` |
| Bottom sheets (vaul) | `@gorhom/bottom-sheet` |
| Framer Motion, View Transitions | `react-native-reanimated`, shared element transitions |
| next/image | `expo-image` |
| react-leaflet + OSM | `react-native-maps` (or MapLibre) |
| @react-three/fiber viewer | `expo-gl` + `@react-three/fiber/native`; `features/field3d/scene.ts` is plain three.js and can be reused, or load the GLB files in `public/assets/models` |
| localStorage / sessionStorage | AsyncStorage (session, booking draft via zustand `persist`) |
| Service worker / PWA | Native install; offline handling with TanStack Query persistence |
| Toasts (sonner) | `burnt` or a small toast component |
| Add to calendar (.ics download) | `expo-calendar` (the Google Calendar URL helper still works) |
| Mock payment sheet | Real KHQR deeplinks / ABA PayWay / Wing SDKs when the backend supports payments |
| Fonts via next/font | `expo-font` with Archivo and Noto Sans Khmer |

## Suggested build order

1. Workspace wiring (Metro, TypeScript paths), `api.ts`, AuthProvider (copy the web one: it has no DOM code).
2. Tabs + Venues list/detail (read-only).
3. Booking flow: reuse `generateSlots` output from `api.venues.availability`, `selectRange`, `calculatePrice`.
4. Bookings list/detail, cancel, reschedule.
5. Matches, chat, notifications (add push notifications with `expo-notifications`).
6. Owner screens if needed on mobile.

## Things to keep identical to the web

- Query keys and invalidation rules (so behaviour matches).
- Error handling: switch on `ApiError.code`, translate with the `errors.*` messages.
- Money display: USD first, KHR beside it, Latin digits in both languages.
- All times shown in Asia/Phnom_Penh regardless of the phone's timezone.
