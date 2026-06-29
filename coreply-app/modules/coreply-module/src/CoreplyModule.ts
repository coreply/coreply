import { NativeModule, requireNativeModule } from 'expo';

declare class CoreplyModule extends NativeModule<{}> {
  hello(): string;
  isAccessibilityEnabled(): boolean;
  requestDisableAccessibility(): void;
}

export default requireNativeModule<CoreplyModule>('CoreplyModule');
