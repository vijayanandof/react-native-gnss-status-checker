import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-gnss-status-checker' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Define the interface for our native module
interface GnssStatusCheckerType {
  getGNSSStatus(): Promise<GnssStatusResult>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  getConstantExample(): number;
}

// Define individual satellite information
export interface SatelliteInfo {
  svid: number; // Satellite Vehicle ID (PRN for GPS)
  constellationType: number;
  constellationName: string;
  cn0DbHz?: number; // Carrier-to-noise density in dB-Hz
  elevation?: number; // Elevation angle in degrees
  azimuth?: number; // Azimuth angle in degrees
  hasEphemeris: boolean;
  hasAlmanac: boolean;
  usedInFix: boolean;
  carrierFrequencyHz?: number;
}

// Define the result interface that matches the expected output
export interface GnssStatusResult {
  isGNSSSupported: boolean;
  isDualFrequencySupported: boolean;
  isNavICSupported: boolean;
  satellitesVisible: number;
  satellitesUsedInFix: number;
  averageSignalToNoiseRatio: number; // Average C/N0 in dB-Hz
  supportedConstellations: string[];
  carrierFrequencies: number[];
  frequencyBands: FrequencyBandInfo[]; // Detailed frequency band information
  satellites: SatelliteInfo[]; // Detailed satellite information
  // API level compatibility information
  apiLevel?: number; // Android API level
  supportsCn0?: boolean; // Supports signal strength measurements
  supportsCarrierFreq?: boolean; // Supports carrier frequency detection
}

// Define constellation constants that match Android's GnssStatus
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

// Define carrier frequency constants - comprehensive mapping from Sean Barbeau's research
// Source: https://barbeau.medium.com/dual-frequency-gnss-on-android-devices-152b8826e1c
export const CarrierFrequencies = {
  // GPS frequencies
  GPS_L1: 1575.42, // MHz
  GPS_L2: 1227.6, // MHz
  GPS_L3: 1381.05, // MHz
  GPS_L4: 1379.913, // MHz
  GPS_L5: 1176.45, // MHz

  // GLONASS frequencies (ranges for L1/L2, specific for L3/L5)
  GLONASS_L1_MIN: 1598.0625, // MHz
  GLONASS_L1_MAX: 1605.375, // MHz
  GLONASS_L1_CENTER: 1602.0, // MHz (approximate center)
  GLONASS_L2_MIN: 1242.9375, // MHz
  GLONASS_L2_MAX: 1248.625, // MHz
  GLONASS_L2_CENTER: 1246.0, // MHz (approximate center)
  GLONASS_L3: 1202.025, // MHz
  GLONASS_L5: 1176.45, // MHz

  // QZSS frequencies
  QZSS_L1: 1575.42, // MHz
  QZSS_L2: 1227.6, // MHz
  QZSS_L5: 1176.45, // MHz
  QZSS_LEX: 1278.75, // MHz

  // Galileo frequencies
  GALILEO_E1: 1575.42, // MHz
  GALILEO_E5: 1191.795, // MHz
  GALILEO_E5a: 1176.45, // MHz
  GALILEO_E5b: 1207.14, // MHz
  GALILEO_E6: 1278.75, // MHz

  // BeiDou frequencies
  BEIDOU_B1: 1561.098, // MHz
  BEIDOU_B1_2: 1589.742, // MHz
  BEIDOU_B2: 1207.14, // MHz
  BEIDOU_B2a: 1176.45, // MHz
  BEIDOU_B3: 1268.52, // MHz

  // NavIC frequencies
  NAVIC_L5: 1176.45, // MHz
  NAVIC_S: 2492.028, // MHz

  // SBAS frequencies (GAGAN, WAAS, etc.)
  SBAS_L1: 1575.42, // MHz
  SBAS_L5: 1176.45, // MHz
} as const;

// Frequency band identification interface
export interface FrequencyBandInfo {
  frequency: number;
  constellation: string;
  band: string;
  isDualFrequency: boolean;
}

const GnssStatusChecker = NativeModules.GnssStatusChecker
  ? NativeModules.GnssStatusChecker
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    ) as GnssStatusCheckerType);

/**
 * Get current GNSS status including dual-frequency and NavIC support
 * @returns Promise<GnssStatusResult> Current GNSS status information
 */
export function getGNSSStatus(): Promise<GnssStatusResult> {
  return GnssStatusChecker.getGNSSStatus();
}

/**
 * Start listening for GNSS status updates
 * This will begin monitoring satellite visibility and measurements
 * @returns Promise<void>
 */
export function startListening(): Promise<void> {
  return GnssStatusChecker.startListening();
}

/**
 * Stop listening for GNSS status updates
 * @returns Promise<void>
 */
export function stopListening(): Promise<void> {
  return GnssStatusChecker.stopListening();
}

/**
 * Helper function to check if NavIC is supported based on constellation data
 * @param supportedConstellations Array of supported constellation names
 * @returns boolean True if NavIC (IRNSS) is supported
 */
export function isNavICSupported(supportedConstellations: string[]): boolean {
  return supportedConstellations.includes('IRNSS');
}

/**
 * Identify the frequency band for a given frequency in MHz
 * @param frequencyMHz Frequency in MHz
 * @param tolerance Tolerance in MHz (default: 1.0)
 * @returns FrequencyBandInfo object with band identification
 */
export function identifyFrequencyBand(
  frequencyMHz: number,
  tolerance: number = 1.0
): FrequencyBandInfo {
  const freq = frequencyMHz;

  // GPS bands
  if (Math.abs(freq - CarrierFrequencies.GPS_L1) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GPS',
      band: 'L1',
      isDualFrequency: false,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.GPS_L2) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GPS',
      band: 'L2',
      isDualFrequency: true,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.GPS_L5) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GPS',
      band: 'L5',
      isDualFrequency: true,
    };
  }

  // GLONASS bands
  if (
    freq >= CarrierFrequencies.GLONASS_L1_MIN - tolerance &&
    freq <= CarrierFrequencies.GLONASS_L1_MAX + tolerance
  ) {
    return {
      frequency: freq,
      constellation: 'GLONASS',
      band: 'L1',
      isDualFrequency: false,
    };
  }
  if (
    freq >= CarrierFrequencies.GLONASS_L2_MIN - tolerance &&
    freq <= CarrierFrequencies.GLONASS_L2_MAX + tolerance
  ) {
    return {
      frequency: freq,
      constellation: 'GLONASS',
      band: 'L2',
      isDualFrequency: true,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.GLONASS_L5) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GLONASS',
      band: 'L5',
      isDualFrequency: true,
    };
  }

  // Galileo bands
  if (Math.abs(freq - CarrierFrequencies.GALILEO_E1) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GALILEO',
      band: 'E1',
      isDualFrequency: false,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.GALILEO_E5a) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GALILEO',
      band: 'E5a',
      isDualFrequency: true,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.GALILEO_E5b) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'GALILEO',
      band: 'E5b',
      isDualFrequency: true,
    };
  }

  // BeiDou bands
  if (Math.abs(freq - CarrierFrequencies.BEIDOU_B1) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'BEIDOU',
      band: 'B1',
      isDualFrequency: false,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.BEIDOU_B2a) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'BEIDOU',
      band: 'B2a',
      isDualFrequency: true,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.BEIDOU_B3) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'BEIDOU',
      band: 'B3',
      isDualFrequency: true,
    };
  }

  // QZSS bands
  if (Math.abs(freq - CarrierFrequencies.QZSS_L1) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'QZSS',
      band: 'L1',
      isDualFrequency: false,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.QZSS_L5) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'QZSS',
      band: 'L5',
      isDualFrequency: true,
    };
  }

  // NavIC bands
  if (Math.abs(freq - CarrierFrequencies.NAVIC_L5) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'NAVIC',
      band: 'L5',
      isDualFrequency: true,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.NAVIC_S) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'NAVIC',
      band: 'S',
      isDualFrequency: true,
    };
  }

  // SBAS bands
  if (Math.abs(freq - CarrierFrequencies.SBAS_L1) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'SBAS',
      band: 'L1',
      isDualFrequency: false,
    };
  }
  if (Math.abs(freq - CarrierFrequencies.SBAS_L5) <= tolerance) {
    return {
      frequency: freq,
      constellation: 'SBAS',
      band: 'L5',
      isDualFrequency: true,
    };
  }

  // Unknown frequency
  return {
    frequency: freq,
    constellation: 'UNKNOWN',
    band: 'UNKNOWN',
    isDualFrequency: false,
  };
}

/**
 * Enhanced dual-frequency detection based on comprehensive frequency mapping
 * @param carrierFrequencies Array of detected carrier frequencies
 * @returns boolean True if any dual-frequency bands are detected
 */
export function isDualFrequencySupported(
  carrierFrequencies: number[]
): boolean {
  return carrierFrequencies.some((freq) => {
    const bandInfo = identifyFrequencyBand(freq);
    return bandInfo.isDualFrequency;
  });
}

/**
 * Get frequency band information for all detected frequencies
 * @param carrierFrequencies Array of detected carrier frequencies
 * @returns Array of FrequencyBandInfo objects
 */
export function getFrequencyBandInfo(
  carrierFrequencies: number[]
): FrequencyBandInfo[] {
  return carrierFrequencies.map((freq) => identifyFrequencyBand(freq));
}

/**
 * Helper function to get satellites by constellation
 * @param satellites Array of satellite information
 * @param constellationType Constellation type to filter by
 * @returns SatelliteInfo[] Array of satellites for the specified constellation
 */
export function getSatellitesByConstellation(
  satellites: SatelliteInfo[],
  constellationType: number
): SatelliteInfo[] {
  return satellites.filter(
    (sat) => sat.constellationType === constellationType
  );
}

/**
 * Helper function to get satellites used in fix
 * @param satellites Array of satellite information
 * @returns SatelliteInfo[] Array of satellites used in position fix
 */
export function getSatellitesUsedInFix(
  satellites: SatelliteInfo[]
): SatelliteInfo[] {
  return satellites.filter((sat) => sat.usedInFix);
}

/**
 * Helper function to get satellites with good signal strength
 * @param satellites Array of satellite information
 * @param minCn0 Minimum C/N0 threshold in dB-Hz (default: 20)
 * @returns SatelliteInfo[] Array of satellites with good signal strength
 */
export function getSatellitesWithGoodSignal(
  satellites: SatelliteInfo[],
  minCn0: number = 20
): SatelliteInfo[] {
  return satellites.filter(
    (sat) => sat.cn0DbHz !== undefined && sat.cn0DbHz >= minCn0
  );
}

/**
 * Helper function to get satellite statistics
 * @param satellites Array of satellite information
 * @returns Object with satellite statistics
 */
export function getSatelliteStatistics(satellites: SatelliteInfo[]) {
  const stats = {
    total: satellites.length,
    usedInFix: satellites.filter((sat) => sat.usedInFix).length,
    withEphemeris: satellites.filter((sat) => sat.hasEphemeris).length,
    withAlmanac: satellites.filter((sat) => sat.hasAlmanac).length,
    withGoodSignal: satellites.filter(
      (sat) => sat.cn0DbHz !== undefined && sat.cn0DbHz >= 20
    ).length,
    byConstellation: {} as Record<string, number>,
    averageSignalStrength: 0,
    strongestSignal: 0,
    weakestSignal: 0,
  };

  // Group by constellation
  satellites.forEach((sat) => {
    stats.byConstellation[sat.constellationName] =
      (stats.byConstellation[sat.constellationName] || 0) + 1;
  });

  // Calculate signal strength statistics
  const signalStrengths = satellites
    .filter((sat) => sat.cn0DbHz !== undefined)
    .map((sat) => sat.cn0DbHz!);

  if (signalStrengths.length > 0) {
    stats.averageSignalStrength =
      signalStrengths.reduce((a, b) => a + b, 0) / signalStrengths.length;
    stats.strongestSignal = Math.max(...signalStrengths);
    stats.weakestSignal = Math.min(...signalStrengths);
  }

  return stats;
}

export default GnssStatusChecker;

// Export types
export type { GnssStatusCheckerType };
