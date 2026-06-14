// `@expo/metro-runtime` MUST be the first import to ensure Fast Refresh works
// on web.
// import '@expo/metro-runtime';

import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { ctx } from "expo-router/_ctx";
import { ExpoRoot } from "expo-router/build/ExpoRoot";
import { Head } from "expo-router/build/head";

// This file should only import and register the root. No components or exports
// should be added here.
console.log("hello3");
const AppComponent = (props) => {
  console.log("hello4", props);
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} location="/explore" />
    </Head.Provider>
  );
};
renderRootComponent(AppComponent);
