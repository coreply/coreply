![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/coreply/coreply/total)
![GitHub Tag](https://img.shields.io/github/v/tag/coreply/coreply)
![GitHub License](https://img.shields.io/github/license/coreply/coreply)
[![Discord](https://img.shields.io/discord/1367457809742172192?logo=discord&color=violet)](https://discord.gg/zCsQKmTFTk)
[![Telegram](https://img.shields.io/badge/telegram-group-blue?logo=telegram&link=https://t.me/coreplyappgroup)](https://t.me/coreplyappgroup)

![Coreply banner](./docs/static/narrowbanner.png)
**Coreply** is an open-source Android app providing texting suggestions while you type. It enhances
your typing experience with intelligent, context-aware suggestions.

<a href="https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://github.com/coreply/coreply">
<img src="https://raw.githubusercontent.com/ImranR98/Obtainium/refs/heads/main/assets/graphics/badge_obtainium.png" alt="Get it on Obtainium" height="60"/>
</a>

## Supported Texting Apps

|                                                           |
|-----------------------------------------------------------|
| **WhatsApp**                                              |
| <img src="./docs/static/whatsapp.gif" width="360" />      |
| **Instagram**                                             |
| <img src="./docs/static/insta.gif" width="360" />         |
| **Tinder**                                                |
| <img src="./docs/static/tinder.gif" width="360" />        |
| **Signal**                                                |
| <img src="./docs/static/signal.gif" width="360" />        |
| **Notification Replies**<sup>1,2</sup>                    |
| <img src="./docs/static/notifications.gif" width="360" /> |
| **Hinge**                                                 |
| **LINE**                                                  |
| **Heymandi**                                              |
| **Gmail**<sup>3</sup>                                     |
| **Telegram**<sup>4</sup>                                  |
| **Mattermost**<sup>2</sup>                                |
| **Facebook Messenger**<sup>1</sup>                        |
| **Google Messages**<sup>1</sup>                           |
| **Snapchat**<sup>2</sup>                                  |
| **Microsoft Teams**                                       |
| **Viber**                                                 |
| **Discord**                                               |
| **Beeper**                                                |

<sup>1</sup> Performance issues: Coreply may not follow smoothly the animations and transitions.  
<sup>2</sup> Limited role detection: Coreply cannot detect whether the message is sent or
received.  
<sup>3</sup> In Gmail, Coreply only works on the quick reply text field at the bottom of the
email.  
<sup>4</sup> Including Direct Download version, Play Store version, and Nekogram.

_DISCLAIMER: Coreply is not affiliated with or endorsed by the above-mentioned apps or their parent
companies._

## Features

  <img src="./docs/static/coreply_demo.gif" width="360" />

- **Real-time AI Suggestions**: Get accurate, context-aware suggestions as you type.
- **Customizable LLM Settings**: Supports any inference service having an OpenAI compatible API.
- **No Data Collection**: All traffic goes directly to the inference API. No data passes through
  intermediate servers (except for the hosted version).

## Getting Started

### Prerequisites

- **Android 8 or higher** (Android 13 or higher recommended)

### Installation & Usage

1. Install the latest APK from the [releases page](https://github.com/coreply/coreply/releases)
2. Configure the app with your API key, URL and model name (see the section below).
3. Toggle on the switch and grant necessary permissions. **If you encountered the "Restricted
   settings" dialog, you can
   follow [these steps](https://support.google.com/android/answer/12623953?hl=en).**
4. Start typing in your messaging app, and see suggestions appear!
    - Single tap on the suggestion to insert one word
    - Long press to insert the entire suggestion.

### Configurations

#### Coreply Cloud

Sign up and get an access key from [Coreply Cloud](https://coreply.up.nadles.com/), and paste it in
the app.

#### OpenAI-Compatible APIs

| Provider                                                      | Guide                                        |
|---------------------------------------------------------------|----------------------------------------------|
| [Google AI Studio (Gemini API)](https://aistudio.google.com/) | [Here](./docs/providers.md#google-ai-studio) |
| [Groq](https://groq.com/)                                     | [Here](./docs/providers.md#groq)             |
| [Openrouter](https://openrouter.ai/)                          | [Here](./docs/providers.md#openrouter)       |
| [OpenAI](https://platform.openai.com/)                        | [Here](./docs/providers.md#openai)           |
| [Mistral](https://mistral.ai/)                                | [Here](./docs/providers.md#mistral)          |
| Other OpenAI-compatible endpoints                             | [Here](./docs/providers.md#others)           |

## How does it work?

See [Prompting](docs/prompting.md) for details.

## Build From Source

1. Clone the repository:
2. Open the project in Android Studio.
3. Sync the Gradle files and resolve any dependencies.
4. Build and run the app on your preferred device or emulator.


## Contributing

All contributions are welcome. However, please expect breaking changes as this project is in active
development. A contributor license agreement (CLA), or change in license is under consideration.
Please to reach out before making significant contributions.

## Known Issues

- The app cannot read images, videos, voice notes, or other non-text content. Contextual suggestions
  may be limited in these cases.
- Hint text 'Message' in WhatsApp is treated as typed text on devices running Android 12 or lower.
- RTL support is limited.
- Banking apps in asia commonly block apps from unknown sources having accessibility services
  permission due to security reasons. If you are facing this issue, you can
  setup [an accessibility shortcut](https://support.google.com/accessibility/android/answer/7650693?hl=en#step_1)
  to toggle the coreply on/off quickly. In the future there might be a Play Store listing to avoid
  this issue.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=coreply/coreply&type=Date)](https://www.star-history.com/#coreply/coreply&Date)

## License Notice

Coreply

Copyright (C) 2024 Coreply

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
