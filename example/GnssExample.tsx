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
} from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import {
  getGNSSStatus,
  startListening,
  stopListening,
  GnssStatusResult,
  GnssConstellations,
  CarrierFrequencies,
} from 'react-native-gnss-status-checker';

const GnssExample: React.FC = () => {
  const [status, setStatus] = useState<GnssStatusResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // Check permissions on mount
    checkLocationPermission();
    
    // Set up event listeners
    const satelliteListener = DeviceEventEmitter.addListener(
      'onSatelliteStatusChanged',
      (data) => {
        console.log('Satellite status updated:', data);
        setStatus(prev => prev ? { ...prev, ...data } : null);
      }
    );

    const measurementListener = DeviceEventEmitter.addListener(
      'onMeasurementsChanged',
      (data) => {
        console.log('Measurements updated:', data);
        setStatus(prev => prev ? { ...prev, ...data } : null);
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
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 'granted';
        
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

  const renderStatusCard = (title: string, value: string | number | boolean, color?: string) => (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={[styles.statusValue, { color: color || '#333' }]}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </Text>
    </View>
  );

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
            loading && styles.buttonDisabled
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
          
          <View style={styles.statusGrid}>
            {renderStatusCard('GNSS Supported', status.isGNSSSupported, 
              status.isGNSSSupported ? '#4CAF50' : '#F44336')}
            {renderStatusCard('Dual-Frequency GPS', status.isDualFrequencySupported,
              status.isDualFrequencySupported ? '#4CAF50' : '#FF9800')}
            {renderStatusCard('NavIC Supported', status.isNavICSupported,
              status.isNavICSupported ? '#4CAF50' : '#FF9800')}
            {renderStatusCard('Satellites Visible', status.satellitesVisible)}
          </View>

          {status.supportedConstellations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Supported Constellations</Text>
              <View style={styles.tagContainer}>
                {status.supportedConstellations.map((constellation, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{constellation}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {status.carrierFrequencies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Detected Frequencies (MHz)</Text>
              <View style={styles.tagContainer}>
                {status.carrierFrequencies.map((frequency, index) => (
                  <View key={index} style={styles.frequencyTag}>
                    <Text style={styles.tagText}>{frequency.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Monitoring Status</Text>
            <Text style={[styles.monitoringStatus, 
              { color: isListening ? '#4CAF50' : '#666' }]}>
              {isListening ? '🟢 Active' : '🔴 Inactive'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoHeader}>About GNSS Features</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Dual-Frequency GPS:</Text> L5 band support (~1176 MHz) for improved accuracy{'\n'}
          • <Text style={styles.bold}>NavIC:</Text> Indian Regional Navigation Satellite System (IRNSS){'\n'}
          • <Text style={styles.bold}>Multiple Constellations:</Text> GPS, GLONASS, Galileo, BeiDou, QZSS, SBAS{'\n'}
          • <Text style={styles.bold}>Real-time Monitoring:</Text> Live satellite and frequency updates
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
});

export default GnssExample; 