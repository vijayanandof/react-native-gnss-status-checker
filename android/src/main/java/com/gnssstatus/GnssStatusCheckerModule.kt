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
import java.lang.reflect.Method

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
    // Store satellite data as simple data classes instead of WritableMap
    private val satelliteDataList = mutableListOf<SatelliteData>()
    
    // Cache reflection methods for better performance
    private var hasCn0DbHzMethod: Method? = null
    private var getCn0DbHzMethod: Method? = null
    private var hasElevationDegreesMethod: Method? = null
    private var getElevationDegreesMethod: Method? = null
    private var hasAzimuthDegreesMethod: Method? = null
    private var getAzimuthDegreesMethod: Method? = null
    
    // Data class to store satellite information
    data class SatelliteData(
        val svid: Int,
        val constellationType: Int,
        val constellationName: String,
        val hasEphemeris: Boolean,
        val hasAlmanac: Boolean,
        val usedInFix: Boolean,
        val cn0DbHz: Float?,
        val elevation: Float?,
        val azimuth: Float?,
        val carrierFrequencyHz: Double?
    )
    
    init {
        // Initialize reflection methods
        try {
            hasCn0DbHzMethod = GnssStatus::class.java.getMethod("hasCn0DbHz", Int::class.javaPrimitiveType)
            getCn0DbHzMethod = GnssStatus::class.java.getMethod("getCn0DbHz", Int::class.javaPrimitiveType)
            hasElevationDegreesMethod = GnssStatus::class.java.getMethod("hasElevationDegrees", Int::class.javaPrimitiveType)
            getElevationDegreesMethod = GnssStatus::class.java.getMethod("getElevationDegrees", Int::class.javaPrimitiveType)
            hasAzimuthDegreesMethod = GnssStatus::class.java.getMethod("hasAzimuthDegrees", Int::class.javaPrimitiveType)
            getAzimuthDegreesMethod = GnssStatus::class.java.getMethod("getAzimuthDegrees", Int::class.javaPrimitiveType)
        } catch (e: NoSuchMethodException) {
            // Methods not available in this API level
        }
    }
    
    private fun safeHasCn0DbHz(status: GnssStatus, index: Int): Boolean {
        return try {
            hasCn0DbHzMethod?.invoke(status, index) as? Boolean ?: false
        } catch (e: Exception) {
            false
        }
    }
    
    private fun safeGetCn0DbHz(status: GnssStatus, index: Int): Float {
        return try {
            getCn0DbHzMethod?.invoke(status, index) as? Float ?: 0f
        } catch (e: Exception) {
            0f
        }
    }
    
    private fun safeHasElevationDegrees(status: GnssStatus, index: Int): Boolean {
        return try {
            hasElevationDegreesMethod?.invoke(status, index) as? Boolean ?: false
        } catch (e: Exception) {
            false
        }
    }
    
    private fun safeGetElevationDegrees(status: GnssStatus, index: Int): Float {
        return try {
            getElevationDegreesMethod?.invoke(status, index) as? Float ?: 0f
        } catch (e: Exception) {
            0f
        }
    }
    
    private fun safeHasAzimuthDegrees(status: GnssStatus, index: Int): Boolean {
        return try {
            hasAzimuthDegreesMethod?.invoke(status, index) as? Boolean ?: false
        } catch (e: Exception) {
            false
        }
    }
    
    private fun safeGetAzimuthDegrees(status: GnssStatus, index: Int): Float {
        return try {
            getAzimuthDegreesMethod?.invoke(status, index) as? Float ?: 0f
        } catch (e: Exception) {
            0f
        }
    }

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
            satelliteDataList.forEach { satellite ->
                satelliteArray.pushMap(satellite.toWritableMap())
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
            satelliteDataList.clear()
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
        satelliteDataList.clear()
        
        // For calculating average signal-to-noise ratio
        val signalStrengths = mutableListOf<Float>()
        
        for (i in 0 until status.satelliteCount) {
            val constellation = status.getConstellationType(i)
            supportedConstellations.add(constellation)
            
            val usedInFix = status.usedInFix(i)
            if (usedInFix) {
                satellitesUsedInFix++
            }
            
            // Create detailed satellite info
            val satelliteInfo = SatelliteData(
                status.getSvid(i),
                constellation,
                getConstellationName(constellation),
                status.hasEphemerisData(i),
                status.hasAlmanacData(i),
                usedInFix,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && safeHasCn0DbHz(status, i)) safeGetCn0DbHz(status, i) else null,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && safeHasElevationDegrees(status, i)) safeGetElevationDegrees(status, i) else null,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && safeHasAzimuthDegrees(status, i)) safeGetAzimuthDegrees(status, i) else null,
                if (supportsCarrierFrequency() && status.hasCarrierFrequencyHz(i)) status.getCarrierFrequencyHz(i).toDouble() else null
            )
            
            satelliteDataList.add(satelliteInfo)
            
            // Add to signal strengths if available
            satelliteInfo.cn0DbHz?.let { signalStrengths.add(it) }
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
            satelliteDataList.forEach { satellite ->
                satelliteArray.pushMap(satellite.toWritableMap())
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

    // Extension function to convert SatelliteData to WritableMap
    private fun SatelliteData.toWritableMap(): WritableMap {
        return WritableNativeMap().apply {
            putInt("svid", svid)
            putInt("constellationType", constellationType)
            putString("constellationName", constellationName)
            putBoolean("hasEphemeris", hasEphemeris)
            putBoolean("hasAlmanac", hasAlmanac)
            putBoolean("usedInFix", usedInFix)
            
            cn0DbHz?.let { putDouble("cn0DbHz", it.toDouble()) }
            elevation?.let { putDouble("elevation", it.toDouble()) }
            azimuth?.let { putDouble("azimuth", it.toDouble()) }
            carrierFrequencyHz?.let { putDouble("carrierFrequencyHz", it) }
        }
    }
} 