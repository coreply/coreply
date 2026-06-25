// `@expo/metro-runtime` MUST be the first import to ensure Fast Refresh works
// on web.
// import '@expo/metro-runtime';

import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { ctx } from "expo-router/_ctx";

import { ExpoRoot } from "expo-router/build/ExpoRoot";
import { Head } from "expo-router/build/head";

// This file should only import and register the root. No components or exports
// should be added here.
const AppComponent = (props) => {
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} />
    </Head.Provider>
  );
};
renderRootComponent(AppComponent);
