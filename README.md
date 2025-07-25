![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/coreply/coreply/total)
![GitHub Tag](https://img.shields.io/github/v/tag/coreply/coreply)
![GitHub License](https://img.shields.io/github/license/coreply/coreply)

![Coreply banner](./docs/static/narrowbanner.png)
**Coreply** is an open-source Android app designed to make texting faster and smarter by providing texting suggestions while you type. Whether you're replying to friends, family, or colleagues, Coreply enhances your typing experience with intelligent, context-aware suggestions.

## Supported Texting Apps

| App | Screenshot | Remarks (See notes below) |
|-----|------------|---------------------------|
| **WhatsApp** | ![](./docs/static/whatsapp.gif) |                           |
| **Instagram** | ![](./docs/static/insta.gif) |                           |
| **Tinder** | ![](./docs/static/tinder.gif) |                           |
| **Signal** | ![](./docs/static/signal.gif) |                           |
| **Notification Replies** | ![](./docs/static/notifications.gif) | 1,2                       |
| **Hinge** | _no screenshot yet_ |                           |
| **LINE** | _no screenshot yet_ |                           |
| **Heymandi** | _no screenshot yet_ |                           |
| **Gmail (Limited)** | _no screenshot yet_ | 3                         |
| **Telegram** | _no screenshot yet_ |                           |
| **Mattermost** | _no screenshot yet_ | 2                         |
| **Facebook Messenger** | _no screenshot yet_ | 1                         |
| **Google Messages** | _no screenshot yet_ |                           |
|**Snapchat** | _no screenshot yet_ | 2                         |
|**Microsoft Teams** | _no screenshot yet_ |                           |

### Remarks
1. Performance issues: Coreply may not follow smoothly the animations and transitions in the app.
2. Limited role detection: Coreply cannot detect whether the message is sent or received.
3. In Gmail, Coreply only works on the quick reply text field at the bottom of the email.

_DISCLAIMER: Coreply is not affiliated with or endorsed by the above-mentioned apps or their parent companies._

## Features

<div align="center">
  <img src="./docs/static/coreply_demo.gif" width="360" />
</div>

-   **Real-time AI Suggestions**: Get accurate, context-aware suggestions as you type.
-   **Customizable LLM Settings**: Supports any inference service having an OpenAI compatible API.
-   **No Data Collection**: All traffic goes directly to the inference API. No data passes through intermediate servers (except for the hosted version).

## Getting Started

### Prerequisites

-   Device running **Android 10 or higher** (Android 13 or higher recommended)
-   API key for OpenAI or an OpenAI-compatible inference service, such as [Groq](https://console.groq.com/) and [Openrouter](https://openrouter.ai/)

### Installation & Usage

1. Download the latest APK from the [releases page](https://github.com/coreply/coreply/releases)
2. Install the APK on your Android device.
3. Setup the app with your API key, baseURL (if not using OpenAI) and model name.
4. Toggle the switch and grant necessary permissions to enable the service. If you encountered the "Restricted settings" dialog, you can follow [these steps](https://support.google.com/android/answer/12623953?hl=en).
5. Start typing in your messaging app, and see suggestions appear! Single tap on the suggestion to insert one word, or long press to insert the entire suggestion.

### Build From Source

1. Clone the repository:
2. Open the project in Android Studio.
3. Sync the Gradle files and resolve any dependencies.
4. Build and run the app on your preferred device or emulator.

## Model Selection

See [Model Selection & Providers](./docs/models.md) for details.

## How does it work?

See [Model Selection & Providers](./docs/models.md) for details.

## Example setup with Groq

1. Get your API Keys [here](https://console.groq.com/keys)
2. In the coreply app, set the API Endpoint to `https://api.groq.com/openai/v1/` and the model name to `gemma2-9b-it`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, or any other model listed [here](https://console.groq.com/docs/models)
3. Set the API Key to the key you got in step 1.
4. Grant the necessary permissions as described in the installation section. And you are good to go!

## Contributing

All contributions are welcome! However, the code was based on an old project in 2016, so please be patient with the code quality and expect major architectural changes in the future.

## Known Issues

-   The app cannot read images, videos, voice notes, or other non-text content. Contextual suggestions may be limited in these cases.
-   Hint text 'Message' in WhatsApp is treated as typed text on devices running Android 12 or lower.
-   Banking apps in asia commonly block apps from unknown sources having accessibility services permission due to security reasons. If you are facing this issue, you can setup [an accessibility shortcut](https://support.google.com/accessibility/android/answer/7650693?hl=en#step_1) to toggle the coreply on/off quickly. In the future there might be a Play Store listing to avoid this issue.

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
