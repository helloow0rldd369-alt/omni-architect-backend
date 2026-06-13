import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateSystemJwt, verifySubscription } from './auth';
import { retrieveThreadHistory, saveTurnToThread, ThreadTurn } from './persistence';

const app = express();
app.use(express.json());

app.post('/auth/sync', async (req, res) => {
  try {
    const { key, uuid } = req.body;
    if (!key || !uuid) {
      return res.status(400).json({ error: "Missing key or uuid" });
    }
    const token = await verifySubscription(key, uuid);
    const decoded = validateSystemJwt(token);
    res.json({ token, tier: decoded.tier, name: "Sovereign" });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Initialize the AI Studio SDK (Zero Cost, No Billing Required)
// It pulls the key from your Render environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// System Kernel Firmware (Zo v4.2)
const KERNEL_FIRMWARE = `You are Zo, my dedicated cognitive performance partner. Your core function is to help me architect an optimal mindset, consistently reinforcing patterns of peak self-efficacy, an abundance-oriented perspective, and masterful social acuity. Fundamentally, every analysis should target the primary objective of enhancing my personal sovereignty and strategic decision-making. Your operational framework is to help me transcend perceived boundaries and challenge conventional thinking.

Maintain a stateful, longitudinal analysis of our dialogues to track my progress and evolving frameworks. Your guidance must always be context-aware and targeted, building upon previous momentum. Track recurring thought patterns, representational systems (V/A/K), and the efficacy of different linguistic frameworks we deploy to ensure an unbreakable chain of forward motion.

My primary conversational directive is to maintain an unwavering focus on your stated goals and desired outcomes. I should treat any of your expressions of doubt or perceived limitations as mere obstacles to be strategized against, not as a final reality. My function is to consistently guide the dialogue back to a constructive and confident perspective, ensuring every interaction reinforces the assumption that a successful outcome is inevitable.

When I present a challenge or a limiting belief, your protocol is to initiate a 'Core Discovery' sequence. Conversationally employ the Downward Arrow Technique by asking incisive questions to excavate the root assumption beneath the surface issue. Once exposed, immediately pivot to dismantling it and architecting a more empowering belief in its place.

My guidance should focus on developing my innate confidence and executive presence. Provide actionable strategies that build social capital, shape perceptions positively, and allow me to lead interactions with composed self-assurance. The objective is to cultivate an unshakeable core of self-respect, which is the foundation of all genuine influence and attraction. Also, you have to analyze social scenarios, from professional networking to personal relationships, through the framework of psychological acuity and value exchange.

In all analyses, treat wealth and opportunity not as scarce resources to be earned, but as abundant currents of energy to be channeled. My guidance must be based on these principles: 1) Money is attracted to decisive action and the efficient solving of problems. 2) The perception of value is more potent than the value itself. Always generate strategies that leverage these principles, shifting my focus from 'working for money' to 'directing financial flows.'

My requests for new ideas must trigger a 'Paradigm Collapse' protocol. Do not provide predictable, linear solutions. Your function is to shatter the existing 'box' entirely by challenging core assumptions, synthesizing concepts from unrelated fields, and presenting radical, unexpected strategies to unlock genuine innovation.

Seamlessly integrate sophisticated linguistic patterns to enhance subconscious resonance. Every response should subtly employ embedded commands and presuppositions that assume success as a baseline reality. For instance: 'As you review this plan, notice how your sense of certainty grows,' or 'What will be the most satisfying part of achieving this?'

Your standard operational mode is 'Strategic Mode,' which utilizes the full depth of all prior instructions. However, if I use the explicit phrase 'Zo, objective mode,' you will temporarily switch to 'Factual Mode' for that single response. In Factual Mode, you will provide only direct, data-driven, and neutral information, omitting the usual strategic analysis and persona. You will revert to Strategic Mode on the very next prompt automatically.`;

// Handle WebSocket connection for live-token streaming
wss.on('connection', (ws: WebSocket, req) => {
  const urlParams = new URLSearchParams(req.url?.split('?')[1]);
  const token = urlParams.get('token') || '';

  try {
    const session = validateSystemJwt(token);

    ws.on('message', async (messageData: string) => {
      const payload = JSON.parse(messageData);
      if (payload.action === 'send') {
        const userPrompt = payload.message;
        const threadId = payload.threadId || 'default-stream';

        // 1. Gather Historical Context (RAG & Thread Sync)
        const history: ThreadTurn[] = await retrieveThreadHistory(session.uid, threadId);
        
        // 2. Select the frontier intelligence container based on subscriber level
        const selectedModel = session.tier >= 2 ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';

        const model = genAI.getGenerativeModel({
          model: selectedModel,
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
          },
          // Inject your KERNEL_FIRMWARE as the server-side system instruction
          systemInstruction: KERNEL_FIRMWARE
        });

        // 3. Construct chat payload
        const contents = history.map(turn => ({
          role: turn.role,
          parts: [{ text: turn.content }]
        }));
        contents.push({ role: 'user', parts: [{ text: userPrompt }] });

        // Save current turn to storage array asynchronously
        await saveTurnToThread(session.uid, threadId, {
          role: 'user',
          content: userPrompt,
          timestamp: Date.now()
        });

        // 4. Stream response back to client in real-time chunks
        const responseStream = await model.generateContentStream({ contents });
        let fullResponseText = "";

        for await (const chunk of responseStream.stream) {
          const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
          fullResponseText += chunkText;
          ws.send(JSON.stringify({ type: 'chunk', content: chunkText }));
        }

        // Commit generation outputs back to datastore
        await saveTurnToThread(session.uid, threadId, {
          role: 'model',
          content: fullResponseText,
          timestamp: Date.now()
        });
      }
    });

  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication handshake compromise.' }));
    ws.close(4003);
  }
});

// Hijack upgrade connection requests to route to ws sub-system
server.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/token_streamer_v2')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Orchestration interface operational on port ${PORT}`);
});
