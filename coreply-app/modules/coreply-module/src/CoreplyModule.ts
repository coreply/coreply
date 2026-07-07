import { NativeModule, requireNativeModule } from 'expo';
import type { InstalledAppInfo } from './CoreplyModule.types';

declare class CoreplyModule extends NativeModule<{}> {
  hello(): string;
  isAccessibilityEnabled(): boolean;
  requestDisableAccessibility(): void;
  getInstalledAppsAsync(): Promise<InstalledAppInfo[]>;
}

export default requireNativeModule<CoreplyModule>('CoreplyModule');
