// ** Implemented ScreenContext with tryUpdate method
/* 'screen' type context, nested object of:
- text (optional): text content of the element
- children[] (optional): array of child elements containing text
*/

import type { BaseContext } from "./base";

export interface ScreenContextData {
  text?: string;
  children?: ScreenContextData[];
}

export interface ScreenContext extends BaseContext {
  type: "screen";
  data: ScreenContextData;
  tryUpdate(incomingContext: ScreenContext): boolean;
}

// ** Implemented tryUpdate for ScreenContext
// Checks if incoming data has overlaps in text content and tries to merge
export class ScreenContextImpl implements ScreenContext {
  type: "screen" = "screen";
  profileId: string;
  label?: string;
  data: ScreenContextData;

  constructor(profileId: string, data: ScreenContextData, label?: string) {
    this.profileId = profileId;
    this.label = label;
    this.data = data;
  }

  tryUpdate(incomingContext: ScreenContext): boolean {
    const incomingData = incomingContext.data;
    const incomingText = incomingData.text;
    const existingText = this.data.text;

    // If no incoming text, cannot update
    if (!incomingText) {
      return false;
    }

    // If no existing text, can't update
    if (!existingText) {
      return false;
    }

    // Check if incoming text contains existing text (overlap)
    if (incomingText.includes(existingText)) {
      // Incoming is a superset, update
      this.data = { ...this.data, ...incomingData };
      return true;
    }

    // Check if existing text contains incoming text (overlap)
    if (existingText.includes(incomingText)) {
      // Existing is a superset, no need to update
      return false;
    }

    // No overlap, append incoming text to existing
    this.data = {
      ...this.data,
      text: `${existingText}\n${incomingText}`,
      children: [
        ...(this.data.children || []),
        ...(incomingData.children || []),
      ],
    };
    return true;
  }
}
