import { Stack, router, useLocalSearchParams } from "expo-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  builtInProfiles,
  dropRuleSchema,
  exactPackageRule,
  profileSchema,
  providerDefinitions,
  resolveAndroidProfile,
  sharedContextExtractorSchema,
  sharedProfileSchema,
  type Profile,
  type ProviderDefinition,
} from "libcoreply";
import { AdvancedSelect, ProviderSelector } from "@/components/groups";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { SchemaForm } from "@/components/ui/form";
import { storageManager } from "@/constants/storage-manager";
import CoreplyModule from "@/modules/coreply-module/src/CoreplyModule";
import { syncStoredSettings } from "@/utils/sync-stored-settings";
import { RotateCcw, Trash2 } from "lucide-react-native";

export default function ProfileScreen() {
  const { t } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile>();
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [profileSettingsSchema, setProfileSettingsSchema] =
    useState<ProviderDefinition["profileSettingsSchema"]>();
  const [globalProviderId, setGlobalProviderId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const latestProfile = useRef<Profile | undefined>(undefined);
  const savedValue = useRef<string | undefined>(undefined);
  const platform = Platform.OS === "android" ? "android" : "web";
  const editorSchema = useMemo(() => {
    if (!profileSettingsSchema) return;
    return sharedProfileSchema.extend({
      ...profileSettingsSchema.profile.shape,
      id: sharedProfileSchema.shape.id.meta({ show: false }),
      platform: sharedProfileSchema.shape.platform.meta({ show: false }),
      ...(platform === "android" ? {
        displayName: sharedProfileSchema.shape.displayName.meta({ show: false }),
        matchingRule: sharedProfileSchema.shape.matchingRule.meta({ show: false }),
      } : {}),
      contextExtractors: sharedContextExtractorSchema.extend(
        profileSettingsSchema.extractor.shape,
      ).array().meta({ isAdvancedSettings: true }),
      dropRule: dropRuleSchema,
    });
  }, [platform, profileSettingsSchema]);
  const presets = builtInProfiles.filter(
    (entry) => entry.platform === platform && availableProfiles.some((profile) => profile.id === entry.id),
  );

  useEffect(() => {
    async function load() {
      const providerId = await storageManager.loadProviderId();
      let profiles: Profile[];
      if (platform === "android") {
        const installed = await CoreplyModule.getInstalledAppsAsync();
        await storageManager.prepareAndroidProfiles(installed);
        const loaded = await storageManager.loadProfiles();
        profiles = installed.map((app) =>
          resolveAndroidProfile(loaded, app.packageName, app.appName),
        );
      } else {
        profiles = await storageManager.loadProfiles();
      }
      const found = profiles.find((entry) => entry.id === id);
      if (!found) throw new Error("Profile not found");
      setAvailableProfiles(profiles);
      setProfile(found);
      setGlobalProviderId(providerId);
      setProfileSettingsSchema(providerDefinitions[(found.providerId ?? providerId) as keyof typeof providerDefinitions].profileSettingsSchema);
      latestProfile.current = found;
      savedValue.current = JSON.stringify(profileSchema.parse(found));
    }
    void load();
  }, [id, platform]);

  async function replace(next: Profile) {
    await storageManager.saveProfile(next);
    setProfile(next);
    latestProfile.current = next;
    savedValue.current = JSON.stringify(profileSchema.parse(next));
    setRevision((value) => value + 1);
    await syncStoredSettings();
  }

  async function action(operation: () => Promise<void>) {
    setBusy(true);
    try {
      await operation();
    } catch {
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          title: profile?.displayName ?? t`Profile`,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="w-full max-w-3xl self-center gap-4">
          {profile && editorSchema ? (
            <>
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <AdvancedSelect
                    title={t({ comment: "Copies default settings from a built-in profile", message: "Copy from preset" })}
                    placeholder={t({ comment: "Copies default settings from a built-in profile", message: "Copy from preset" })}
                    value={undefined}
                    options={presets.map((entry) => ({
                      value: entry.id,
                      title: availableProfiles.find((profile) => profile.id === entry.id)?.displayName ?? entry.matchingRule,
                    }))}
                    onValueChange={(value) => {
                      const template = presets.find(
                        (entry) => entry.id === value,
                      );
                      if (!template) return;
                      void action(async () => {
                        await replace({
                          ...profileSchema.parse(template),
                          providerId: profile.providerId,
                          id: profile.id,
                          displayName: latestProfile.current?.displayName,
                          matchingRule:
                            platform === "android"
                              ? exactPackageRule(profile.id)
                              : template.matchingRule,
                        });
                      });
                    }}
                    disabled={busy}
                  />
                </View>
                {platform === "android" || presets.some((entry) => entry.id === profile.id) ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onPress={() =>
                      void action(async () => {
                        const next = await storageManager.resetProfile(profile);
                        setProfile(next);
                        if (globalProviderId) {
                          setProfileSettingsSchema(providerDefinitions[(next.providerId ?? globalProviderId) as keyof typeof providerDefinitions].profileSettingsSchema);
                        }
                        latestProfile.current = next;
                        savedValue.current = JSON.stringify(
                          profileSchema.parse(next),
                        );
                        setRevision((value) => value + 1);
                        await syncStoredSettings();
                      })
                    }
                  >
                    <Icon as={RotateCcw} className="size-4" aria-hidden />
                    <Text><Trans comment="Resets the profile to its default settings">Reset to default</Trans></Text>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-destructive"
                    disabled={busy}
                    onPress={() =>
                      void action(async () => {
                        await storageManager.deleteProfile(profile.id);
                        router.back();
                      })
                    }
                  >
                    <Icon as={Trash2} className="size-4 text-destructive" aria-hidden />
                    <Text className="text-destructive"><Trans>Delete profile</Trans></Text>
                  </Button>
                )}
              </View>
              <Text className="text-sm font-medium"><Trans>API Provider</Trans></Text>
              <ProviderSelector
                selectedProviderKey={profile.providerId ?? null}
                allowGlobalDefault
                onProviderChange={(option) => {
                  void action(async () => {
                    const providerId = option?.value ?? globalProviderId;
                    if (!providerId) return;
                    await storageManager.ensureProviderConfig(providerId);
                    setProfileSettingsSchema(providerDefinitions[providerId as keyof typeof providerDefinitions].profileSettingsSchema);
                    const current = latestProfile.current;
                    if (!current) return;
                    await replace({ ...current, providerId: option?.value ?? null });
                  });
                }}
              />
              <SchemaForm
                key={revision}
                schema={editorSchema}
                data={profile}
                onChange={(draft) => {
                  // Validate the full draft so settings absent from the editor schema survive.
                  const parsed = profileSchema.safeParse(draft);
                  if (!parsed.success) return;
                  latestProfile.current = parsed.data;
                  const serialized = JSON.stringify(parsed.data);
                  // JSON Forms also emits initial data. Do not persist an untouched
                  // generic profile, especially immediately after resetting it.
                  if (serialized === savedValue.current) return;
                  void storageManager
                    .saveProfile(parsed.data)
                    .then(syncStoredSettings)
                    .then(() => {
                      savedValue.current = serialized;
                    })
                    .catch(() => {});
                }}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
