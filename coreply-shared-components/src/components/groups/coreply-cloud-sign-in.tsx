import { View } from "react-native";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { createAuthClient } from "better-auth/react";
import type { emailOTPClient } from "better-auth/client/plugins";
import { ArrowLeft } from "lucide-react-native";
import { GoogleSignInButton } from "./google-sign-in-button";
import { GithubSignInButton } from "./github-sign-in-button";
import { Text } from "../ui/text";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Trans, useLingui } from "@lingui/react/macro";

type EmailAuthClient = Pick<
  ReturnType<
    typeof createAuthClient<{ plugins: [ReturnType<typeof emailOTPClient>] }>
  >,
  "emailOtp" | "signIn"
>;

export function CoreplyCloudSignIn({
  authClient,
  configured,
  extensionSignInUrl,
}: {
  authClient: EmailAuthClient;
  configured: boolean;
  extensionSignInUrl?: string;
}) {
  if (configured && !extensionSignInUrl)
    return <SignInForm authClient={authClient} />;

  return (
    <View className="w-full gap-5 border border-border bg-form p-5">
      <Welcome />
      {configured && extensionSignInUrl ? (
        <Button
          variant="outline"
          className="h-10 w-full max-w-[400px] self-center rounded-[4px] sm:h-10"
          onPress={() => {
            const url = new URL(extensionSignInUrl);
            url.searchParams.set("close_tab", "true");
            window.open(url.href, "_blank", "noopener,noreferrer");
          }}
        >
          <Text>
            <Trans>Open Coreply Cloud to sign in</Trans>
          </Text>
        </Button>
      ) : (
        <Text className="text-sm text-muted-foreground">
          <Trans>Coreply Cloud sign-in isn't configured for this app.</Trans>
        </Text>
      )}
    </View>
  );
}

function Welcome() {
  return (
    <View className="gap-2">
      <Text className="font-sans text-xl font-semibold">
        <Trans comment="Heading for both new and returning Coreply Cloud users">
          Welcome to Coreply Cloud
        </Trans>
      </Text>
      <Text className="font-sans text-sm text-muted-foreground">
        <Trans>
          Sign in or create an account to get typing suggestions tailored to
          your conversations.
        </Trans>
      </Text>
    </View>
  );
}

function SignInForm({ authClient }: { authClient: EmailAuthClient }) {
  const { t } = useLingui();
  const [email, setEmail] = useState("");
  const [codeEmail, setCodeEmail] = useState<string>();
  const [otp, setOtp] = useState("");
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setResendSeconds(seconds);
      if (seconds === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const send = useMutation({
    mutationFn: async (address: string) => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: address,
        type: "sign-in",
      });
      if (error) {
        if (error.status === 429)
          throw new Error(t`Too many requests. Wait a minute and try again.`);
        if (error.code === "INVALID_EMAIL")
          throw new Error(t`Enter a valid email address.`);
        throw new Error(t`Couldn't send a code. Try again.`);
      }
    },
    onSuccess: (_, address) => {
      setResent(Boolean(codeEmail));
      setOtp("");
      setCodeEmail(address);
      setResendAt(Date.now() + 30_000);
      setResendSeconds(30);
    },
    onError: (error) =>
      setError(
        error instanceof Error
          ? error.message
          : t`Couldn't send a code. Try again.`,
      ),
  });

  const verify = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const { error } = await authClient.signIn.emailOtp({ email, otp });
      if (error) {
        if (error.code === "OTP_EXPIRED")
          throw new Error(t`This code expired. Request a new one.`);
        if (error.code === "TOO_MANY_ATTEMPTS")
          throw new Error(t`Too many attempts. Request a new code.`);
        if (error.code === "INVALID_OTP")
          throw new Error(
            t`That code didn't match. Check it or request a new one.`,
          );
        if (error.status === 429)
          throw new Error(t`Too many requests. Wait a minute and try again.`);
        throw new Error(t`Couldn't verify the code. Try again.`);
      }
    },
    onError: (error) =>
      setError(
        error instanceof Error
          ? error.message
          : t`Couldn't verify the code. Try again.`,
      ),
  });
  const busy = send.isPending || verify.isPending;

  function sendCode() {
    if (busy || (codeEmail && resendSeconds > 0)) return;
    setResent(false);
    const address = codeEmail ?? email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(t`Enter a valid email address.`);
      return;
    }
    setError("");
    send.mutate(address);
  }

  function verifyCode() {
    if (busy || !codeEmail || otp.length !== 10) return;
    setError("");
    setResent(false);
    verify.mutate({ email: codeEmail, otp });
  }

  const feedback = (
    <View className="min-h-6 justify-center">
      {error ? (
        <Text
          role="alert"
          accessibilityLiveRegion="polite"
          className="text-xs leading-none text-destructive"
        >
          {error}
        </Text>
      ) : resent ? (
        <Text
          role="status"
          accessibilityLiveRegion="polite"
          className="text-xs leading-none text-muted-foreground"
        >
          <Trans>A new code was sent.</Trans>
        </Text>
      ) : null}
    </View>
  );

  return (
    <View className="w-full gap-3 border border-border bg-form p-5">
      {codeEmail ? (
        <View className="w-full max-w-[400px] self-center gap-3">
          <View className="flex-row items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel={t`Back to email address`}
              disabled={busy}
              onPress={() => {
                setCodeEmail(undefined);
                setOtp("");
                setError("");
                setResent(false);
              }}
            >
              <Icon as={ArrowLeft} />
            </Button>
            <Text className="font-sans text-xl font-semibold">
              <Trans>Check your email</Trans>
            </Text>
          </View>
          <Text className="font-sans text-sm text-muted-foreground">
            <Trans comment="The address where the Coreply Cloud verification code was sent">
              Enter the 10-digit code sent to {codeEmail}.
            </Trans>
          </Text>
          <Input
            key="otp"
            className="h-10 rounded-[4px] sm:h-10"
            autoFocus
            accessibilityLabel={t`Verification code`}
            placeholder={t`10-digit code`}
            autoComplete="one-time-code"
            inputMode="numeric"
            returnKeyType="go"
            value={otp}
            editable={!busy}
            onChangeText={(value) => {
              setOtp(value.replace(/\D/g, "").slice(0, 10));
              setError("");
            }}
            onSubmitEditing={verifyCode}
          />
          <View className="-mt-3">{feedback}</View>
          <Button
            className="h-10 rounded-[4px] sm:h-10"
            disabled={busy || otp.length !== 10}
            onPress={verifyCode}
          >
            <Text>
              {verify.isPending ? (
                <Trans>Checking code…</Trans>
              ) : (
                <Trans comment="Submit the email code to sign in or create a Coreply Cloud account">
                  Continue
                </Trans>
              )}
            </Text>
          </Button>
          <Button
            variant="ghost"
            disabled={busy || resendSeconds > 0}
            onPress={sendCode}
            className="-mt-3"
          >
            <Text>
              {send.isPending ? (
                <Trans>Sending code…</Trans>
              ) : resendSeconds > 0 ? (
                <Trans comment="Disabled resend button; resendSeconds is the seconds remaining">
                  Send a new code in {resendSeconds}s
                </Trans>
              ) : (
                <Trans>Send a new code</Trans>
              )}
            </Text>
          </Button>
        </View>
      ) : (
        <>
          <Welcome />
          <View className="w-full max-w-[400px] self-center gap-2">
            <GoogleSignInButton />
            <GithubSignInButton />
            <View className="my-2 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs text-muted-foreground">
                <Trans>or continue with</Trans>
              </Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <Input
              key="email"
              className="h-10 rounded-[4px] sm:h-10"
              accessibilityLabel={t`Email address`}
              placeholder={t`Email address`}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              inputMode="email"
              returnKeyType="go"
              value={email}
              editable={!busy}
              onChangeText={(value) => {
                setEmail(value);
                setError("");
              }}
              onSubmitEditing={sendCode}
            />
            <View className="-my-3">{feedback}</View>
            <Button
              variant="outline"
              className="h-10 rounded-[4px] sm:h-10"
              disabled={busy}
              onPress={sendCode}
            >
              <Text>
                {send.isPending ? (
                  <Trans>Sending code…</Trans>
                ) : (
                  <Trans>Continue with email</Trans>
                )}
              </Text>
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
