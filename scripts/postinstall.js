// scripts/postinstall.js

const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '..', 'ios', 'Podfile');

if (!fs.existsSync(podfilePath)) {
  console.warn('⚠️ No Podfile found yet.');
  process.exit(0);
}

let podfile = fs.readFileSync(podfilePath, 'utf8');

const injection = `
    # 💥 Fix for unsupported '-G' build flag on iOS
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['OTHER_CFLAGS'] = '$(inherited)'
      end
    end
`;

const marker = 'post_install do |installer|';

if (!podfile.includes(injection.trim())) {
  podfile = podfile.replace(marker, `${marker}\n${injection}`);
  fs.writeFileSync(podfilePath, podfile, 'utf8');
  console.log('✅ Patched Podfile with -G flag workaround.');
} else {
  console.log('✅ Podfile already patched.');
}
