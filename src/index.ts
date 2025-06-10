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

// Define the result interface that matches the expected output
export interface GnssStatusResult {
  isGNSSSupported: boolean;
  isDualFrequencySupported: boolean;
  isNavICSupported: boolean;
  satellitesVisible: number;
  supportedConstellations: string[];
  carrierFrequencies: number[];
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

// Define carrier frequency constants
export const CarrierFrequencies = {
  GPS_L1: 1575.42, // MHz
  GPS_L5: 1176.45, // MHz
  GLONASS_L1: 1602.0, // MHz
  GALILEO_E1: 1575.42, // MHz
  GALILEO_E5a: 1176.45, // MHz
  BEIDOU_B1: 1561.098, // MHz
  BEIDOU_B2a: 1176.45, // MHz
  NAVIC_L5: 1176.45, // MHz
} as const;

const GnssStatusChecker = NativeModules.GnssStatusChecker
  ? NativeModules.GnssStatusChecker
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    ) as GnssStatusCheckerType;

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
 * Helper function to check if dual-frequency is supported based on carrier frequencies
 * @param carrierFrequencies Array of detected carrier frequencies
 * @returns boolean True if L5 frequency (~1176 MHz) is detected
 */
export function isDualFrequencySupported(carrierFrequencies: number[]): boolean {
  // Check for L5 frequency (around 1176 MHz) with some tolerance
  return carrierFrequencies.some(freq => Math.abs(freq - CarrierFrequencies.GPS_L5) < 1.0);
}

export default GnssStatusChecker;

// Export types
export type { GnssStatusCheckerType }; 