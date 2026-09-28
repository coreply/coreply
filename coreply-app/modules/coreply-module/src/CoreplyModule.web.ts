import { registerWebModule, NativeModule } from 'expo';
import type { InstalledAppInfo } from './CoreplyModule.types';
import { profileGroups } from 'libcoreply';

class CoreplyModule extends NativeModule<{}> {
  hello() {
    return 'Hello world! 👋';
  }

  isAccessibilityEnabled() {
    return false;
  }

  requestDisableAccessibility() {}

  async getInstalledAppsAsync(): Promise<InstalledAppInfo[]> {
    return profileGroups
      .filter((group) =>
        group.profiles.some((profile) => profile.platform === 'web'),
      )
      .map((group) => ({
        packageName: group.rule,
        appName: group.rule,
        iconUri: '',
      }));
  }
}

export default registerWebModule(CoreplyModule, 'CoreplyModule');
