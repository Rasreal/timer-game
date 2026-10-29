// Adds a build phase that puts the dSYMs for React Native's prebuilt
// frameworks into every Archive, so App Store Connect stops warning
// "Upload Symbols Failed" for React, ReactNativeDependencies and hermesvm.
// See scripts/ios-prebuilt-dsyms.sh.
const { withXcodeProject } = require('expo/config-plugins');

const PHASE_NAME = '[TEI] Add prebuilt React Native dSYMs';

module.exports = function withPrebuiltDsyms(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const phases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    const exists = Object.values(phases).some(
      (phase) => typeof phase === 'object' && phase.name === `"${PHASE_NAME}"`,
    );
    if (!exists) {
      project.addBuildPhase([], 'PBXShellScriptBuildPhase', PHASE_NAME, project.getFirstTarget().uuid, {
        shellPath: '/bin/sh',
        // The xcode package writes this verbatim into project.pbxproj, so
        // newlines stay escaped the way Xcode stores them.
        shellScript:
          'if [ "$ACTION" = "install" ]; then\\n' +
          '  "$PROJECT_DIR/../scripts/ios-prebuilt-dsyms.sh" "$DWARF_DSYM_FOLDER_PATH"\\n' +
          'fi\\n',
      });
    }
    return cfg;
  });
};
