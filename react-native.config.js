module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: '../android/',
        packageImportPath: 'import com.gnssstatus.GnssStatusCheckerPackage;',
      },
      ios: {
        // iOS is not supported in this implementation
        project: undefined,
      },
    },
  },
}; 