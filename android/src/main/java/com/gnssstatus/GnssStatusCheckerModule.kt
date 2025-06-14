package com.gnssstatus

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.GnssMeasurementsEvent
import android.location.GnssStatus
import android.location.LocationManager
import android.os.Build
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*
import kotlin.collections.HashSet
import kotlin.math.abs

class GnssStatusCheckerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val locationManager: LocationManager by lazy {
        reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    }

    private var gnssStatusCallback: GnssStatus.Callback? = null
    private var gnssMeasurementsCallback: GnssMeasurementsEvent.Callback? = null
    
    // Track current GNSS data
    private var currentSatelliteCount = 0
    private var satellitesUsedInFix = 0
    private var averageSignalToNoiseRatio = 0.0
    private val supportedConstellations = HashSet<Int>()
    private val detectedFrequencies = HashSet<Double>()
    private val satelliteDetails = mutableListOf<WritableMap>()
    
    companion object {
        const val NAME = "GnssStatusChecker"
        
        // Constellation constants matching Android's GnssStatus
        const val CONSTELLATION_UNKNOWN = 0
        const val CONSTELLATION_GPS = 1
        const val CONSTELLATION_SBAS = 2
        const val CONSTELLATION_GLONASS = 3
        const val CONSTELLATION_QZSS = 4
        const val CONSTELLATION_BEIDOU = 5
        const val CONSTELLATION_GALILEO = 6
        const val CONSTELLATION_IRNSS = 7 // NavIC
        
        // Enhanced dual-frequency detection based on Sean Barbeau's research
        // Source: https://barbeau.medium.com/dual-frequency-gnss-on-android-devices-152b8826e1c
        const val FREQ_TOLERANCE = 10.0 // MHz tolerance for frequency detection
        
        // Dual-frequency bands (frequencies that indicate dual-frequency capability)
        val DUAL_FREQUENCY_BANDS = mapOf(
            1176.45 to "L5/E5a/B2a", // GPS L5, Galileo E5a, BeiDou B2a, QZSS L5, NavIC L5, SBAS L5
            1227.6 to "L2", // GPS L2, QZSS L2
            1207.14 to "E5b/B2", // Galileo E5b, BeiDou B2
            1268.52 to "B3", // BeiDou B3
            1278.75 to "E6/LEX", // Galileo E6, QZSS LEX
            1191.795 to "E5", // Galileo E5
            2492.028 to "S", // NavIC S-band
        )
        
        // GLONASS L2 range (dual-frequency)
        const val GLONASS_L2_MIN = 1242.9375
        const val GLONASS_L2_MAX = 1248.625
        
        // GPS L5 frequency constant for backward compatibility
        const val GPS_L5_FREQUENCY = 1176.45
    }

    override fun getName(): String {
        return NAME
    }

    override fun getConstants(): MutableMap<String, Any> {
        return hashMapOf(
            "CONSTELLATION_UNKNOWN" to CONSTELLATION_UNKNOWN,
            "CONSTELLATION_GPS" to CONSTELLATION_GPS,
            "CONSTELLATION_SBAS" to CONSTELLATION_SBAS,
            "CONSTELLATION_GLONASS" to CONSTELLATION_GLONASS,
            "CONSTELLATION_QZSS" to CONSTELLATION_QZSS,
            "CONSTELLATION_BEIDOU" to CONSTELLATION_BEIDOU,
            "CONSTELLATION_GALILEO" to CONSTELLATION_GALILEO,
            "CONSTELLATION_IRNSS" to CONSTELLATION_IRNSS,
            "API_LEVEL" to Build.VERSION.SDK_INT,
            "SUPPORTS_CN0" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N),
            "SUPPORTS_CARRIER_FREQ" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        )
    }

    @ReactMethod
    fun getGNSSStatus(promise: Promise) {
        try {
            if (!hasLocationPermission()) {
                promise.reject("PERMISSION_DENIED", "Location permission is required")
                return
            }

            val result = WritableNativeMap()
            
            // Check if GNSS is supported
            val isGNSSSupported = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            result.putBoolean("isGNSSSupported", isGNSSSupported)
            
            // Check if device supports GNSS measurements (API 24+)
            val supportsMeasurements = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
            
            // Current satellite count and averages
            result.putInt("satellitesVisible", currentSatelliteCount)
            result.putInt("satellitesUsedInFix", satellitesUsedInFix)
            result.putDouble("averageSignalToNoiseRatio", averageSignalToNoiseRatio)
            
            // API level compatibility information
            result.putInt("apiLevel", Build.VERSION.SDK_INT)
            result.putBoolean("supportsCn0", supportsAdvancedGnssFeatures())
            result.putBoolean("supportsCarrierFreq", supportsCarrierFrequency())
            
            // Supported constellations
            val constellationArray = WritableNativeArray()
            supportedConstellations.forEach { constellation ->
                constellationArray.pushString(getConstellationName(constellation))
            }
            result.putArray("supportedConstellations", constellationArray)
            
            // Detected carrier frequencies
            val frequencyArray = WritableNativeArray()
            detectedFrequencies.forEach { frequency ->
                frequencyArray.pushDouble(frequency)
            }
            result.putArray("carrierFrequencies", frequencyArray)
            
            // Detailed satellite information
            val satelliteArray = WritableNativeArray()
            satelliteDetails.forEach { satellite ->
                satelliteArray.pushMap(satellite)
            }
            result.putArray("satellites", satelliteArray)
            
            // Check for dual-frequency support - enhanced detection
            val isDualFrequencySupported = detectedFrequencies.any { freq ->
                // Check specific dual-frequency bands
                DUAL_FREQUENCY_BANDS.keys.any { dualFreq ->
                    abs(freq - dualFreq) <= FREQ_TOLERANCE
                } || 
                // Check GLONASS L2 range
                (freq >= GLONASS_L2_MIN - FREQ_TOLERANCE && freq <= GLONASS_L2_MAX + FREQ_TOLERANCE)
            }
            result.putBoolean("isDualFrequencySupported", isDualFrequencySupported)
            
            // Check for NavIC support (IRNSS constellation)
            val isNavICSupported = supportedConstellations.contains(CONSTELLATION_IRNSS)
            result.putBoolean("isNavICSupported", isNavICSupported)
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("GNSS_ERROR", "Failed to get GNSS status: ${e.message}")
        }
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        try {
            if (!hasLocationPermission()) {
                promise.reject("PERMISSION_DENIED", "Location permission is required")
                return
            }

            // Start GNSS status monitoring
            if (gnssStatusCallback == null) {
                gnssStatusCallback = object : GnssStatus.Callback() {
                    override fun onSatelliteStatusChanged(status: GnssStatus) {
                        super.onSatelliteStatusChanged(status)
                        updateSatelliteStatus(status)
                    }

                    override fun onStarted() {
                        super.onStarted()
                        sendEvent("onGnssStarted", null)
                    }

                    override fun onStopped() {
                        super.onStopped()
                        sendEvent("onGnssStopped", null)
                    }
                }
                
                locationManager.registerGnssStatusCallback(gnssStatusCallback!!, null)
            }

            // Start GNSS measurements monitoring (API 24+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && gnssMeasurementsCallback == null) {
                gnssMeasurementsCallback = object : GnssMeasurementsEvent.Callback() {
                    override fun onGnssMeasurementsReceived(event: GnssMeasurementsEvent) {
                        super.onGnssMeasurementsReceived(event)
                        updateMeasurements(event)
                    }

                    override fun onStatusChanged(status: Int) {
                        super.onStatusChanged(status)
                        sendEvent("onMeasurementStatusChanged", Arguments.createMap().apply {
                            putInt("status", status)
                        })
                    }
                }
                
                locationManager.registerGnssMeasurementsCallback(gnssMeasurementsCallback!!, null)
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_LISTENING_ERROR", "Failed to start listening: ${e.message}")
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        try {
            gnssStatusCallback?.let {
                locationManager.unregisterGnssStatusCallback(it)
                gnssStatusCallback = null
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                gnssMeasurementsCallback?.let {
                    locationManager.unregisterGnssMeasurementsCallback(it)
                    gnssMeasurementsCallback = null
                }
            }
            
            // Clear cached data
            supportedConstellations.clear()
            detectedFrequencies.clear()
            satelliteDetails.clear()
            currentSatelliteCount = 0
            satellitesUsedInFix = 0
            averageSignalToNoiseRatio = 0.0
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_LISTENING_ERROR", "Failed to stop listening: ${e.message}")
        }
    }

    @ReactMethod
    fun getConstantExample(): Double {
        return GPS_L5_FREQUENCY // GPS L5 frequency in MHz
    }

    private fun hasLocationPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun updateSatelliteStatus(status: GnssStatus) {
        currentSatelliteCount = status.satelliteCount
        satellitesUsedInFix = 0
        supportedConstellations.clear()
        satelliteDetails.clear()
        
        // For calculating average signal-to-noise ratio
        val signalStrengths = mutableListOf<Float>()
        
        for (i in 0 until status.satelliteCount) {
            val constellation = status.getConstellationType(i)
            supportedConstellations.add(constellation)
            
            val usedInFix = status.usedInFix(i)
            if (usedInFix) {
                satellitesUsedInFix++
            }
            
            // Collect signal strength for average calculation (API 24+)
            if (supportsAdvancedGnssFeatures() && status.hasCn0DbHz(i)) {
                signalStrengths.add(status.getCn0DbHz(i))
            }
            
            // Create detailed satellite info
            val satelliteInfo = WritableNativeMap().apply {
                putInt("svid", status.getSvid(i))
                putInt("constellationType", constellation)
                putString("constellationName", getConstellationName(constellation))
                putBoolean("hasEphemeris", status.hasEphemerisData(i))
                putBoolean("hasAlmanac", status.hasAlmanacData(i))
                putBoolean("usedInFix", usedInFix)
                
                // Signal strength (C/N0) - API 24+
                if (supportsAdvancedGnssFeatures() && status.hasCn0DbHz(i)) {
                    putDouble("cn0DbHz", status.getCn0DbHz(i).toDouble())
                }
                
                // Elevation angle - API 24+
                if (supportsAdvancedGnssFeatures() && status.hasElevationDegrees(i)) {
                    putDouble("elevation", status.getElevationDegrees(i).toDouble())
                }
                
                // Azimuth angle - API 24+
                if (supportsAdvancedGnssFeatures() && status.hasAzimuthDegrees(i)) {
                    putDouble("azimuth", status.getAzimuthDegrees(i).toDouble())
                }
                
                // Carrier frequency - API 26+
                if (supportsCarrierFrequency() && status.hasCarrierFrequencyHz(i)) {
                    putDouble("carrierFrequencyHz", status.getCarrierFrequencyHz(i).toDouble())
                }
            }
            
            satelliteDetails.add(satelliteInfo)
        }
        
        // Calculate average signal-to-noise ratio
        averageSignalToNoiseRatio = if (signalStrengths.isNotEmpty()) {
            signalStrengths.average()
        } else {
            0.0
        }
        
        // Send updated status via event
        val eventData = WritableNativeMap().apply {
            putInt("satellitesVisible", currentSatelliteCount)
            putInt("satellitesUsedInFix", satellitesUsedInFix)
            putDouble("averageSignalToNoiseRatio", averageSignalToNoiseRatio)
            
            val constellationArray = WritableNativeArray()
            supportedConstellations.forEach { constellation ->
                constellationArray.pushString(getConstellationName(constellation))
            }
            putArray("supportedConstellations", constellationArray)
            putBoolean("isNavICSupported", supportedConstellations.contains(CONSTELLATION_IRNSS))
            
            // Include detailed satellite data in events
            val satelliteArray = WritableNativeArray()
            satelliteDetails.forEach { satellite ->
                satelliteArray.pushMap(satellite)
            }
            putArray("satellites", satelliteArray)
        }
        
        sendEvent("onSatelliteStatusChanged", eventData)
    }

    private fun updateMeasurements(event: GnssMeasurementsEvent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            detectedFrequencies.clear()
            
            event.measurements.forEach { measurement ->
                // Get carrier frequency if available (API 26+)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (measurement.hasCarrierFrequencyHz()) {
                        val frequencyMHz = measurement.carrierFrequencyHz / 1e6
                        detectedFrequencies.add(frequencyMHz)
                    }
                }
            }
            
            // Send updated measurements via event
            val eventData = WritableNativeMap().apply {
                val frequencyArray = WritableNativeArray()
                detectedFrequencies.forEach { frequency ->
                    frequencyArray.pushDouble(frequency)
                }
                putArray("carrierFrequencies", frequencyArray)
                
                // Enhanced dual-frequency detection
                val isDualFrequencySupported = detectedFrequencies.any { freq ->
                    // Check specific dual-frequency bands
                    DUAL_FREQUENCY_BANDS.keys.any { dualFreq ->
                        abs(freq - dualFreq) <= FREQ_TOLERANCE
                    } || 
                    // Check GLONASS L2 range
                    (freq >= GLONASS_L2_MIN - FREQ_TOLERANCE && freq <= GLONASS_L2_MAX + FREQ_TOLERANCE)
                }
                putBoolean("isDualFrequencySupported", isDualFrequencySupported)
            }
            
            sendEvent("onMeasurementsChanged", eventData)
        }
    }

    private fun getConstellationName(constellation: Int): String {
        return when (constellation) {
            CONSTELLATION_GPS -> "GPS"
            CONSTELLATION_SBAS -> "SBAS"
            CONSTELLATION_GLONASS -> "GLONASS"
            CONSTELLATION_QZSS -> "QZSS"
            CONSTELLATION_BEIDOU -> "BEIDOU"
            CONSTELLATION_GALILEO -> "GALILEO"
            CONSTELLATION_IRNSS -> "IRNSS" // NavIC
            else -> "UNKNOWN"
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Check if specific GNSS features are available based on API level
     */
    private fun supportsAdvancedGnssFeatures(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
    }

    private fun supportsCarrierFrequency(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
    }
} 