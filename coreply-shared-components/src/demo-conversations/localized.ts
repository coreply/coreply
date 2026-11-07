import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ReactNode } from "react";
import { demoConversations, type DemoConversationId } from ".";

// Keep descriptors separate so server consumers can import the plain conversations.
const onboardingMessages = {
  welcome: msg({ comment: "Onboarding chat greeting. Keep the tone warm, casual and lively.", message: "Hey! Welcome to Coreply 👋" }),
  intro: msg({ comment: "Onboarding chat. Use natural, friendly language, not marketing jargon.", message: "Coreply helps you finish your messages with suggestions based on your conversation." }),
  "welcome-tip": msg({ comment: "Friendly chat prompt inviting the user to try typing suggestions.", message: "What would you like to use Coreply for? Start typing your reply below and try tapping a suggestion!" }),
  "signin-intro": msg`Nice! Sign in to bring Coreply to your conversations.`,
};

const packingQuote = msg({ comment: "A quoted earlier message in a casual chat about helping a friend move.", message: "i can help pack" });
const quotedYou = msg({ comment: "Name of the current user in a chat", message: "You" });

const messages = {
  dinner: {
    "1": msg`got the apartment!! the one with the balcony 🥳`,
    "2": msg`ahhh congrats! when do you move?`,
    "3": msg`the 28th. already regretting how many books i own 😭`,
    "4": msg`i can help pack. no promises i won't borrow things`,
    "5": msg`still good for noodles saturday? leo's coming too`,
    "6": msg`yes! can we do 7? taking dad to pick up his car first`,
    "7": msg`booked. also i'll bring the charger you left here`,
    "8": msg`THAT'S where it is`,
    "9": msg`actually are you free sunday afternoon? and do you still have those big moving bags?`,
    "10": msg`after 2. i'll bring the bags to dinner`,
    "11": msg`perfect. pizza on me sunday 🍕`,
    "12": msg`tell leo to bring cash saturday btw`,
    "13": msg`he says he's never going to live that down`,
    "14": msg`he tried to pay for noodles with supermarket points 😂`,
  },
  workspace: {
    "1": msg`Thursday's demo moved to 10:30 our time. Calendar updated.`,
    "2": msg`Thanks. Revised onboarding will be in staging tomorrow.`,
    "3": msg`I'll update the welcome email too. Also, someone's grey umbrella is in the kitchen.`,
    "4": msg`Testing onboarding. If I skip invitations and hit browser back twice, the company name disappears.`,
    "5": msg`Reproduced, thanks. I'll fix it this morning.`,
    "6": msg`Welcome email is updated. Left the subject line alone as agreed.`,
    "7": msg`Thanks. The customer also sent their staff CSV. Can we use it Thursday?`,
    "8": msg`Let's use fake data with the same columns. Don't want real emails on the recording.`,
    "9": msg`I'll make a ten-row sample.`,
    "10": msg`Company-name fix is in staging.`,
    "11": msg`Retested, working now. Can you drive the demo? I'll cover rollout questions.`,
    "12": msg`Yep. Rehearsal tomorrow at 3?`,
    "13": msg`Works. Sample CSV is ready too.`,
    "14": msg`Also the umbrella is mine. Please don't let me leave without it again.`,
    "15": msg`It's next to your laptop now.`,
  },
  dating: {
    "1": msg`Your profile says you missed your train stop by an hour. Asleep or a really good book?`,
    "2": msg`asleep unfortunately. woke up somewhere i'd never heard of with 4% battery 🫠`,
    "3": msg`Did you get home that night?`,
    "4": msg`eventually. a man in a carpet shop let me charge my phone`,
    "5": msg`That's kind. My weekend was mostly dog sitting and avoiding tomorrow's presentation`,
    "6": msg`good luck with the presentation. and the avoidance`,
    "7": msg`how did it go?`,
    "8": msg`Pretty well, except I shared the wrong screen. Everyone saw me googling how to pronounce the client's name 🙈`,
    "9": msg`that's preparation. i'd hire you`,
    "10": msg`Thank you. Are you free for a drink Thursday?`,
    "11": msg`yes 😊 June near the market? been meaning to try it`,
    "12": msg`Perfect. 7?`,
    "13": msg`works for me`,
    "14": msg`Bring your charger. I'd rather not spend our first date looking for a carpet shop 😉`,
  },
  coding: {},
  onboarding: {
    ...onboardingMessages,
    accessibility: msg({ comment: "Friendly invitation; accurately describe the Android accessibility permission.", message: "Want suggestions like these in your other apps? Enable Coreply's accessibility service so it can read the conversation and suggest what to write next." }),
    "accessibility-intro": msg`Review the disclosure and enable the service to continue.`,
    complete: msg({ comment: "Friendly setup success. Match Select Apps to the translated home screen label.", message: "You're all set! Tap 'Select Apps' on Coreply's home screen to choose where suggestions appear, or open a texting app and give it a try!" }),
  },
  "onboarding-browser": {
    ...onboardingMessages,
    complete: msg({ comment: "Friendly demo chat. Match Profiles to the translated home screen label.", message: "You're all set! Open 'Profiles' on Coreply's home screen to choose where suggestions appear, then open a website you've enabled Coreply on and give it a try!" }),
  },
};

export function createDemoConversation(
  conversationId: DemoConversationId,
  i18n: I18n,
  customUI: Record<string, ReactNode>,
) {
  const conversation = demoConversations[conversationId];
  const translations = new Map(Object.entries(messages[conversationId]));
  return {
    ...conversation,
    messages: conversation.messages.map((message) => {
      const descriptor = translations.get(message.id);
      return {
        ...message,
        text: descriptor ? i18n._(descriptor) : message.text,
        ...(conversationId === "dinner" && message.id === "9" && "quote" in message
          ? { quote: { author: i18n._(quotedYou), text: i18n._(packingQuote) } }
          : {}),
        content: customUI[message.id],
      };
    }),
  };
}
