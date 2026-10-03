# Calculadora do Feirante

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo Version

This project uses **Expo SDK 57**. Always check the official docs before writing code:
- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/llms.txt

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

**Run typecheck before declaring any task done.**

## Architecture

### Project Structure
```
src/
├── components/     # Reusable UI components
│   ├── AppDialog.tsx    # Custom dialog with variants (alert, confirm, destructive, premium)
│   └── Toast.tsx        # Toast notification
├── hooks/          # Custom React hooks
│   ├── useSlots.ts     # Manages conference slots (AsyncStorage)
│   └── usePurchases.ts # RevenueCat integration for premium features
├── modals/         # Modal components
│   ├── SaveModal.tsx   # Save conference with custom title
│   ├── LoadModal.tsx   # Load/delete saved conferences
│   ├── ShareModal.tsx  # Share via WhatsApp or PDF (premium)
│   └── PaywallModal.tsx # Premium subscription UI
├── services/       # External service integrations
│   ├── whatsappService.ts  # WhatsApp sharing
│   └── printService.ts     # PDF generation
├── utils/          # Utility functions
│   └── formatters.ts   # Formatting functions (weight, currency, dates)
└── types.ts        # TypeScript types
```

### Key Features

1. **Weight Conference System**
   - Add weights (kg) with quantities
   - Auto-calculate total weight and value
   - Sorted list by weight
   - Increment/decrement quantities

2. **Slot System (Storage)**
   - 20 slots free, 999 premium
   - AsyncStorage persistence
   - Save/load/delete conferences
   - Custom titles for conferences

3. **Premium Features (RevenueCat)**
   - WhatsApp sharing
   - PDF export
   - No ads
   - Unlimited slots and items

4. **Monetization**
   - Google Mobile Ads (banner)
   - RevenueCat for subscriptions
   - Premium/Enterprise tiers

## Environment Variables

Required in `.env`:
```env
EXPO_PUBLIC_MAX_ITENS_FREE=50
EXPO_PUBLIC_MAX_ITENS_PREMIUM=999
EXPO_PUBLIC_MAX_SLOTS_FREE=20
EXPO_PUBLIC_MAX_SLOTS_PREMIUM=999
EXPO_PUBLIC_REVENUE_APP=sua_chave_revenuecat
EXPO_PUBLIC_APP_NAME=Calculadora do Feirante
EXPO_PUBLIC_ID_AD=ca-app-pub-3940256099942544/6300978111
```

## Important Notes

- **RevenueCat**: Uses entitlement "Calculadora Feirante Premium" for premium features
- **Google Ads**: Test ID used for development - replace with production ID
- **AsyncStorage**: Key `@conferences_v2` for conference storage
- **Format**: All weights use 3 decimal places (e.g., 1.250 kg)
- **Currency**: BRL (R$) formatting

## Dependencies

Key packages:
- `@expo/vector-icons` - Icons
- `@react-native-async-storage/async-storage` - Local storage
- `expo-constants` - App config
- `expo-print` - PDF generation
- `expo-sharing` - File sharing
- `expo-linear-gradient` - Gradients
- `react-native-google-mobile-ads` - Ads
- `react-native-purchases` - Subscriptions
- `react-native-safe-area-context` - Safe areas

## Testing

Always run typecheck:
```bash
npx tsc --noEmit
```

## Development

To start the dev server:
```bash
npx expo start
```

Press `a` for Android or `w` for web.
