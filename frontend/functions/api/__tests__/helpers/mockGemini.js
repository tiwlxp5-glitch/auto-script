/**
 * Mock Google GenAI Client Simulation (@google/genai)
 */
export class MockGeminiManager {
  constructor() {
    this.generateCalls = [];
    this.failGenerate = false;
    this.generateErrorMessage = "Google GenAI API call failed: QuotaExceeded";
    this.customResponseText = null;
    this.returnInvalidJson = false;
  }

  reset() {
    this.generateCalls = [];
    this.failGenerate = false;
    this.customResponseText = null;
    this.returnInvalidJson = false;
  }

  getDefaultScriptResponse(_promptContents = "") {
    return JSON.stringify({
      metadata: {
        target_audience_persona: "ผู้ใช้งานทั่วไปที่ต้องการประหยัดเวลา",
        primary_psychological_trigger: "FOMO & Social Proof",
        estimated_duration_seconds: 30
      },
      script_blocks: [
        {
          timestamp: "0-3s",
          phase: "Hook",
          visual_direction: "โคลสอัพหน้าตกใจ แล้วชี้ไปที่ปัญหา",
          audio_spoken: "แก... รู้ยังว่าตอนนี้ไม่ต้องเสียเวลาทำเองแล้วอ่ะ!",
          subtext_emotion: "ตื่นเต้น ประหลาดใจ"
        },
        {
          timestamp: "3-15s",
          phase: "Agitation & Solution",
          visual_direction: "หยิบสินค้าขึ้นมาสาธิตการใช้งานแบบรวดเร็ว",
          audio_spoken: "เมื่อก่อนคือนั่งปวดหัวเป็นชั่วโมง แต่พอมีตัวนี้คือจบใน 1 นาที",
          subtext_emotion: "โล่งใจ มั่นใจ"
        },
        {
          timestamp: "15-30s",
          phase: "CTA",
          visual_direction: "ชี้นิ้วไปที่ตะกร้าเหลืองมุมซ้ายล่าง",
          audio_spoken: "ตอนนี้มีโปร 1 แถม 1 กดที่ตะกร้าด่วนก่อนหมดโปรนะแก",
          subtext_emotion: "เร่งรีบ กระตุ้นการตัดสินใจ"
        }
      ]
    });
  }

  createGoogleGenAIClass() {
    const manager = this;

    class MockGoogleGenAI {
      constructor(options = {}) {
        this.apiKey = options.apiKey;
        this.models = {
          generateContent: async (params) => {
            manager.generateCalls.push({
              apiKey: this.apiKey,
              ...params
            });

            if (manager.failGenerate) {
              throw new Error(manager.generateErrorMessage);
            }

            if (manager.returnInvalidJson) {
              return { text: "This is not valid JSON from AI" };
            }

            if (manager.customResponseText !== null) {
              return { text: manager.customResponseText };
            }

            return { text: manager.getDefaultScriptResponse(params.contents) };
          }
        };
      }
    }

    return MockGoogleGenAI;
  }
}

export const globalMockGemini = new MockGeminiManager();
