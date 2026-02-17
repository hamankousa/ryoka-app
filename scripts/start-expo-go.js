const { spawn } = require("node:child_process");

const mode = process.argv[2] === "tunnel" ? "tunnel" : "lan";
const npxCommand = "npx";
const expoArgs = [
  "expo",
  "start",
  "--go",
  mode === "tunnel" ? "--tunnel" : "--lan",
];

const childEnv = { ...process.env };

if (mode === "tunnel") {
  // Expo CLI's tunnel startup tries ADB reverse. Some environments expose
  // non-emulator devices as emulator-like IDs and startup crashes there.
  // For iOS Expo Go, Android SDK is not needed, so skip ADB detection.
  childEnv.ANDROID_HOME = "C:\\__expo_skip_adb_reverse__";
  childEnv.ANDROID_SDK_ROOT = "C:\\__expo_skip_adb_reverse__";
}

const child = spawn(npxCommand, expoArgs, {
  stdio: "inherit",
  env: childEnv,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
