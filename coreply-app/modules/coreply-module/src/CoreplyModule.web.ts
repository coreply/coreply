import { registerWebModule, NativeModule } from 'expo';
import type { InstalledAppInfo } from './CoreplyModule.types';
import { storageManager } from '../../../src/constants/storage-manager';

class CoreplyModule extends NativeModule<{}> {
  hello() {
    return 'Hello world! 👋';
  }

  isAccessibilityEnabled() {
    return false;
  }

  requestDisableAccessibility() {}

  async getInstalledAppsAsync(): Promise<InstalledAppInfo[]> {
    return (await storageManager.loadProfiles())
      .map((profile) => ({
        packageName: profile.id,
        appName: profile.displayName ?? profile.id,
        iconUri: '',
      }));
  }
}

export default registerWebModule(CoreplyModule, 'CoreplyModule');
