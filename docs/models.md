# Model Selection & Prompting v2

The new prompt format is now more flexible and can be used with mainstream LLMs. It has been briefly tested with the following models:

| Model                   | Supported? |
| ----------------------- | ---------- |
| Claude 3 and 3.5 Family | ✅         |
| Llama 3 & 4 Family      | ✅         |
| Gemma 2 & 3 Family      | ✅         |
| OpenAI GPT Family       | ✅         |
| Google Gemini Family    | ✅         |

Many other models should work as well. You can try them out and find the best fit for your needs.

## Note on thinking/reasoning models

Reasoning models works with Coreply. However, reasoning means more latency before suggestions are made. Therefore, they are not the best choice for Coreply. Therefore it is suggested to avoid reasoning models like GPT-5, Gemini 2.5, Claude 3.7/4 and Qwen 3 models unless your provider disables thinking by default, which Openrouter seems to do.

## System Message

This is an example of a system message that can be used. For the exact prompt, you can check out the latest version of the code as they may change over time.

```
You are an AI texting assistant. You will be given a list of text messages between the user (indicated by 'Message I sent:'), and other people (indicated by their names or simply 'Message I received:'). You may also receive a screenshot of the conversation. Your job is to suggest the next message the user should send. Match the tone and style of the conversation. The user may request the message start or end with a certain prefix (both could be parts of a longer word) . The user may quote a specific message. In this case, make sure your suggestions are about the quoted message.
Output the suggested text only. Do not output anything else. Do not surround output with quotation marks
```

## User Message

This is an example of a user message that can be used. For the exact prompt, you can check out the latest version of the code as they may change over time. The last line specifies the message the user is currently typing.

```
Given this chat history
Message I sent: Hello, I would like to know more about this product.
Message I received: Hi, what product are you interested in?
Message I sent: I am looking at the new wireless charger.

In addition to the message I sent,
What else should I send?
The message should start with 'What col'.
```

## Assistant Response

The LLM would probably respond with something like:

```
What color options do you have?
```

## Parsing

Coreply would remove text the user has already typed from the output. For example, if the user is typing `What col`, Coreply would show the suggestion as `or options do you have?` on the screen. This is because most LLMs are terrible at outputting partial words, giving lots of nonsense and typos. So we need to let it output the full word.

---

**Content below is deprecated. You may find the relevant code in the source code and you can try it yourself if interested.**

# ~~Model Selection & Providers v1~~ (deprecated)

In short, coreply has been briefly tested with the following models:

| Model                   | Supported?              |
| ----------------------- | ----------------------- |
| Claude 3 and 3.5 Family | ✅                      |
| Llama 3 Family          | ✅\*                    |
| Gemma 2 Family          | ✅\*                    |
| OpenAI GPT Family       | ❌(No prefill controls) |
| Google Gemini Family    | ❌(No prefill controls) |

\* Inference provider needs to support assistant message prefilling, which most providers do.

## The coreply prompt format

Consider the example conversation:

```
Alice: Hi, how are you?
Alice: Will you be free tomorrow?
Bob: Hi Alice!
Bob: Sorry, I am busy tomorrow.
```

Where Bob is the coreply user. Assume his is currently typing `How ab` in the messaging app. The coreply prompt would be one `user` message and one `assistant` message, alongside with one `system` message at the beginning. The prompt would look like this:

System:

```
You are now texting a user. The symbol '>>' Indicates the start of a message, or the end of the message turn.
'//' indicates a comment line, which describes the message in the next line.

For example:
>>Hello
// Next line is a message starting with 'Fre':
>>Free now?
>>

Your output should always adhere to the given format, and match the tone and style of the text.
```

User:

```
>>Hi, how are you?
>>Will you be free tomorrow?
>>
```

Assistant:

```
>>Hi Alice!
>>Sorry, I am busy tomorrow.
// Next line is a message starting with 'How ab':
>>How
```

The model's output could be something like `about next week`. Note that Bob has already typed `How ab`, coreply will automatically detect the letters `ab` in the word `about` and show the final suggestion as `out next week`. The reason for such mechanism is that most LLMs are terrible at outputting partial words, giving lots of nonsence and typo, so we need to let it output the full word.

## Requirements of models and providers

-   The model must support **assistant message prefilling**. For obvious reasons shown above. [Claude](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prefill-claudes-response), [Groq](https://console.groq.com/docs/prompting), and many Llama and Qwen providers on [Openrouter](https://openrouter.ai/docs/requests) support this feature.
-   There must be some **stop sequence** controls. Some models have a limit on the number of stop sequences. Minimally, the model should support at least `>>` as the stop sequence. This is because the coreply prompt format uses `>>` to indicate the end of a message turn. Ideally, the model should support `>>`, `\n`, `//`, `,`,`!`, `?`, and other common punctuation marks as stop sequences to have the best experience.
-   LLMs larger than 7B parameters are likely to bring good results. Smaller models often struggle with context and coherence.

## Some personal recommendations

| These are my personal experience so far. |                   |
| ---------------------------------------- | ----------------- |
| Best results                             | Claude 3.5 Sonnet |
| Best results on a budget                 | Claude 3.5 Haiku  |
| Best Open source model                   | Gemma 2 27B       |
| Super cheap but still good               | Gemma 2 9B        |
| Best Open source if only English         | Llama 3.1/3.3 70B |

All models above could be found on [Openrouter](https://openrouter.ai/). Fast inference on open source models could be found on [Groq](https://console.groq.com/).

To Google and OpenAI: Please add prefill controls to your API. It would be a very useful feature.
