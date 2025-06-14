import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  FlatList,
} from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import {
  getGNSSStatus,
  startListening,
  stopListening,
  GnssStatusResult,
  SatelliteInfo,
  getSatelliteStatistics,
  getFrequencyBandInfo,
} from '../src/index';

const GnssExample: React.FC = () => {
  const [status, setStatus] = useState<GnssStatusResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [selectedConstellation, setSelectedConstellation] =
    useState<string>('All');

  useEffect(() => {
    // Check permissions on mount
    checkLocationPermission();

    // Set up event listeners
    const satelliteListener = DeviceEventEmitter.addListener(
      'onSatelliteStatusChanged',
      (data) => {
        console.log('Satellite status updated:', data);
        setStatus((prev) => (prev ? { ...prev, ...data } : null));
      }
    );

    const measurementListener = DeviceEventEmitter.addListener(
      'onMeasurementsChanged',
      (data) => {
        console.log('Measurements updated:', data);
        setStatus((prev) => (prev ? { ...prev, ...data } : null));
      }
    );

    const gnssStartedListener = DeviceEventEmitter.addListener(
      'onGnssStarted',
      () => {
        console.log('GNSS monitoring started');
      }
    );

    const gnssStoppedListener = DeviceEventEmitter.addListener(
      'onGnssStopped',
      () => {
        console.log('GNSS monitoring stopped');
      }
    );

    // Cleanup listeners
    return () => {
      satelliteListener.remove();
      measurementListener.remove();
      gnssStartedListener.remove();
      gnssStoppedListener.remove();
    };
  }, []);

  const checkLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const hasLocationPermission =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            'granted';

        setHasPermission(hasLocationPermission);

        if (!hasLocationPermission) {
          Alert.alert(
            'Permission Required',
            'This app needs location permission to access GNSS information.'
          );
        }
      } catch (err) {
        console.warn('Permission error:', err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const handleGetStatus = async () => {
    if (!hasPermission) {
      await checkLocationPermission();
      return;
    }

    setLoading(true);
    try {
      const gnssStatus = await getGNSSStatus();
      setStatus(gnssStatus);
      console.log('GNSS Status:', gnssStatus);
    } catch (error) {
      console.error('Error getting GNSS status:', error);
      Alert.alert('Error', `Failed to get GNSS status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartListening = async () => {
    if (!hasPermission) {
      await checkLocationPermission();
      return;
    }

    setLoading(true);
    try {
      await startListening();
      setIsListening(true);
      console.log('Started GNSS monitoring');
    } catch (error) {
      console.error('Error starting GNSS monitoring:', error);
      Alert.alert('Error', `Failed to start monitoring: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopListening = async () => {
    setLoading(true);
    try {
      await stopListening();
      setIsListening(false);
      console.log('Stopped GNSS monitoring');
    } catch (error) {
      console.error('Error stopping GNSS monitoring:', error);
      Alert.alert('Error', `Failed to stop monitoring: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusCard = (
    title: string,
    value: string | number | boolean,
    color?: string
  ) => (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={[styles.statusValue, { color: color || '#333' }]}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </Text>
    </View>
  );

  const renderSatelliteItem = ({ item }: { item: SatelliteInfo }) => {
    const signalColor = item.cn0DbHz
      ? item.cn0DbHz >= 30
        ? '#4CAF50'
        : item.cn0DbHz >= 20
        ? '#FF9800'
        : '#F44336'
      : '#9E9E9E';

    return (
      <View style={styles.satelliteItem}>
        <View style={styles.satelliteHeader}>
          <Text style={styles.satelliteId}>
            {item.constellationName} {item.svid}
          </Text>
          <View
            style={[styles.signalIndicator, { backgroundColor: signalColor }]}
          />
        </View>

        <View style={styles.satelliteDetails}>
          <Text style={styles.satelliteDetail}>
            Signal: {item.cn0DbHz ? `${item.cn0DbHz.toFixed(1)} dB-Hz` : 'N/A'}
          </Text>
          {item.elevation !== undefined && (
            <Text style={styles.satelliteDetail}>
              Elevation: {item.elevation.toFixed(1)}°
            </Text>
          )}
          {item.azimuth !== undefined && (
            <Text style={styles.satelliteDetail}>
              Azimuth: {item.azimuth.toFixed(1)}°
            </Text>
          )}
        </View>

        <View style={styles.satelliteFlags}>
          {item.usedInFix && <Text style={styles.flagUsed}>FIX</Text>}
          {item.hasEphemeris && <Text style={styles.flagEph}>EPH</Text>}
          {item.hasAlmanac && <Text style={styles.flagAlm}>ALM</Text>}
        </View>
      </View>
    );
  };

  const getFilteredSatellites = () => {
    if (!status?.satellites) return [];

    if (selectedConstellation === 'All') {
      return status.satellites;
    }

    return status.satellites.filter(
      (sat) => sat.constellationName === selectedConstellation
    );
  };

  const getConstellationButtons = () => {
    if (!status?.supportedConstellations) return ['All'];
    return ['All', ...status.supportedConstellations];
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>GNSS Status Checker</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGetStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get GNSS Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            isListening ? styles.stopButton : styles.startButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={isListening ? handleStopListening : handleStartListening}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {isListening ? 'Stop Monitoring' : 'Start Monitoring'}
          </Text>
        </TouchableOpacity>
      </View>

      {!hasPermission && (
        <View style={styles.permissionWarning}>
          <Text style={styles.warningText}>
            ⚠️ Location permission is required to access GNSS information
          </Text>
        </View>
      )}

      {status && (
        <View style={styles.statusContainer}>
          <Text style={styles.sectionHeader}>Current Status</Text>

          <View style={styles.statusRow}>
            {renderStatusCard(
              'GNSS Supported',
              status.isGNSSSupported,
              status.isGNSSSupported ? '#4CAF50' : '#F44336'
            )}
            {renderStatusCard(
              'Dual-Frequency',
              status.isDualFrequencySupported,
              status.isDualFrequencySupported ? '#4CAF50' : '#FF9800'
            )}
          </View>

          <View style={styles.statusRow}>
            {renderStatusCard(
              'NavIC Support',
              status.isNavICSupported,
              status.isNavICSupported ? '#4CAF50' : '#FF9800'
            )}
            {renderStatusCard('Satellites Visible', status.satellitesVisible)}
          </View>

          <View style={styles.statusRow}>
            {renderStatusCard('Used in Fix', status.satellitesUsedInFix)}
            {renderStatusCard(
              'Constellations',
              status.supportedConstellations.length
            )}
          </View>

          <View style={styles.statusRow}>
            {renderStatusCard(
              'Avg SNR',
              status.averageSignalToNoiseRatio > 0
                ? `${status.averageSignalToNoiseRatio.toFixed(1)} dB-Hz`
                : 'N/A',
              status.averageSignalToNoiseRatio >= 25
                ? '#4CAF50'
                : status.averageSignalToNoiseRatio >= 20
                ? '#FF9800'
                : '#F44336'
            )}
            {renderStatusCard(
              'Monitoring',
              isListening ? 'Active' : 'Inactive',
              isListening ? '#4CAF50' : '#666'
            )}
          </View>

          {/* Satellite Statistics */}
          {status.satellites && status.satellites.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Satellite Statistics</Text>
              {(() => {
                const stats = getSatelliteStatistics(status.satellites);
                const frequencyBands = getFrequencyBandInfo(
                  status.carrierFrequencies
                );
                const uniqueBands = [
                  ...new Set(
                    frequencyBands.map(
                      (band) => `${band.constellation} ${band.band}`
                    )
                  ),
                ];
                return (
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>
                      Average SNR: {status.averageSignalToNoiseRatio.toFixed(1)}{' '}
                      dB-Hz
                    </Text>
                    <Text style={styles.statsText}>
                      Strongest: {stats.strongestSignal.toFixed(1)} dB-Hz
                    </Text>
                    <Text style={styles.statsText}>
                      With Good Signal: {stats.withGoodSignal}
                    </Text>
                    <Text style={styles.statsText}>
                      With Ephemeris: {stats.withEphemeris}
                    </Text>
                    {uniqueBands.length > 0 && (
                      <Text style={styles.statsText}>
                        Frequency Bands: {uniqueBands.join(', ')}
                      </Text>
                    )}
                  </View>
                );
              })()}
            </>
          )}

          {/* Constellation Filter */}
          <Text style={styles.sectionHeader}>Satellites</Text>
          <ScrollView horizontal style={styles.constellationFilter}>
            {getConstellationButtons().map((constellation) => (
              <TouchableOpacity
                key={constellation}
                style={[
                  styles.constellationButton,
                  selectedConstellation === constellation &&
                    styles.constellationButtonActive,
                ]}
                onPress={() => setSelectedConstellation(constellation)}
              >
                <Text
                  style={[
                    styles.constellationButtonText,
                    selectedConstellation === constellation &&
                      styles.constellationButtonTextActive,
                  ]}
                >
                  {constellation}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Satellite List */}
          <FlatList
            data={getFilteredSatellites()}
            renderItem={renderSatelliteItem}
            keyExtractor={(item) => `${item.constellationType}-${item.svid}`}
            style={styles.satelliteList}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoHeader}>About GNSS Features</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Dual-Frequency GPS:</Text> L5 band support
          (~1176 MHz) for improved accuracy{'\n'}•{' '}
          <Text style={styles.bold}>NavIC:</Text> Indian Regional Navigation
          Satellite System (IRNSS){'\n'}•{' '}
          <Text style={styles.bold}>Multiple Constellations:</Text> GPS,
          GLONASS, Galileo, BeiDou, QZSS, SBAS{'\n'}•{' '}
          <Text style={styles.bold}>Real-time Monitoring:</Text> Live satellite
          and frequency updates
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  permissionWarning: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  frequencyTag: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  monitoringStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  satelliteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  satelliteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  satelliteId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  signalIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  satelliteDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  satelliteDetail: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  satelliteFlags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagUsed: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: 4,
    borderRadius: 4,
  },
  flagEph: {
    backgroundColor: '#FF9800',
    color: 'white',
    padding: 4,
    borderRadius: 4,
  },
  flagAlm: {
    backgroundColor: '#FF9800',
    color: 'white',
    padding: 4,
    borderRadius: 4,
  },
  constellationFilter: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  constellationButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 8,
  },
  constellationButtonActive: {
    borderColor: '#2196F3',
  },
  constellationButtonText: {
    fontSize: 14,
    color: '#666',
  },
  constellationButtonTextActive: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  satelliteList: {
    flex: 1,
  },
  statsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});

export default GnssExample;
