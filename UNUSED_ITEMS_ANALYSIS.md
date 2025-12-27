# Unused Packages and Files Analysis

## 🗑️ Packages That Can Be Removed

### 1. **@lottiefiles/dotlottie-react** (v0.6.5)
- **Status**: ❌ NOT USED
- **Reason**: No imports found in codebase
- **Alternative**: Using `lottie-react-native` instead (which IS used)

### 2. **datetimepicker** (v0.1.39)
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Alternative**: Using `@react-native-community/datetimepicker` instead (which IS used)

### 3. **react-native-modal-datetime-picker** (v13.0.0)
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Alternative**: Using `@react-native-community/datetimepicker` instead

### 4. **date-fns** (v2.28.0)
- **Status**: ❌ NOT USED
- **Reason**: No imports found in codebase
- **Note**: Using native Date methods instead

### 5. **@react-native-picker/picker** (v2.9.0)
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Note**: Not using any picker components

### 6. **react-native-webview** (v13.12.5)
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Note**: No WebView components in the app

### 7. **@react-native-masked-view/masked-view** (v0.3.2)
- **Status**: ⚠️ POTENTIALLY UNUSED
- **Reason**: No direct imports found
- **Note**: May be used by Expo Router or other dependencies internally

### 8. **@firebasegen/default-connector**
- **Status**: ⚠️ POTENTIALLY UNUSED
- **Reason**: No imports in app code
- **Note**: This is for Firebase Data Connect, but schema.gql is all commented out
- **Recommendation**: If not using Firebase Data Connect, can remove entire `dataconnect/` folder

## 📁 Files/Directories That Can Be Removed

### 1. **api-proxy/index.js**
- **Status**: ❌ NOT USED
- **Reason**: No references found in codebase
- **Note**: You're using Firebase Functions (`functions/index.js`) for the proxy instead
- **Action**: Can delete `api-proxy/` directory

### 2. **public/** directory
- **Status**: ❌ EMPTY
- **Action**: Can delete empty directory

### 3. **components/HelloWave.tsx**
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Note**: Template component from Expo

### 4. **components/ParallaxScrollView.tsx**
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Note**: Template component from Expo

### 5. **components/Collapsible.tsx**
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Note**: Template component from Expo

### 6. **components/HapticTab.tsx**
- **Status**: ❌ NOT USED
- **Reason**: No imports found
- **Note**: Template component from Expo

### 7. **assets/images/react-logo*.png** (3 files)
- **Status**: ❌ NOT USED
- **Files**: 
  - `react-logo.png`
  - `react-logo@2x.png`
  - `react-logo@3x.png`
  - `partial-react-logo.png`
- **Reason**: No references found
- **Note**: Template images from Expo

### 8. **assets/fonts/SpaceMono-Regular.ttf**
- **Status**: ❌ NOT USED
- **Reason**: No font loading found
- **Note**: Template font from Expo

### 9. **components/__tests__/**
- **Status**: ⚠️ TEST FILES
- **Note**: Only has ThemedText test, but no test runner usage found
- **Action**: Can remove if not running tests

### 10. **dataconnect/** directory
- **Status**: ⚠️ UNUSED (schema is all commented)
- **Reason**: Schema.gql is entirely commented out
- **Note**: If not using Firebase Data Connect, can remove:
  - `dataconnect/` folder
  - `dataconnect-generated/` folder
  - `@firebasegen/default-connector` package

### 11. **dist/** and **web-build/** directories
- **Status**: ⚠️ BUILD OUTPUTS
- **Note**: These are generated files, should be in .gitignore
- **Action**: Already in .gitignore, but can delete local copies

## ✅ Packages That ARE Used (Keep These)

- ✅ `lottie-react-native` - Used in `app/(auth)/index.jsx`
- ✅ `@react-native-community/datetimepicker` - Used in multiple files
- ✅ `react-datepicker` - Used for web date picker
- ✅ `expo-blur` - Used in `components/ui/TabBarBackground.ios.tsx`
- ✅ `expo-symbols` - Used in `components/ui/IconSymbol*.tsx`
- ✅ `expo-web-browser` - Used in `components/ExternalLink.tsx`
- ✅ `react-native-vector-icons` - Used in `app/(tabs)/index.jsx` (Feather icons)

## 📋 Recommended Actions

### High Priority (Safe to Remove)
1. Remove unused npm packages:
   ```bash
   npm uninstall @lottiefiles/dotlottie-react datetimepicker react-native-modal-datetime-picker date-fns @react-native-picker/picker react-native-webview
   ```

2. Delete unused directories:
   ```bash
   rm -rf api-proxy/
   rm -rf public/
   rm -rf components/__tests__/
   ```

3. Delete unused component files:
   ```bash
   rm components/HelloWave.tsx
   rm components/ParallaxScrollView.tsx
   rm components/Collapsible.tsx
   rm components/HapticTab.tsx
   ```

4. Delete unused assets:
   ```bash
   rm assets/images/react-logo*.png
   rm assets/images/partial-react-logo.png
   rm assets/fonts/SpaceMono-Regular.ttf
   ```

### Medium Priority (Verify First)
1. **dataconnect/** - Remove if not using Firebase Data Connect
2. **@react-native-masked-view** - May be required by Expo Router
3. **dist/** and **web-build/** - Delete local copies (already gitignored)

### Low Priority (Keep for Now)
- Test files - Keep if planning to add tests later
- Build outputs - Already gitignored, safe to keep locally


