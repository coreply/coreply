# Profiles and persistence

Profiles are independent per app and platform. `selectedApps` stores enabled
profile IDs on both platforms. Runtime evaluation uses only user-owned profiles,
not the built-in templates.

`libcoreply/src/profile/schema.ts` defines the profile and context extractor
schemas. Each extractor carries its own optional context template and partial.
Contexts initialize their formatting with their context type's built-in strings,
then apply the extractor's defined overrides. An explicit empty string overrides
the built-in string too.

## Android

A profile's ID is its installed package name. Its display name comes from the
installed app. Matching rules are regular expressions tested against package
names, within the profile's own package.

Installed-app discovery copies missing built-in presets into user storage and
removes profiles and selections for packages no longer installed. Apps without a
preset use an ephemeral generic screen extractor until customized.

Reset replaces a supported app's profile with a fresh preset copy. For apps
without a preset, reset removes the customized profile and restores the ephemeral
generic configuration. Applying a preset keeps the target package identity and
uses that package's exact matching rule.

## Web

A missing `profiles` key initializes the list with copies of all web presets.
A stored empty list stays empty. Profiles have stable independent IDs, optional
display names, and regexes tested against full URLs.

The extension injects its listener on HTTP/HTTPS pages so custom and self-hosted
URLs can work. Collection remains gated by enabled profiles and their regexes.
File URLs and browser-internal pages are not included.

Users can create, edit, enable, disable, and delete profiles. Deletion removes the
profile's ID from `selectedApps`. Applying a preset preserves the user profile's
ID and display name and replaces its editable configuration.

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
data feedback. Pending changes flush when leaving a form. Reset, preset, and
delete actions invalidate callbacks from the previous form so they cannot undo
those operations. Initial form emissions do not save untouched generic profiles.
