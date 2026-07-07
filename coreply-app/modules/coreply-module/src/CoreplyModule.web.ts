import { registerWebModule, NativeModule } from 'expo';
import type { InstalledAppInfo } from './CoreplyModule.types';

class CoreplyModule extends NativeModule<{}> {
  hello() {
    return 'Hello world! 👋';
  }

  isAccessibilityEnabled() {
    return false;
  }

  requestDisableAccessibility() {}

  async getInstalledAppsAsync(): Promise<InstalledAppInfo[]> {
    return [];
  }
}

export default registerWebModule(CoreplyModule, 'CoreplyModule');
