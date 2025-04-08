@echo off
REM Script to generate an optimized client build of BrowserQuest for Windows

set BUILDDIR=..\client-build
set PROJECTDIR=..\client\js
set CURDIR=%cd%

echo Deleting previous build directory
if exist %BUILDDIR% (
    rmdir /s /q %BUILDDIR%
)

echo Building client with RequireJS
cd %PROJECTDIR%
node ..\..\bin\r.js -o build.js
cd %CURDIR%

echo Removing unnecessary js files from the build directory
for %%f in ("%BUILDDIR%\js\*") do (
    if not "%%~nxf"=="game.js" if not "%%~nxf"=="home.js" if not "%%~nxf"=="log.js" if not "%%~nxf"=="require-jquery.js" if not "%%~nxf"=="modernizr.js" if not "%%~nxf"=="css3-mediaqueries.js" if not "%%~nxf"=="mapworker.js" if not "%%~nxf"=="detect.js" if not "%%~nxf"=="underscore.min.js" if not "%%~nxf"=="text.js" del "%%f"
)

echo Removing sprites directory
if exist %BUILDDIR%\sprites (
    rmdir /s /q %BUILDDIR%\sprites
)

echo Removing config directory
if exist %BUILDDIR%\config (
    rmdir /s /q %BUILDDIR%\config
)

echo Moving build.txt to current dir
if exist %BUILDDIR%\build.txt (
    move %BUILDDIR%\build.txt %CURDIR%
)

echo Build complete