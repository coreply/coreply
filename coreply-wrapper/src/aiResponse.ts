import { generateText } from 'ai';
import { createGateway } from "ai";

const gateway = createGateway({apiKey:""})

export async function displayAIResponse(element: HTMLElement){
    const { text } = await generateText({model:gateway("google/gemini-2.5-flash-lite"), prompt: "What is the capital of Sweden? Answer in one sentence."});
    element.innerHTML = text;
}

export async function generateAIResponse(){
    const { text } = await generateText({model:gateway("google/gemini-2.5-flash-lite"), prompt: "What is the capital of France? Answer in one sentence.",
        providerOptions:{
            vertex:{
                thinkingConfig:{
                    thinkingBudget: 0
                }
            }
        }
    });
    return text;
}