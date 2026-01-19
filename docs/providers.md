# Configuring Different LLM Providers

This app supports many inference services having an OpenAI compatible API. Below are some popular
providers. All the information is for reference only. Please refer to the official docs of the
providers
for the most up-to-date information.

Models names listed here are just examples. You are welcome to experiment with those not listed.
Although smaller models (<7B) tend to fail outputting in the desired format.

## Google AI Studio

### Free Tier Status

According to the docs from Google and community feedback, AI Studio offers a free tier giving okay
experience with Coreply. You may occasionally hit rate limits. **Getting
`...Unexpected JSON token at offset 0: Expected start of the object '{', but had '[' instead at path...`
is likely caused by hitting rate limits. Please do not open issues for this.**

### Setup Guide

API URL: `https://generativelanguage.googleapis.com/v1beta/openai/`

API Key: [Grab it here](https://aistudio.google.com/apikey)

Model Name: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, or `gemini-2.5-flash-lite`.

_`gemini-2.5-flash` in AI Studio reasons by default. Therefore not recommended. `gemma-3` family in
AI Studio doesn't support system instructions. Thus not compatible._

## Groq

### Free Tier Status

According to the docs from Groq, Groq offers a free tier that likely works fine with Coreply. You
may occasionally hit rate limits. Please
do not open issues of getting errors if you are using the free tier, unless you are certain it's not
caused by rate limits.

### Setup Guide

API URL: `https://api.groq.com/openai/v1/`

API Key: [Grab it here](https://console.groq.com/keys)

Model Name: `openai/gpt-oss-20b`, `llama-3.1-8b-instant`, or `llama-3.3-70b-versatile`.

You are welcome to try other models listed in their docs.

## Openrouter

### Free Tier Status

According to the docs from Openrouter, some endpoints are free to use with strict limitations. It's
enough for testing but not recommended for regular use.

### Setup Guide

API URL: `https://openrouter.ai/api/v1/`

API Key: [Grab it here](https://openrouter.ai/settings/keys)

Model Name:

- Free: `google/gemma-3-27b-it:free`, `meta-llama/llama-3.3-8b-instruct:free`, and more.
- Paid: `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`,
  `google/gemini-2.0-flash-001`, `google/gemini-2.0-flash-lite-001`, `openai/gpt-4.1-mini`,
  `openai/gpt-4.1`, `mistralai/codestral-2508`, `openai/gpt-oss-20b`, and more.

You are welcome to try other models available on Openrouter.

## OpenAI

### Free Tier Status

It looks like OpenAI is very strict on free tier usage. It is not recommended to use Coreply with
OpenAI without topping up any credits. Also note that having a subscription to ChatGPT ≠ topping up
credits for API usage.

### Setup Guide

API URL: `https://api.openai.com/v1/`

API Key: [Grab it here](https://platform.openai.com/api-keys)

Model Name: `gpt-4.1-mini`, `gpt-4.1`, `gpt-4.1-nano`,  `gpt-4o`, or `gpt-4o-mini`.

_`gpt-5` family not recommended as they are reasoning models; `mini` variants are recommended for
the best cost-performance ratio._

## Mistral

### Free Tier Status

Looks like Mistral offers a free tier, but needs more information about using it with Coreply.
Please refer to their official
docs.

### Setup Guide

Coreply supports codestral's Fill-in-the-middle (FIM) API, which are low-latency and use fewer
tokens. Besides that, chat completion API is also supported.

#### FIM (codestral)

API URL: `https://api.mistral.ai/v1/fim/`

API Key: [Grab it here](https://console.mistral.ai/api-keys)

Model Name: `codestral-latest`

#### Chat Completion (Other models)

API URL: `https://api.mistral.ai/v1/`

API Key: [Grab it here](https://console.mistral.ai/api-keys)

Model Name: `mistral-medium-2508` or `mistral-small-2409`

You are welcome to try other models from them.

## Others

Theoretically many OpenAI-compatible endpoints can be used. Find the API URL, API Key, and Model
Name
in the docs of the provider. The default system prompt works with mainstream models, but you can
improve it if needed.