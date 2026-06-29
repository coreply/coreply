import { registerWebModule, NativeModule } from 'expo';

class CoreplyModule extends NativeModule<{}> {
  hello() {
    return 'Hello world! 👋';
  }

  isAccessibilityEnabled() {
    return false;
  }

  requestDisableAccessibility() {}
}

export default registerWebModule(CoreplyModule, 'CoreplyModule');
