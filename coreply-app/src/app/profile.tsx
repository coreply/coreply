import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { z } from "zod";
import { builtInProfiles, exactPackageRule, profileSchema, type Profile } from "libcoreply";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SchemaForm } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { storageManager } from "@/constants/storage-manager";
import CoreplyModule from "@/modules/coreply-module/src/CoreplyModule";
import { syncStoredSettings } from "@/utils/sync-stored-settings";

const androidEditorSchema = profileSchema.extend({ displayName: z.string().optional().meta({ enabled: false }) });

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const latestProfile = useRef<Profile | undefined>(undefined);
  const savedValue = useRef<string | undefined>(undefined);
  const platform = Platform.OS === "android" ? "android" : "web";
  const presets = builtInProfiles.filter((entry) => entry.platform === platform);

  useEffect(() => {
    async function load() {
      const profiles = platform === "android"
        ? await storageManager.prepareAndroidProfiles(await CoreplyModule.getInstalledAppsAsync())
        : await storageManager.loadProfiles();
      const found = profiles.find((entry) => entry.id === id);
      if (!found) throw new Error("Profile not found");
      setProfile(found);
      latestProfile.current = found;
      savedValue.current = JSON.stringify(profileSchema.parse(found));
    }
    void load();
  }, [id, platform]);

  async function replace(next: Profile) {
    generation.current += 1;
    await storageManager.saveProfile(next);
    setProfile(next);
    latestProfile.current = next;
    savedValue.current = JSON.stringify(profileSchema.parse(next));
    setRevision(generation.current);
    await syncStoredSettings();
  }

  async function action(operation: () => Promise<void>) {
    setBusy(true);
    try { await operation(); }
    catch { }
    finally { setBusy(false); }
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: true, title: profile?.displayName ?? "Profile" }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="w-full max-w-3xl self-center gap-4">
          {profile ? <>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
              <Select key={revision} onValueChange={(option) => {
                const template = presets.find((entry) => entry.id === option?.value);
                if (!template) return;
                void action(async () => {
                  await replace({ ...profileSchema.parse(template), id: profile.id, displayName: latestProfile.current?.displayName, matchingRule: platform === "android" ? exactPackageRule(profile.id) : template.matchingRule });
                });
              }} disabled={busy}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Apply preset" /></SelectTrigger>
                <SelectContent portalHost="coreplyPortal">
                  {presets.map((entry) => <SelectItem key={entry.id} value={entry.id} label={entry.displayName ?? entry.id} />)}
                </SelectContent>
              </Select>
              </View>
                {platform === "android" ? <Button variant="outline" disabled={busy} onPress={() => void action(async () => {
                  generation.current += 1;
                  if (profile.displayName === undefined) throw new Error("Installed app name is missing");
                  const next = await storageManager.resetAndroidProfile(profile.id, profile.displayName);
                  setProfile(next);
                  latestProfile.current = next;
                  savedValue.current = JSON.stringify(profileSchema.parse(next));
                  setRevision(generation.current);
                  await syncStoredSettings();
                 })}><Text>Reset to default</Text></Button> : <Button variant="outline" className="border-destructive" disabled={busy} onPress={() => void action(async () => {
                  generation.current += 1;
                  await storageManager.deleteProfile(profile.id);
                  router.back();
                })}><Text className="text-destructive">Delete profile</Text></Button>}
            </View>
            <SchemaForm key={revision} schema={platform === "android" ? androidEditorSchema : profileSchema} data={profile} onChange={(draft) => {
              if (revision !== generation.current) return;
              const parsed = profileSchema.safeParse(draft);
                 if (!parsed.success) return;
              latestProfile.current = parsed.data;
              const serialized = JSON.stringify(parsed.data);
              // JSON Forms also emits initial data. Do not persist an untouched
              // generic profile, especially immediately after resetting it.
              if (serialized === savedValue.current) return;
              void storageManager.saveProfile(parsed.data).then(syncStoredSettings).then(() => {
                if (revision !== generation.current) return;
                savedValue.current = serialized;
               }).catch(() => {});
            }} />
          </> : null}
        </View>
      </ScrollView>
    </View>
  );
}
