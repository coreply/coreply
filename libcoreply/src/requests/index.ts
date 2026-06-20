import Mustache from 'mustache';
import { advancedSettingsSchema, fimSettingsSchema, simpleSettingsSchema, type CoreplySettings, DEFAULT_SYSTEM_PROMPT } from '../settings';
import type { TypingInfo } from '../context';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

export async function requestSuggestions(typingInfo: TypingInfo, settings: CoreplySettings): Promise<string> {
	if (settings.providerMode === 'advanced') {
		const parsed = advancedSettingsSchema.parse(settings.providerValues);
		const bodyTemplate = Mustache.render(parsed.bodyTemplate, typingInfo.contextMap);
		const response = await fetch(parsed.requestUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${parsed.apiKey}`,
				'HTTP-Referer': 'https://coreply.app',
				'X-Title': 'Coreply: Autocomplete for Texting',
			},
			body: bodyTemplate,
		});
		if (!response.ok) {
			throw new Error(`Advanced request failed with status ${response.status}`);
		}
		const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
		const assistantMessage = json.choices?.[0]?.message?.content ?? '';
		const suggestionContext = {
			...typingInfo.contextMap,
			assistantMessage,
			assistantMessageAutoTrimCurrentTyping: assistantMessage.startsWith(typingInfo.currentTyping)
				? assistantMessage.slice(typingInfo.currentTyping.length)
				: assistantMessage,
			assistantMessageAutoTrimCurrentTypingTrimmed: assistantMessage.startsWith(typingInfo.currentTypingTrimmed)
				? assistantMessage.slice(typingInfo.currentTypingTrimmed.length)
				: assistantMessage,
		};
		return Mustache.render(parsed.suggestionTemplate || '{{assistantMessage}}', suggestionContext).trim();
	}

	if (settings.providerMode === 'fim') {
		const parsed = fimSettingsSchema.parse(settings.providerValues);
		let baseURL = parsed.baseURL;
		if (!baseURL.endsWith('/')) {
			baseURL += '/';
		}
		const response = await fetch(`${baseURL}completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${parsed.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: parsed.model,
				temperature: parsed.temperature,
				top_p: parsed.topP,
				max_tokens: 100,
				stream: false,
				stop: '")',
				suffix: '")',
				prompt:
					'# Mocking a texting conversation. Messages never repeat. send_message() sends a message. mock_received() means receiving a message from others.\n# Start of Chat History\n' +
					typingInfo.pastMessages.getFIMFormat() +
					'\n# Craft a new text\nsend_message("' +
					typingInfo.currentTyping.replace(/\s+/g, ' '),
			}),
		});
		if (!response.ok) {
			throw new Error(`FIM request failed with status ${response.status}`);
		}
		const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
		const completionText = json.choices?.[0]?.message?.content ?? '';
		return `${typingInfo.currentTyping.replace(/\s+/g, ' ')}${completionText}`.trim();
	}

	const parsed = simpleSettingsSchema.parse(settings.providerValues);
	const provider = createOpenAICompatible({
		name: parsed.providerId,
		apiKey: parsed.apiKey,
		baseURL: parsed.baseURL.endsWith('/') ? parsed.baseURL.slice(0, -1) : parsed.baseURL,
	});
	let userPrompt =
		'Given this chat history\n' +
		typingInfo.pastMessages.getCoreply2Format() +
		'\nIn addition to the message I sent,\nWhat else should I send? Or start a new topic?';
	if (typingInfo.currentTyping.trim()) {
		userPrompt += `The reply should start with '${typingInfo.currentTyping.replace(/\s+/g, ' ')}'\n`;
	}
	const result = await generateText({
		model: provider.chatModel(parsed.model),
		messages: [
			{ role: 'system', content: parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT },
			{ role: 'user', content: userPrompt },
		],
		temperature: parsed.temperature,
		topP: parsed.topP,
		maxOutputTokens: 100,
		headers: {
			'HTTP-Referer': 'https://coreply.app',
			'X-Title': 'Coreply: Autocomplete for Texting',
		},
	});
	return result.text.trim();
}