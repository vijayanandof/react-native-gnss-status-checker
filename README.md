# react-native-gnss-status-checker

A React Native module to check GNSS status and satellite information on Android, including NavIC and dual-frequency GPS support.

## Features

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

## Requirements

- React Native 0.60+
- Android API Level 24+ (Android 7.0)
- Android device with GNSS support
- Location permissions

## Installation

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

## Usage

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

## API Reference

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

## Permissions

### Runtime Permissions

Make sure to request location permissions at runtime:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      
      if (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 'granted'
      ) {
        console.log('Location permissions granted');
        return true;
      } else {
        console.log('Location permissions denied');
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};
```

## Troubleshooting

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

### Testing

Test the module on a physical Android device with:
- Clear outdoor environment
- API Level 24+ (preferably 26+ for full features)
- GNSS-capable hardware
- Location services enabled

## Platform Support

- ✅ Android (API 24+)
- ❌ iOS (not implemented)

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the GitHub repository.

## License

MIT License - see LICENSE file for details.

## Changelog

### 1.0.0
- Initial release
- Android GNSS status checking
- Dual-frequency GPS detection
- NavIC support detection
- Real-time satellite monitoring
- TypeScript support 