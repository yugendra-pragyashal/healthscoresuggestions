
import { GoogleGenAI, Type } from "@google/genai";
import type { HealthData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    healthScore: {
      type: Type.INTEGER,
      description: "A health score from 0 to 100, where 100 is excellent health."
    },
    generalSuggestions: {
      type: Type.ARRAY,
      description: "An array of 3-5 general, actionable health suggestions.",
      items: {
        type: Type.OBJECT,
        properties: {
          suggestion: { type: Type.STRING, description: "The specific suggestion text." },
          completed: { type: Type.BOOLEAN, description: "Set to false by default." },
        },
        required: ["suggestion", "completed"],
      }
    },
    dailyPlan: {
      type: Type.ARRAY,
      description: "A detailed 14-day action plan.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: "The day number, from 1 to 14." },
          title: { type: Type.STRING, description: "An encouraging title for the day's tasks." },
          tasks: {
            type: Type.ARRAY,
            description: "A list of 2-3 specific tasks for the day.",
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING, description: "The specific task text." },
                completed: { type: Type.BOOLEAN, description: "Set to false by default." }
              },
              required: ["task", "completed"],
            }
          }
        },
        required: ["day", "title", "tasks"],
      }
    }
  },
  required: ["healthScore", "generalSuggestions", "dailyPlan"],
};

export const analyzeHealthReport = async (reportText: string): Promise<HealthData> => {
  try {
    const prompt = `
      You are a helpful and positive AI health assistant. Analyze the following health report text.
      Based on the metrics provided, generate a health score from 0 to 100, where 100 represents perfect health.
      Also, provide a list of general actionable suggestions for improvement.
      Finally, create a detailed 14-day action plan with a unique, encouraging title and specific daily tasks.
      Your response must be in JSON format and adhere to the provided schema.

      Health Report Text:
      ---
      ${reportText}
      ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);
    
    // Ensure the structure matches HealthData
    if (
        typeof parsedData.healthScore !== 'number' ||
        !Array.isArray(parsedData.generalSuggestions) ||
        !Array.isArray(parsedData.dailyPlan)
    ) {
        throw new Error("AI response does not match the expected HealthData structure.");
    }

    const initialScore = parsedData.healthScore;

    // Set both base score and current score to the initial AI-generated score
    return {
        ...parsedData,
        healthScore: initialScore,
        baseHealthScore: initialScore,
    } as HealthData;

  } catch (error) {
    console.error("Error analyzing health report with Gemini:", error);
    throw new Error("Failed to analyze the health report. The AI model may be temporarily unavailable.");
  }
};