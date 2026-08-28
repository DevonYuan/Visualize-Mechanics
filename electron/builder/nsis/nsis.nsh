; NSIS Installer Configuration for Visualize Mechanics
; This file customizes the NSIS installer created by electron-builder
; Note: electron-builder already defines PRODUCT_NAME, PRODUCT_VERSION, MUI_ICON, MUI_UNICON, etc.
;       and includes MUI_PAGE_* and MUI_UNPAGE_* macros automatically.

; Override the license page to use our custom license file
!define MUI_PAGE_CUSTOMFUNCTION_PRE LicensePagePre
!define MUI_PAGE_CUSTOMFUNCTION_SHOW LicensePageShow

; Override the finish page to auto-launch the app
!define MUI_FINISHPAGE_RUN "$INSTDIR\Visualize Mechanics.exe"
!define MUI_FINISHPAGE_RUN_NOTCHECKED

; Language
!insertmacro MUI_LANGUAGE "English"

; Custom function to set license file
Function LicensePagePre
  !insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}/license.txt"
FunctionEnd

Function LicensePageShow
FunctionEnd