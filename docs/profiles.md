# Profiles and persistence

Profiles are independent per app and platform. `selectedApps` stores enabled
profile IDs on both platforms. Stored profiles override built-in definitions with
the same ID. Built-in profiles are resolved from code when no override exists;
loading them does not write them to storage.

`libcoreply/src/profile/schema.ts` defines the profile and context extractor
schemas. Each extractor carries its own optional context template and partial.
Contexts initialize their formatting with their context type's built-in strings,
then apply the extractor's defined overrides. An explicit empty string overrides
the built-in string too.

## Android

A profile's ID is its installed package name. Its display name comes from the
installed app. Matching rules are regular expressions tested against package
names, within the profile's own package.

Installed-app discovery updates stored display names and removes profiles and
selections for packages no longer installed. If no selection has been saved,
it selects only installed apps with built-in Android profiles. A saved empty
selection stays empty. Discovery does not copy built-in profiles or generate
generic profiles. The UI and runtime resolve stored overrides first, then
built-ins, then an ephemeral generic screen extractor.

Reset removes the stored override without changing selection. The profile then
uses its built-in definition or the ephemeral generic configuration. Applying a
preset keeps the target package identity and
uses that package's exact matching rule. The preset picker includes built-in
profiles for installed apps only and copies their code-defined defaults.

## Web

Built-in web profiles are available even when the stored profile list is missing
or empty. Stored overrides replace their code-defined defaults, and custom
profiles extend the list. Profiles have stable independent IDs, optional display
names, and regexes tested against full URLs.

The extension injects its listener on HTTP/HTTPS pages so custom and self-hosted
URLs can work. Collection remains gated by enabled profiles and their regexes.
File URLs and browser-internal pages are not included.

Users can edit, enable, and disable profiles. Built-in profiles can be reset to
their code-defined defaults by removing their stored override without changing
selection. Built-in profiles cannot be deleted. Users can create and delete custom profiles; deletion
removes the profile's ID from `selectedApps`. Applying a preset preserves the
profile's ID and display name and replaces its editable configuration. New custom
profiles start with a no-op extractor that can be edited. The preset picker lists
the available built-in profiles and copies their code-defined defaults.

## Storage managers

The TypeScript `CoreplyStorageManager` in
`coreply-app/src/lib/storage.ts` owns settings, profile lifecycle operations,
and the ten most recent suggestion logs. Platform adapters retain separate keys
in `coreply.settings` and `coreply.troubleshooting`. Writes are serialized within
each manager instance. The Android native manager reads shared settings and
profiles and appends logs without depending on the React Native UI being open.

Extension storage watchers and Android bridge messages synchronize changes with
the running library outside the persistence manager. Profile and enablement
changes clear old contexts and invalidate in-flight extraction work.

`libcoreply` does not own persistence or storage synchronization. It receives
settings and profiles and emits logs through its listener.

## Editing

The profile editor uses the shared `SchemaForm`, automatic JSON Forms UI schemas,
and an array renderer that dispatches each extractor's generated form at an
indexed data path. Add, remove, and reorder use JSON Forms state handlers.

The extra one-second debounce remains in `SchemaForm` to avoid stale controlled
data feedback. Pending changes flush when leaving a form. Initial form emissions
do not save untouched generic profiles.
