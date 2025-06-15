# react-native-gnss-status-checker

<div align="center">

![GNSS Logo](https://img.shields.io/badge/GNSS-🛰️-blue?style=for-the-badge)
![React Native](https://img.shields.io/badge/React%20Native-0.60+-61DAFB?style=for-the-badge&logo=react)
![Android](https://img.shields.io/badge/Android-7.0+-3DDC84?style=for-the-badge&logo=android)

[![NPM Version](https://img.shields.io/npm/v/react-native-gnss-status-checker?style=flat-square)](https://www.npmjs.com/package/react-native-gnss-status-checker)
[![NPM Downloads](https://img.shields.io/npm/dm/react-native-gnss-status-checker?style=flat-square)](https://www.npmjs.com/package/react-native-gnss-status-checker)
[![License](https://img.shields.io/npm/l/react-native-gnss-status-checker?style=flat-square)](https://github.com/vijayanandof/react-native-gnss-status-checker/blob/main/LICENSE)

</div>

A React Native module to check GNSS status and satellite information on Android, including NavIC and dual-frequency GPS support.

## 🎬 Demo

<div align="center">

![Demo GIF](https://via.placeholder.com/400x600/1f1f1f/ffffff?text=GNSS+Demo+GIF+Coming+Soon)

*Real-time GNSS satellite tracking and dual-frequency detection*

</div>

## 🛰️ Supported Constellations

| Constellation | Primary Freq | Dual-Freq Support | Regional Coverage |
|---------------|--------------|-------------------|-------------------|
| 🇺🇸 GPS | L1 (1575.42 MHz) | L2, L5 | Global |
| 🇷🇺 GLONASS | L1 (1602 MHz) | L2 | Global |
| 🇪🇺 Galileo | E1 (1575.42 MHz) | E5a, E5b | Global |
| 🇨🇳 BeiDou | B1 (1561.098 MHz) | B2a, B3 | Global |
| 🇮🇳 NavIC (IRNSS) | L5 (1176.45 MHz) | S-band | India & Region |
| 🇯🇵 QZSS | L1 (1575.42 MHz) | L2, L5 | Asia-Pacific |

## 📋 Table of Contents

- [🎬 Demo](#-demo)
- [🛰️ Supported Constellations](#️-supported-constellations)
- [🌟 Features](#-features)
- [💖 Support the Project](#-support-the-project)
- [📱 Requirements](#-requirements)
- [🚀 Installation](#-installation)
- [💻 Usage](#-usage)
- [📖 API Reference](#-api-reference)
- [🔧 Troubleshooting](#-troubleshooting)
- [🌐 Community](#-community)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🌟 Features

- ✅ **GNSS Support Detection**: Check if GNSS is supported and enabled
- ✅ **Dual-Frequency GPS**: Detect L5 band support (~1176 MHz)
- ✅ **NavIC Support**: Detect Indian Regional Navigation Satellite System (IRNSS)
- ✅ **Satellite Monitoring**: Real-time satellite visibility tracking
- ✅ **Detailed Satellite Information**: Individual satellite data including PRN, signal strength, elevation, azimuth
- ✅ **Multiple Constellations**: Support for GPS, GLONASS, Galileo, BeiDou, QZSS, SBAS
- ✅ **Enhanced Frequency Detection**: Comprehensive carrier frequency mapping based on research
- ✅ **Dual-Frequency Detection**: Advanced detection for all GNSS constellations (L2, L5, E5a, E5b, B2a, etc.)
- ✅ **Frequency Band Identification**: Identify specific frequency bands for each detected carrier
- ✅ **Satellite Analytics**: Helper functions for filtering and analyzing satellite data
- ✅ **TypeScript Support**: Full TypeScript definitions included

## 💖 Support the Project

If this library has been helpful to you, consider supporting its development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat-square&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/vijayanand)
[![GitHub Stars](https://img.shields.io/github/stars/vijayanandof/react-native-gnss-status-checker?style=flat-square&logo=github)](https://github.com/vijayanandof/react-native-gnss-status-checker)

⭐ **Star this repo** if you find it useful!  
☕️ **Buy me a coffee** to support development!

Your support helps maintain and improve this open-source project!

## 📱 Requirements

- React Native 0.60+
- Android API Level 24+ (Android 7.0) for full GNSS features
  - API 21+ (Android 5.0) for basic satellite count and constellation support
  - API 24+ (Android 7.0) for signal strength, elevation, and azimuth data
  - API 26+ (Android 8.0) for carrier frequency detection
- Android device with GNSS support
- Location permissions

### API Level Compatibility

The library gracefully handles different Android API levels:

| Feature | Minimum API Level | Android Version |
|---------|------------------|-----------------|
| Basic satellite count | 21 | Android 5.0 |
| Constellation detection | 21 | Android 5.0 |
| Signal strength (C/N0) | 24 | Android 7.0 |
| Elevation/Azimuth angles | 24 | Android 7.0 |
| Carrier frequency detection | 26 | Android 8.0 |
| GNSS measurements | 24 | Android 7.0 |

You can check feature availability at runtime:

```typescript
import { getGNSSStatus } from 'react-native-gnss-status-checker';

const status = await getGNSSStatus();
// Check available features based on your device's Android version
console.log('API Level:', status.apiLevel);
console.log('Supports C/N0:', status.supportsCn0);
console.log('Supports Carrier Freq:', status.supportsCarrierFreq);
```

## 🚀 Installation

```bash
npm install react-native-gnss-status-checker
```

or

```bash
yarn add react-native-gnss-status-checker
```

### Android Setup

1. **Permissions**: Add the following permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- Optional: for background location access -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

2. **Auto-linking**: For React Native 0.60+, the module should auto-link. If you encounter issues, try:

```bash
npx react-native unlink react-native-gnss-status-checker
npx react-native link react-native-gnss-status-checker
```

3. **Manual Linking** (if auto-linking fails):
   - Add to `android/settings.gradle`:
     ```gradle
     include ':react-native-gnss-status-checker'
     project(':react-native-gnss-status-checker').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-gnss-status-checker/android')
     ```
   - Add to `android/app/build.gradle`:
     ```gradle
     dependencies {
         implementation project(':react-native-gnss-status-checker')
     }
     ```
   - Add to `MainApplication.java`:
     ```java
     import com.gnssstatus.GnssStatusCheckerPackage;
     
     @Override
     protected List<ReactPackage> getPackages() {
         return Arrays.<ReactPackage>asList(
             new MainReactPackage(),
             new GnssStatusCheckerPackage() // Add this line
         );
     }
     ```

## 💻 Usage

### Basic Usage

```typescript
import GnssStatusChecker, {
  getGNSSStatus,
  startListening,
  stopListening,
  GnssStatusResult,
  GnssConstellations,
  CarrierFrequencies
} from 'react-native-gnss-status-checker';

// Check current GNSS status
const checkGnssStatus = async () => {
  try {
    const status: GnssStatusResult = await getGNSSStatus();
    console.log('GNSS Status:', status);
    
    // Example output:
    // {
    //   isGNSSSupported: true,
    //   isDualFrequencySupported: true,
    //   isNavICSupported: false,
    //   satellitesVisible: 12,
    //   satellitesUsedInFix: 8,
    //   averageSignalToNoiseRatio: 28.5,
    //   supportedConstellations: ['GPS', 'GLONASS', 'GALILEO'],
    //   carrierFrequencies: [1575.42, 1176.45],
    //   satellites: [/* detailed satellite info */]
    // }
  } catch (error) {
    console.error('Error getting GNSS status:', error);
  }
};
```

### Real-time Monitoring

```typescript
import { DeviceEventEmitter } from 'react-native';

const startGnssMonitoring = async () => {
  try {
    // Start listening for GNSS updates
    await startListening();
    
    // Listen for satellite status changes
    const satelliteListener = DeviceEventEmitter.addListener(
      'onSatelliteStatusChanged',
      (data) => {
        console.log('Satellites visible:', data.satellitesVisible);
        console.log('Supported constellations:', data.supportedConstellations);
        console.log('NavIC supported:', data.isNavICSupported);
      }
    );
    
    // Listen for measurements changes (dual-frequency detection)
    const measurementListener = DeviceEventEmitter.addListener(
      'onMeasurementsChanged',
      (data) => {
        console.log('Carrier frequencies:', data.carrierFrequencies);
        console.log('Dual-frequency supported:', data.isDualFrequencySupported);
      }
    );
    
    // Clean up listeners when done
    return () => {
      satelliteListener.remove();
      measurementListener.remove();
      stopListening();
    };
  } catch (error) {
    console.error('Error starting GNSS monitoring:', error);
  }
};
```

### React Hook Example

```typescript
import React, { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getGNSSStatus, startListening, stopListening, GnssStatusResult } from 'react-native-gnss-status-checker';

const useGnssStatus = () => {
  const [status, setStatus] = useState<GnssStatusResult | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Get initial status
    getGNSSStatus().then(setStatus).catch(console.error);

    // Start real-time monitoring
    const startMonitoring = async () => {
      try {
        await startListening();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start GNSS monitoring:', error);
      }
    };

    startMonitoring();

    // Listen for updates
    const satelliteListener = DeviceEventEmitter.addListener(
      'onSatelliteStatusChanged',
      (data) => {
        setStatus(prev => prev ? { ...prev, ...data } : null);
      }
    );

    const measurementListener = DeviceEventEmitter.addListener(
      'onMeasurementsChanged',
      (data) => {
        setStatus(prev => prev ? { ...prev, ...data } : null);
      }
    );

    // Cleanup
    return () => {
      satelliteListener.remove();
      measurementListener.remove();
      stopListening().finally(() => setIsListening(false));
    };
  }, []);

  return { status, isListening };
};

// Usage in component
const GnssStatusComponent = () => {
  const { status, isListening } = useGnssStatus();

  if (!status) return <Text>Loading GNSS status...</Text>;

  return (
    <View>
      <Text>GNSS Supported: {status.isGNSSSupported ? 'Yes' : 'No'}</Text>
      <Text>Dual-Frequency: {status.isDualFrequencySupported ? 'Yes' : 'No'}</Text>
      <Text>NavIC Supported: {status.isNavICSupported ? 'Yes' : 'No'}</Text>
      <Text>Satellites Visible: {status.satellitesVisible}</Text>
      <Text>Monitoring: {isListening ? 'Active' : 'Inactive'}</Text>
    </View>
  );
};
```

### Enhanced Satellite Information

```typescript
import { 
  getSatellitesByConstellation,
  getSatellitesUsedInFix,
  getSatellitesWithGoodSignal,
  getSatelliteStatistics,
  GnssConstellations,
  SatelliteInfo
} from 'react-native-gnss-status-checker';

const analyzeSatellites = async () => {
  try {
    const status = await getGNSSStatus();
    
    // Get detailed satellite information
    console.log('All satellites:', status.satellites);
    
    // Filter satellites by constellation
    const gpsSatellites = getSatellitesByConstellation(status.satellites, GnssConstellations.GPS);
    const glonassSatellites = getSatellitesByConstellation(status.satellites, GnssConstellations.GLONASS);
    
    // Get satellites used in position fix
    const fixSatellites = getSatellitesUsedInFix(status.satellites);
    console.log('Satellites used in fix:', fixSatellites.length);
    
    // Get satellites with good signal strength (>= 20 dB-Hz)
    const goodSignalSats = getSatellitesWithGoodSignal(status.satellites, 20);
    console.log('Satellites with good signal:', goodSignalSats.length);
    
    // Get comprehensive statistics
    const stats = getSatelliteStatistics(status.satellites);
    console.log('Satellite statistics:', {
      total: stats.total,
      usedInFix: stats.usedInFix,
      averageSignalStrength: stats.averageSignalStrength,
      strongestSignal: stats.strongestSignal,
      byConstellation: stats.byConstellation
    });
    
    // Access individual satellite details
    status.satellites.forEach((satellite: SatelliteInfo) => {
      console.log(`${satellite.constellationName} ${satellite.svid}:`, {
        signalStrength: satellite.cn0DbHz,
        elevation: satellite.elevation,
        azimuth: satellite.azimuth,
        usedInFix: satellite.usedInFix,
        hasEphemeris: satellite.hasEphemeris
      });
    });
    
  } catch (error) {
    console.error('Error analyzing satellites:', error);
  }
};
```

### Satellite Data Structure

Each satellite in the `satellites` array contains:

```typescript
interface SatelliteInfo {
  svid: number;                    // Satellite Vehicle ID (PRN for GPS)
  constellationType: number;       // Constellation type constant
  constellationName: string;       // Human-readable constellation name
  cn0DbHz?: number;               // Signal strength in dB-Hz
  elevation?: number;             // Elevation angle in degrees
  azimuth?: number;               // Azimuth angle in degrees
  hasEphemeris: boolean;          // Has ephemeris data
  hasAlmanac: boolean;            // Has almanac data
  usedInFix: boolean;             // Used in position calculation
  carrierFrequencyHz?: number;    // Carrier frequency in Hz (API 26+)
}
```

### Helper Functions

- `getSatellitesByConstellation(satellites, constellationType)` - Filter satellites by constellation
- `getSatellitesUsedInFix(satellites)` - Get satellites used in position fix
- `getSatellitesWithGoodSignal(satellites, minCn0)` - Filter by signal strength
- `getSatelliteStatistics(satellites)` - Get comprehensive satellite statistics

### Enhanced Frequency Band Analysis

```typescript
import { 
  identifyFrequencyBand,
  getFrequencyBandInfo,
  FrequencyBandInfo,
  CarrierFrequencies
} from 'react-native-gnss-status-checker';

const analyzeFrequencies = async () => {
  try {
    const status = await getGNSSStatus();
    
    // Get detailed frequency band information
    const frequencyBands = getFrequencyBandInfo(status.carrierFrequencies);
    
    frequencyBands.forEach((bandInfo: FrequencyBandInfo) => {
      console.log(`Frequency: ${bandInfo.frequency} MHz`);
      console.log(`Constellation: ${bandInfo.constellation}`);
      console.log(`Band: ${bandInfo.band}`);
      console.log(`Dual-Frequency: ${bandInfo.isDualFrequency}`);
    });
    
    // Identify a specific frequency
    const bandInfo = identifyFrequencyBand(1176.45); // GPS L5
    console.log('1176.45 MHz is:', bandInfo); 
    // Output: { frequency: 1176.45, constellation: 'GPS', band: 'L5', isDualFrequency: true }
    
    // Check for dual-frequency capability with enhanced detection
    console.log('Dual-frequency supported:', status.isDualFrequencySupported);
    // Now detects L2, L5, E5a, E5b, B2a, B3, E6, LEX, S-band, and GLONASS L2
    
  } catch (error) {
    console.error('Error analyzing frequencies:', error);
  }
};
```

### Comprehensive Frequency Mapping

The library now includes comprehensive frequency mapping based on [Sean Barbeau's research](https://barbeau.medium.com/dual-frequency-gnss-on-android-devices-152b8826e1c):

```typescript
// GPS frequencies
CarrierFrequencies.GPS_L1    // 1575.42 MHz
CarrierFrequencies.GPS_L2    // 1227.6 MHz  (dual-frequency)
CarrierFrequencies.GPS_L5    // 1176.45 MHz (dual-frequency)

// Galileo frequencies  
CarrierFrequencies.GALILEO_E1   // 1575.42 MHz
CarrierFrequencies.GALILEO_E5a  // 1176.45 MHz (dual-frequency)
CarrierFrequencies.GALILEO_E5b  // 1207.14 MHz (dual-frequency)

// BeiDou frequencies
CarrierFrequencies.BEIDOU_B1    // 1561.098 MHz
CarrierFrequencies.BEIDOU_B2a   // 1176.45 MHz (dual-frequency)
CarrierFrequencies.BEIDOU_B3    // 1268.52 MHz (dual-frequency)

// NavIC frequencies
CarrierFrequencies.NAVIC_L5     // 1176.45 MHz (dual-frequency)
CarrierFrequencies.NAVIC_S      // 2492.028 MHz (dual-frequency)

// GLONASS frequencies (with ranges)
CarrierFrequencies.GLONASS_L1_MIN  // 1598.0625 MHz
CarrierFrequencies.GLONASS_L1_MAX  // 1605.375 MHz
CarrierFrequencies.GLONASS_L2_MIN  // 1242.9375 MHz (dual-frequency)
CarrierFrequencies.GLONASS_L2_MAX  // 1248.625 MHz (dual-frequency)
```

## 📖 API Reference

### Methods

#### `getGNSSStatus(): Promise<GnssStatusResult>`

Returns the current GNSS status information.

**Returns:** Promise that resolves to a `GnssStatusResult` object.

#### `startListening(): Promise<void>`

Starts listening for GNSS status updates and satellite measurements.

**Returns:** Promise that resolves when listening starts successfully.

#### `stopListening(): Promise<void>`

Stops listening for GNSS updates.

**Returns:** Promise that resolves when listening stops successfully.

### Types

#### `GnssStatusResult`

```typescript
interface GnssStatusResult {
  isGNSSSupported: boolean;           // Whether GNSS is supported and enabled
  isDualFrequencySupported: boolean;  // Whether dual-frequency (L5) is detected
  isNavICSupported: boolean;          // Whether NavIC (IRNSS) is supported
  satellitesVisible: number;          // Number of visible satellites
  satellitesUsedInFix: number;        // Number of satellites used in position fix
  averageSignalToNoiseRatio: number;  // Average signal-to-noise ratio
  supportedConstellations: string[];  // Array of constellation names
  carrierFrequencies: number[];       // Array of detected frequencies (MHz)
  satellites: SatelliteInfo[];         // Array of satellite information
}
```

#### Constants

```typescript
// Constellation types
export const GnssConstellations = {
  UNKNOWN: 0,
  GPS: 1,
  SBAS: 2,
  GLONASS: 3,
  QZSS: 4,
  BEIDOU: 5,
  GALILEO: 6,
  IRNSS: 7, // NavIC
} as const;

// Carrier frequencies (MHz)
export const CarrierFrequencies = {
  GPS_L1: 1575.42,
  GPS_L5: 1176.45,
  GLONASS_L1: 1602.0,
  GALILEO_E1: 1575.42,
  GALILEO_E5a: 1176.45,
  BEIDOU_B1: 1561.098,
  BEIDOU_B2a: 1176.45,
  NAVIC_L5: 1176.45,
} as const;
```

### Events

The module emits the following events via `DeviceEventEmitter`:

- `onSatelliteStatusChanged`: Satellite status updates
- `onMeasurementsChanged`: Carrier frequency measurements updates
- `onGnssStarted`: GNSS monitoring started
- `onGnssStopped`: GNSS monitoring stopped
- `onMeasurementStatusChanged`: Measurement system status changed

## 🔧 Troubleshooting

### Common Issues

1. **"Location permission is required" error**
   - Ensure you've added location permissions to `AndroidManifest.xml`
   - Request runtime permissions before calling GNSS methods

2. **"The package doesn't seem to be linked" error**
   - Try `npx react-native clean` and rebuild
   - Verify auto-linking configuration in `react-native.config.js`
   - Check manual linking steps if auto-linking fails

3. **No satellite data or measurements**
   - Ensure device has clear sky view
   - GNSS measurements require API 24+ (Android 7.0)
   - Carrier frequency detection requires API 26+ (Android 8.0)

4. **NavIC not detected**
   - NavIC is primarily available in India and surrounding regions
   - Requires compatible GNSS chipset
   - May take time to acquire NavIC satellites

### Compilation Issues

#### **JVM Target Compatibility**
If you encounter JVM target mismatch errors:

```
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':react-native-gnss-status-checker:compileDebugKotlin'.
> 'compileDebugJavaWithJavac' task (current target is 11) and 'compileDebugKotlin' task (current target is 17) jvm target compatibility should be set to the same Java version.
```

**Solution:** Ensure your project's `android/build.gradle` has matching JVM targets:

```gradle
android {
  compileOptions {
    sourceCompatibility JavaVersion.VERSION_11
    targetCompatibility JavaVersion.VERSION_11
  }
  
  kotlinOptions {
    jvmTarget = "11"
  }
}
```

#### **API Level Errors**
If you encounter missing method errors like `hasCn0DbHz()`:

```
error: cannot find symbol method hasCn0DbHz(int)
```

**Solution:** The library handles this automatically with API level checks. Ensure your `compileSdkVersion` is 33 or higher:

```gradle
android {
  compileSdkVersion 33
  defaultConfig {
    minSdkVersion 21  // Minimum supported
    targetSdkVersion 33
  }
}
```

#### **Kotlin Version Conflicts**
If you encounter Kotlin version conflicts:

**Solution:** Add to your project's `android/build.gradle`:

```gradle
buildscript {
  ext.kotlin_version = '1.7.10'
  dependencies {
    classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
  }
}
```

### Testing

Test the module on a physical Android device with:
- Clear outdoor environment
- API Level 24+ (preferably 26+ for full features)
- GNSS-capable hardware
- Location services enabled

### Debug Information

You can check your device's capabilities at runtime:

```typescript
import { getGNSSStatus } from 'react-native-gnss-status-checker';

const debugInfo = async () => {
  try {
    const status = await getGNSSStatus();
    console.log('=== GNSS Debug Info ===');
    console.log('API Level:', status.apiLevel);
    console.log('Supports C/N0:', status.supportsCn0);
    console.log('Supports Carrier Freq:', status.supportsCarrierFreq);
    console.log('GNSS Supported:', status.isGNSSSupported);
    console.log('Satellites Visible:', status.satellitesVisible);
    console.log('Dual-Frequency:', status.isDualFrequencySupported);
    console.log('NavIC Supported:', status.isNavICSupported);
  } catch (error) {
    console.error('GNSS Error:', error);
  }
};
```

## 📊 Performance & Compatibility

### Platform Support

| Platform | Support | Min Version | Notes |
|----------|---------|-------------|--------|
| 🤖 Android | ✅ Full | API 24 (7.0) | Complete GNSS support |
| 📱 iOS | ❌ Coming Soon | - | Planned for future release |
| 🖥️ Desktop | ❌ N/A | - | Not applicable |

### Performance Metrics

- ⚡ **Satellite Update Rate**: Up to 1Hz
- 🎯 **Accuracy**: Sub-meter with dual-frequency
- 🔋 **Battery Impact**: Minimal (uses system GNSS)
- 📶 **Signal Sensitivity**: -160 dBm typical

## 🌐 Community

Join our community for support, discussions, and updates:

- 💬 [GitHub Discussions](https://github.com/vijayanandof/react-native-gnss-status-checker/discussions) - Ask questions & share ideas
- 🐛 [Issues](https://github.com/vijayanandof/react-native-gnss-status-checker/issues) - Report bugs & request features
- 📧 [Email](mailto:vijayanand@example.com) - Direct contact for business inquiries

### Show Your Support

- ⭐ Star this repository
- 🍴 Fork and contribute
- 📢 Share with the community
- ☕ [Buy me a coffee](https://www.buymeacoffee.com/vijayanand)

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the GitHub repository.

## 📄 License

MIT License - see LICENSE file for details.

## 📅 Changelog

### 1.0.0
- Initial release
- Android GNSS status checking
- Dual-frequency GPS detection
- NavIC support detection
- Real-time satellite monitoring
- TypeScript support 