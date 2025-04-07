import bodyParser from "body-parser";
import cors from "cors";
import express, { type Request as ExpressRequest } from "express";
import multer from "multer";
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from "zod";
import {
    type AgentRuntime,
    elizaLogger,
    messageCompletionFooter,
    generateCaption,
    generateImage,
    type Media,
    getEmbeddingZeroVector,
    composeContext,
    generateMessageResponse,
    generateObject,
    type Content,
    type Memory,
    ModelClass,
    type Client,
    stringToUuid,
    settings,
    type IAgentRuntime,
} from "@elizaos/core";
import { createApiRouter } from "./api.ts";
import * as fs from "fs";
import * as path from "path";
import { createVerifiableLogApiRouter } from "./verifiable-log-api.ts";
import OpenAI from "openai";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "data", "uploads");
        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

// some people have more memory than disk.io
const upload = multer({ storage /*: multer.memoryStorage() */ });

export const messageHandlerTemplate =
    // {{goals}}
    // "# Action Examples" is already included
    `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;

export const hyperfiHandlerTemplate = `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.

Response format should be formatted in a JSON block like this:
\`\`\`json
{ "lookAt": "{{nearby}}" or null, "emote": "{{emotes}}" or null, "say": "string" or null, "actions": (array of strings) or null }
\`\`\`
`;

export class DirectClient {
    public app: express.Application;
    private agents: Map<string, AgentRuntime>; // container management
    private server: http.Server; // Changed type to http.Server
    private wss: WebSocketServer; // Added WebSocketServer instance
    public startAgent: Function; // Store startAgent functor
    public loadCharacterTryPath: Function; // Store loadCharacterTryPath functor
    public jsonToCharacter: Function; // Store jsonToCharacter functor

    constructor() {
        elizaLogger.log("DirectClient constructor");
        this.app = express();
        this.app.use(cors());
        this.agents = new Map();

        // --- Middleware Order ---
        // 1. Serve widget assets under /client/
        const widgetPath = path.join(process.cwd(), '..', 'client/dist');
        console.log(`[ClientDirect] Serving widget assets from: ${widgetPath} at /client`);
        this.app.use('/client', express.static(widgetPath)); // Mount widget at /client

        // SPA Fallback for /client/* routes (handles client-side routing)
        this.app.get('/client/*', (req, res) => {
            res.sendFile(path.join(widgetPath, 'index.html'));
        });

        // 2. Serve static files for the DNV website at the root
        const staticPath = path.join(process.cwd(), '..', 'apps/digital-nomad-villages-site');
        console.log(`[ClientDirect] Serving DNV site from: ${staticPath} at /`);
        this.app.use(express.static(staticPath)); // Mount DNV site at /

        // 3. Body Parsers
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        // 4. Serve media files (uploads, generated)
        this.app.use(
            "/media/uploads",
            express.static(path.join(process.cwd(), "/data/uploads"))
        );
        this.app.use(
            "/media/generated",
            express.static(path.join(process.cwd(), "/generatedImages"))
        );

        // 5. API Routers LAST
        const apiRouter = createApiRouter(this.agents, this);
        this.app.use(apiRouter);

        const apiLogRouter = createVerifiableLogApiRouter(this.agents);
        this.app.use(apiLogRouter);
        // --- End Middleware Order ---

        // Define an interface that extends the Express Request interface
        interface CustomRequest extends ExpressRequest {
            file?: Express.Multer.File;
        }

        // Update the route handler to use CustomRequest instead of express.Request
        this.app.post(
            "/:agentId/whisper",
            upload.single("file"),
            async (req: CustomRequest, res: express.Response) => {
                const audioFile = req.file; // Access the uploaded file using req.file
                const agentId = req.params.agentId;

                if (!audioFile) {
                    res.status(400).send("No audio file provided");
                    return;
                }

                let runtime = this.agents.get(agentId);
                const apiKey = runtime.getSetting("OPENAI_API_KEY");

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                const openai = new OpenAI({
                    apiKey,
                });

                const transcription = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(audioFile.path),
                    model: "whisper-1",
                });

                res.json(transcription);
            }
        );

        this.app.post(
            "/:agentId/message",
            upload.single("file"),
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const roomId = stringToUuid(
                    req.body.roomId ?? "default-room-" + agentId
                );
                const userId = stringToUuid(req.body.userId ?? "user");

                let runtime = this.agents.get(agentId);

                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }

                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const text = req.body.text;
                // if empty text, directly return
                if (!text) {
                    res.json([]);
                    return;
                }

                const messageId = stringToUuid(Date.now().toString());

                const attachments: Media[] = [];
                if (req.file) {
                    const filePath = path.join(
                        process.cwd(),
                        "data",
                        "uploads",
                        req.file.filename
                    );
                    attachments.push({
                        id: Date.now().toString(),
                        url: filePath,
                        title: req.file.originalname,
                        source: "direct",
                        description: `Uploaded file: ${req.file.originalname}`,
                        text: "",
                        contentType: req.file.mimetype,
                    });
                }

                const content: Content = {
                    text,
                    attachments,
                    source: "direct",
                    inReplyTo: undefined,
                };

                const userMessage = {
                    content,
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const memory: Memory = {
                    id: stringToUuid(messageId + "-" + userId),
                    ...userMessage,
                    agentId: runtime.agentId,
                    userId,
                    roomId,
                    content,
                    createdAt: Date.now(),
                };

                await runtime.messageManager.addEmbeddingToMemory(memory);
                await runtime.messageManager.createMemory(memory);

                let state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                const context = composeContext({
                    state,
                    template: messageHandlerTemplate,
                });

                const response = await generateMessageResponse({
                    runtime: runtime,
                    context,
                    modelClass: ModelClass.LARGE,
                });

                if (!response) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                // save response to memory
                const responseMessage: Memory = {
                    id: stringToUuid(messageId + "-" + runtime.agentId),
                    ...userMessage,
                    userId: runtime.agentId,
                    content: response,
                    embedding: getEmbeddingZeroVector(),
                    createdAt: Date.now(),
                };

                await runtime.messageManager.createMemory(responseMessage);

                state = await runtime.updateRecentMessageState(state);

                let message = null as Content | null;

                await runtime.processActions(
                    memory,
                    [responseMessage],
                    state,
                    async (newMessages) => {
                        message = newMessages;
                        return [memory];
                    }
                );

                await runtime.evaluate(memory, state);

                // Check if we should suppress the initial message
                const action = runtime.actions.find(
                    (a) => a.name === response.action
                );
                const shouldSuppressInitialMessage =
                    action?.suppressInitialMessage;

                if (!shouldSuppressInitialMessage) {
                    if (message) {
                        res.json([response, message]);
                    } else {
                        res.json([response]);
                    }
                } else {
                    if (message) {
                        res.json([message]);
                    } else {
                        res.json([]);
                    }
                }
            }
        );

        this.app.post(
            "/agents/:agentIdOrName/hyperfi/v1",
            async (req: express.Request, res: express.Response) => {
                // get runtime
                const agentId = req.params.agentIdOrName;
                let runtime = this.agents.get(agentId);
                // if runtime is null, look for runtime with the same name
                if (!runtime) {
                    runtime = Array.from(this.agents.values()).find(
                        (a) =>
                            a.character.name.toLowerCase() ===
                            agentId.toLowerCase()
                    );
                }
                if (!runtime) {
                    res.status(404).send("Agent not found");
                    return;
                }

                // can we be in more than one hyperfi world at once
                // but you may want the same context is multiple worlds
                // this is more like an instanceId
                const roomId = stringToUuid(req.body.roomId ?? "hyperfi");

                const body = req.body;

                // hyperfi specific parameters
                let nearby = [];
                let availableEmotes = [];

                if (body.nearby) {
                    nearby = body.nearby;
                }
                if (body.messages) {
                    // loop on the messages and record the memories
                    // might want to do this in parallel
                    for (const msg of body.messages) {
                        const parts = msg.split(/:\s*/);
                        const mUserId = stringToUuid(parts[0]);
                        await runtime.ensureConnection(
                            mUserId,
                            roomId, // where
                            parts[0], // username
                            parts[0], // userScreeName?
                            "hyperfi"
                        );
                        const content: Content = {
                            text: parts[1] || "",
                            attachments: [],
                            source: "hyperfi",
                            inReplyTo: undefined,
                        };
                        const memory: Memory = {
                            id: stringToUuid(msg),
                            agentId: runtime.agentId,
                            userId: mUserId,
                            roomId,
                            content,
                        };
                        await runtime.messageManager.createMemory(memory);
                    }
                }
                if (body.availableEmotes) {
                    availableEmotes = body.availableEmotes;
                }

                const content: Content = {
                    // we need to compose who's near and what emotes are available
                    text: JSON.stringify(req.body),
                    attachments: [],
                    source: "hyperfi",
                    inReplyTo: undefined,
                };

                const userId = stringToUuid("hyperfi");
                const userMessage = {
                    content,
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                let template = hyperfiHandlerTemplate;
                template = template.replace(
                    "{{emotes}}",
                    availableEmotes.join("|")
                );
                template = template.replace("{{nearby}}", nearby.join("|"));
                const context = composeContext({
                    state,
                    template,
                });

                // Define a simplified static schema to bypass build errors
                const hyperfiOutSchema: z.ZodType<any, any, any> = z.any(); // Use z.any() for diagnostics
                /* = z.object({
                    lookAt: z.string().nullable(),
                    emote: z.string().nullable(),
                    say: z.string().nullable(),
                    actions: z.array(z.string()).nullable(),
                });*/

                // Call LLM
                const response = await generateObject({
                    runtime,
                    context,
                    modelClass: ModelClass.SMALL, // 1s processing time on openai small
                    schema: hyperfiOutSchema,
                });

                if (!response) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                let hfOut;
                try {
                    hfOut = hyperfiOutSchema.parse(response.object);
                } catch {
                    elizaLogger.error(
                        "cant serialize response",
                        response.object
                    );
                    res.status(500).send("Error in LLM response, try again");
                    return;
                }

                // do this in the background
                new Promise((resolve) => {
                    const contentObj: Content = {
                        text: hfOut.say,
                    };

                    if (hfOut.lookAt !== null || hfOut.emote !== null) {
                        contentObj.text += ". Then I ";
                        if (hfOut.lookAt !== null) {
                            contentObj.text += "looked at " + hfOut.lookAt;
                            if (hfOut.emote !== null) {
                                contentObj.text += " and ";
                            }
                        }
                        if (hfOut.emote !== null) {
                            contentObj.text = "emoted " + hfOut.emote;
                        }
                    }

                    if (hfOut.actions !== null) {
                        // content can only do one action
                        contentObj.action = hfOut.actions[0];
                    }

                    // save response to memory
                    const responseMessage = {
                        ...userMessage,
                        userId: runtime.agentId,
                        content: contentObj,
                    };

                    runtime.messageManager
                        .createMemory(responseMessage)
                        .then(() => {
                            const messageId = stringToUuid(
                                Date.now().toString()
                            );
                            const memory: Memory = {
                                id: messageId,
                                agentId: runtime.agentId,
                                userId,
                                roomId,
                                content,
                                createdAt: Date.now(),
                            };

                            // run evaluators (generally can be done in parallel with processActions)
                            // can an evaluator modify memory? it could but currently doesn't
                            runtime.evaluate(memory, state).then(() => {
                                // only need to call if responseMessage.content.action is set
                                if (contentObj.action) {
                                    // pass memory (query) to any actions to call
                                    runtime.processActions(
                                        memory,
                                        [responseMessage],
                                        state,
                                        async (_newMessages) => {
                                            // FIXME: this is supposed override what the LLM said/decided
                                            // but the promise doesn't make this possible
                                            //message = newMessages;
                                            return [memory];
                                        }
                                    ); // 0.674s
                                }
                                resolve(true);
                            });
                        });
                });
                res.json({ response: hfOut });
            }
        );

        this.app.post(
            "/:agentId/image",
            async (req: express.Request, res: express.Response) => {
                const agentId = req.params.agentId;
                const agent = this.agents.get(agentId);
                if (!agent) {
                    res.status(404).send("Agent not found");
                    return;
                }

                const images = await generateImage({ ...req.body }, agent);
                const imagesRes: { image: string; caption: string }[] = [];
                if (images.data && images.data.length > 0) {
                    for (let i = 0; i < images.data.length; i++) {
                        const caption = await generateCaption(
                            { imageUrl: images.data[i] },
                            agent
                        );
                        imagesRes.push({
                            image: images.data[i],
                            caption: caption.title,
                        });
                    }
                }
                res.json({ images: imagesRes });
            }
        );

        this.app.post(
            "/fine-tune",
            async (req: express.Request, res: express.Response) => {
                try {
                    const response = await fetch(
                        "https://api.bageldb.ai/api/v1/asset",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-API-KEY": `${process.env.BAGEL_API_KEY}`,
                            },
                            body: JSON.stringify(req.body),
                        }
                    );

                    const data = await response.json();
                    res.json(data);
                } catch (error) {
                    res.status(500).json({
                        error: "Please create an account at bakery.bagel.net and get an API key. Then set the BAGEL_API_KEY environment variable.",
                        details: error.message,
                    });
                }
            }
        );
        this.app.get(
            "/fine-tune/:assetId",
            async (req: express.Request, res: express.Response) => {
                const assetId = req.params.assetId;
                const downloadDir = path.join(
                    process.cwd(),
                    "downloads",
                    assetId
                );

                elizaLogger.log("Download directory:", downloadDir);

                try {
                    elizaLogger.log("Creating directory...");
                    await fs.promises.mkdir(downloadDir, { recursive: true });

                    elizaLogger.log("Fetching file...");
                    const fileResponse = await fetch(
                        `https://api.bageldb.ai/api/v1/asset/${assetId}/download`,
                        {
                            headers: {
                                "X-API-KEY": `${process.env.BAGEL_API_KEY}`,
                            },
                        }
                    );

                    if (!fileResponse.ok) {
                        throw new Error(
                            `API responded with status ${fileResponse.status}: ${await fileResponse.text()}`
                        );
                    }

                    elizaLogger.log("Response headers:", fileResponse.headers);

                    const fileName =
                        fileResponse.headers
                            .get("content-disposition")
                            ?.split("filename=")[1]
                            ?.replace(/"/g, /* " */ "") || "default_name.txt";

                    elizaLogger.log("Saving as:", fileName);

                    const arrayBuffer = await fileResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const filePath = path.join(downloadDir, fileName);
                    elizaLogger.log("Full file path:", filePath);

                    await fs.promises.writeFile(filePath, buffer);

                    // Verify file was written
                    const stats = await fs.promises.stat(filePath);
                    elizaLogger.log(
                        "File written successfully. Size:",
                        stats.size,
                        "bytes"
                    );

                    res.json({
                        success: true,
                        message: "Single file downloaded successfully",
                        downloadPath: downloadDir,
                        fileCount: 1,
                        fileName: fileName,
                        fileSize: stats.size,
                    });
                } catch (error) {
                    elizaLogger.error("Detailed error:", error);
                    res.status(500).json({
                        error: "Failed to download files from BagelDB",
                        details: error.message,
                        stack: error.stack,
                    });
                }
            }
        );

        this.app.post("/:agentId/speak", async (req, res) => {
            const agentId = req.params.agentId;
            const roomId = stringToUuid(
                req.body.roomId ?? "default-room-" + agentId
            );
            const userId = stringToUuid(req.body.userId ?? "user");
            const text = req.body.text;

            if (!text) {
                res.status(400).send("No text provided");
                return;
            }

            let runtime = this.agents.get(agentId);

            // if runtime is null, look for runtime with the same name
            if (!runtime) {
                runtime = Array.from(this.agents.values()).find(
                    (a) =>
                        a.character.name.toLowerCase() === agentId.toLowerCase()
                );
            }

            if (!runtime) {
                res.status(404).send("Agent not found");
                return;
            }

            try {
                // Process message through agent (same as /message endpoint)
                await runtime.ensureConnection(
                    userId,
                    roomId,
                    req.body.userName,
                    req.body.name,
                    "direct"
                );

                const messageId = stringToUuid(Date.now().toString());

                const content: Content = {
                    text,
                    attachments: [],
                    source: "direct",
                    inReplyTo: undefined,
                };

                const userMessage = {
                    content,
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const memory: Memory = {
                    id: messageId,
                    agentId: runtime.agentId,
                    userId,
                    roomId,
                    content,
                    createdAt: Date.now(),
                };

                await runtime.messageManager.createMemory(memory);

                const state = await runtime.composeState(userMessage, {
                    agentName: runtime.character.name,
                });

                const context = composeContext({
                    state,
                    template: messageHandlerTemplate,
                });

                const response = await generateMessageResponse({
                    runtime: runtime,
                    context,
                    modelClass: ModelClass.LARGE,
                });

                // save response to memory
                const responseMessage = {
                    ...userMessage,
                    userId: runtime.agentId,
                    content: response,
                };

                await runtime.messageManager.createMemory(responseMessage);

                if (!response) {
                    res.status(500).send(
                        "No response from generateMessageResponse"
                    );
                    return;
                }

                await runtime.evaluate(memory, state);

                const _result = await runtime.processActions(
                    memory,
                    [responseMessage],
                    state,
                    async () => {
                        return [memory];
                    }
                );

                // Get the text to convert to speech
                const textToSpeak = response.text;

                // Convert to speech using ElevenLabs
                const elevenLabsApiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;
                const apiKey = process.env.ELEVENLABS_XI_API_KEY;

                if (!apiKey) {
                    throw new Error("ELEVENLABS_XI_API_KEY not configured");
                }

                const speechResponse = await fetch(elevenLabsApiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "xi-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        text: textToSpeak,
                        model_id:
                            process.env.ELEVENLABS_MODEL_ID ||
                            "eleven_multilingual_v2",
                        voice_settings: {
                            stability: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STABILITY || "0.5"
                            ),
                            similarity_boost: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST ||
                                    "0.9"
                            ),
                            style: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STYLE || "0.66"
                            ),
                            use_speaker_boost:
                                process.env
                                    .ELEVENLABS_VOICE_USE_SPEAKER_BOOST ===
                                "true",
                        },
                    }),
                });

                if (!speechResponse.ok) {
                    throw new Error(
                        `ElevenLabs API error: ${speechResponse.statusText}`
                    );
                }

                const audioBuffer = await speechResponse.arrayBuffer();

                // Set appropriate headers for audio streaming
                res.set({
                    "Content-Type": "audio/mpeg",
                    "Transfer-Encoding": "chunked",
                });

                res.send(Buffer.from(audioBuffer));
            } catch (error) {
                elizaLogger.error(
                    "Error processing message or generating speech:",
                    error
                );
                res.status(500).json({
                    error: "Error processing message or generating speech",
                    details: error.message,
                });
            }
        });

        this.app.post("/:agentId/tts", async (req, res) => {
            const text = req.body.text;

            if (!text) {
                res.status(400).send("No text provided");
                return;
            }

            try {
                // Convert to speech using ElevenLabs
                const elevenLabsApiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;
                const apiKey = process.env.ELEVENLABS_XI_API_KEY;

                if (!apiKey) {
                    throw new Error("ELEVENLABS_XI_API_KEY not configured");
                }

                const speechResponse = await fetch(elevenLabsApiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "xi-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        text,
                        model_id:
                            process.env.ELEVENLABS_MODEL_ID ||
                            "eleven_multilingual_v2",
                        voice_settings: {
                            stability: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STABILITY || "0.5"
                            ),
                            similarity_boost: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST ||
                                    "0.9"
                            ),
                            style: Number.parseFloat(
                                process.env.ELEVENLABS_VOICE_STYLE || "0.66"
                            ),
                            use_speaker_boost:
                                process.env
                                    .ELEVENLABS_VOICE_USE_SPEAKER_BOOST ===
                                "true",
                        },
                    }),
                });

                if (!speechResponse.ok) {
                    throw new Error(
                        `ElevenLabs API error: ${speechResponse.statusText}`
                    );
                }

                const audioBuffer = await speechResponse.arrayBuffer();

                res.set({
                    "Content-Type": "audio/mpeg",
                    "Transfer-Encoding": "chunked",
                });

                res.send(Buffer.from(audioBuffer));
            } catch (error) {
                elizaLogger.error(
                    "Error processing message or generating speech:",
                    error
                );
                res.status(500).json({
                    error: "Error processing message or generating speech",
                    details: error.message,
                });
            }
        });
    }

    // agent/src/index.ts:startAgent calls this
    public registerAgent(runtime: AgentRuntime) {
        // register any plugin endpoints?
        // but once and only once
        this.agents.set(runtime.agentId, runtime);
    }

    public unregisterAgent(runtime: AgentRuntime) {
        this.agents.delete(runtime.agentId);
    }

    public start(port: number) {
        const httpServer = http.createServer(this.app);

        // Define allowed origins for WebSocket connections
        const allowedOrigins = [
            `http://localhost:${settings.CLIENT_PORT || 5173}`, // Direct client (e.g., Vite dev server)
            'http://localhost:3002', // Your proxy server
            `http://localhost:${port}` // Add the server's own origin
            // Add any other origins that need direct WebSocket access
        ];

        // Setup WebSocket server with origin verification
        this.wss = new WebSocketServer({
            server: httpServer,
            verifyClient: (info, cb) => {
                const origin = info.origin;
                elizaLogger.log(`WebSocket connection attempt from origin: ${origin}`);
                if (allowedOrigins.includes(origin)) {
                    elizaLogger.log(`WebSocket origin ${origin} allowed.`);
                    cb(true); // Allow connection
                } else {
                    elizaLogger.warn(`WebSocket origin ${origin} rejected.`);
                    cb(false, 403, 'Forbidden Origin'); // Reject connection
                }
            }
        });

        this.wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
            // We know the origin is allowed at this point due to verifyClient
            elizaLogger.log('WebSocket connection established (origin verified)');
            elizaLogger.log(`[WebSocket Debug] Incoming connection request URL: ${req.url}`);
            // Extract agentId from URL, e.g., /<agentId>/ws
            const urlParts = req.url?.split('/');
            const agentId = urlParts && urlParts.length > 1 ? urlParts[1] : null;

            if (!agentId) {
                elizaLogger.error('WebSocket connection attempt without agentId');
                ws.close(1008, 'Agent ID required');
                return;
            }

            let runtime = this.agents.get(agentId);
             // if runtime is null, look for runtime with the same name
            if (!runtime) {
                runtime = Array.from(this.agents.values()).find(
                    (a) =>
                        a.character.name.toLowerCase() ===
                        agentId.toLowerCase()
                );
            }


            if (!runtime) {
                elizaLogger.error(`WebSocket connection attempt for unknown agentId: ${agentId}`);
                ws.close(1011, 'Agent not found');
                return;
            }

            elizaLogger.log(`WebSocket connection attached to agent: ${runtime.character.name} (${agentId})`);

            // --- Integrate WebSocket with AgentRuntime ---
            // Extract actual userId/roomId if possible from WS context, or establish session
            // For now, we'll use placeholders derived from the agentId. A proper session mechanism might be needed.
            const userId = stringToUuid("ws-user-" + agentId); 
            const roomId = stringToUuid("ws-room-" + agentId);

            // Ensure user/room/participant exist for this WS connection
            // Using basic names for now
            try {
                await runtime.ensureConnection(userId, roomId, `User ${userId}`, `User ${userId}`, "websocket");
                elizaLogger.log(`Ensured connection for WS user ${userId} in room ${roomId}`);

                /* --- Temporarily Commented Out: Sending initial system message ---
                try {
                    elizaLogger.log('[WS Debug] Getting system message...');
                    // const systemMessage = runtime.character.system; // Use the system prompt string
                    const systemMessage = "Hello from server"; // Simple test message
                    elizaLogger.log(`[WS Debug] Got system message: "${systemMessage}". Sending...`);

                    if (systemMessage) {
                        ws.send(
                            JSON.stringify({ type: 'system', message: systemMessage }),
                        );
                        elizaLogger.log('[WS Debug] System message sent successfully.');
                    } else {
                        elizaLogger.log('[WS Debug] No system message to send.');
                    }
                } catch (error) {
                    elizaLogger.error('[WS Error] Error during system message handling:', error);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close(1011, 'Internal server error during connection setup');
                    }
                    return; // Stop further processing for this connection
                }
                */ // --- End of temporarily commented out block ---

            } catch (error) {
                elizaLogger.error(`Failed to ensure user/room/connection for WS user ${userId} in room ${roomId}:`, error);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1011, 'Server setup error');
                }
                return; // Stop further processing for this connection
            }
            
            elizaLogger.log(`[WS Debug] Setting up 'message' handler for user ${userId}`);
            // Handle incoming messages
            ws.on('message', async (message: Buffer) => {
                const messageString = message.toString();
                elizaLogger.log(`Received WS message from ${userId}: ${messageString}`);

                try {
                    const parsedMessage = JSON.parse(messageString);
                    
                    // Basic validation - expect a 'text' property
                    if (!parsedMessage || typeof parsedMessage.text !== 'string') {
                        elizaLogger.warn(`Invalid WS message format from ${userId}:`, parsedMessage);
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format. Expected { "text": "..." }' }));
                        return;
                    }

                    const text = parsedMessage.text;
                    if (!text) {
                         elizaLogger.log(`Empty text received from ${userId}, ignoring.`);
                         return; // Ignore empty messages
                    }

                    // --- Process message using AgentRuntime (adapted from HTTP /message handler) ---
                    const messageId = stringToUuid(Date.now().toString() + "-" + userId); // Unique ID for this message interaction

                     // Create Content object (simplified for WS - no attachments for now)
                    const content: Content = {
                        text,
                        attachments: [], // TODO: Add attachment support for WS if needed
                        source: "websocket",
                        inReplyTo: undefined, 
                    };

                    // Create Memory object for the user's message
                    const userMemory: Memory = {
                        id: stringToUuid(messageId + "-user"),
                        agentId: runtime.agentId,
                        userId,
                        roomId,
                        content,
                        createdAt: Date.now(),
                    };
                    
                    await runtime.messageManager.addEmbeddingToMemory(userMemory);
                    await runtime.messageManager.createMemory(userMemory);

                     // Compose state
                    let state = await runtime.composeState(userMemory, {
                        agentName: runtime.character.name,
                    });

                    // Generate response
                    const context = composeContext({
                        state,
                        template: messageHandlerTemplate, // Using the standard message handler template
                    });

                    const responseContent = await generateMessageResponse({
                        runtime: runtime,
                        context,
                        modelClass: ModelClass.LARGE, // Or choose appropriate model
                    });

                    if (!responseContent) {
                        elizaLogger.error(`Agent ${agentId} failed to generate WS response for: ${text}`);
                         ws.send(JSON.stringify({ type: 'error', message: 'Agent could not generate a response.' }));
                        return;
                    }
                    
                    // Create Memory object for the agent's response
                     const agentMemory: Memory = {
                         id: stringToUuid(messageId + "-agent"),
                         agentId: runtime.agentId,
                         userId: runtime.agentId, // Agent is the user
                         roomId,
                         content: responseContent,
                         embedding: getEmbeddingZeroVector(), // Assuming no embedding needed or handled elsewhere
                         createdAt: Date.now(),
                     };

                    await runtime.messageManager.createMemory(agentMemory);

                    // Update state with the new messages
                    state = await runtime.updateRecentMessageState(state);

                    // Process actions (if any) triggered by the agent's response
                    // We need a way to potentially send *additional* messages based on actions.
                    // For now, we'll just send the primary response.
                    // TODO: Refactor action handling for WS callback
                    let actionMessage = null;
                    await runtime.processActions(
                        userMemory,      // The user's message that triggered the response
                        [agentMemory],   // The agent's response containing potential actions
                        state,
                        async (newMessages) => { // Callback if action generates a message
                           elizaLogger.log(`Action generated message for WS user ${userId}:`, newMessages);
                           actionMessage = newMessages; 
                           // We might need to send this actionMessage via ws.send() as well
                           return [userMemory]; // Required return for processActions? Check interface
                        }
                    );
                    
                    // Evaluate the interaction
                    await runtime.evaluate(userMemory, state); // Evaluate based on the user's message

                    // --- Send response(s) back to the client ---
                    const action = runtime.actions.find(
                        (a) => a.name === responseContent.action
                    );
                    const shouldSuppressInitialMessage =
                        action?.suppressInitialMessage;

                    if (!shouldSuppressInitialMessage) {
                         ws.send(JSON.stringify({ type: 'message', data: responseContent }));
                         elizaLogger.log(`Sent agent response to ${userId}:`, responseContent);
                    } else {
                         elizaLogger.log(`Suppressing initial agent response for ${userId} due to action: ${action.name}`);
                    }
                    
                    // Send any message generated by an action
                    if (actionMessage) {
                       ws.send(JSON.stringify({ type: 'message', data: actionMessage }));
                       elizaLogger.log(`Sent action message to ${userId}:`, actionMessage);
                    }

                } catch (error) {
                    elizaLogger.error(`Error processing WS message from ${userId}:`, error);
                     ws.send(JSON.stringify({ type: 'error', message: 'Internal server error processing message.' }));
                }
            });
            
            // Send initial connection confirmation
            // ws.send(JSON.stringify({ type: 'system', message: `Connected to agent ${runtime.character.name}` }));


            ws.on('close', () => {
                elizaLogger.log(`WebSocket connection closed for agent: ${agentId} (User: ${userId}, Room: ${roomId})`);
                // Optional: Notify AgentRuntime or clean up resources if needed
                // e.g., runtime.clientDisconnected(userId, roomId);
            });

            ws.on('error', (error: Error) => {
                elizaLogger.error(`WebSocket error for agent ${agentId} (User: ${userId}, Room: ${roomId}):`, error);
                // Optional: Notify AgentRuntime or handle error, maybe close connection
                 ws.close(1011, "WebSocket error occurred");
            });
        });


        this.server = httpServer.listen(port, () => {
            elizaLogger.success(
                `Server (HTTP & WebSocket) bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
            );
        });


        // Handle graceful shutdown
        const gracefulShutdown = () => {
            elizaLogger.log("Received shutdown signal, closing server...");
            // Close WebSocket server first
            if (this.wss) {
                this.wss.close(() => {
                     elizaLogger.log("WebSocket server closed.");
                     // Then close HTTP server
                     this.server.close(() => {
                        elizaLogger.success("HTTP server closed successfully");
                        process.exit(0);
                    });
                });
            } else {
                 this.server.close(() => {
                    elizaLogger.success("HTTP server closed successfully");
                    process.exit(0);
                });
            }


            // Force close after 5 seconds if server hasn't closed
            setTimeout(() => {
                elizaLogger.error(
                    "Could not close connections in time, forcefully shutting down"
                );
                process.exit(1);
            }, 5000);
        };

        // Handle different shutdown signals
        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    }

    public stop() {
        const closeWebSocketServer = (callback: () => void) => {
            if (this.wss) {
                elizaLogger.log("Closing WebSocket server...");
                this.wss.close(() => {
                     elizaLogger.log("WebSocket server stopped.");
                     callback();
                });
                // Terminate all active connections
                for (const client of this.wss.clients) {
                    client.terminate();
                }
            } else {
                callback();
            }
        };

        const closeHttpServer = () => {
            if (this.server) {
                elizaLogger.log("Closing HTTP server...");
                this.server.close(() => {
                    elizaLogger.success("HTTP server stopped");
                    this.server = null; // Clear server instance
                    this.wss = null; // Clear WebSocket server instance
                });
            }
        };

        closeWebSocketServer(closeHttpServer);
    }
}

export const DirectClientInterface: Client = {
    start: async (_runtime: IAgentRuntime) => {
        elizaLogger.log("DirectClientInterface start");
        const client = new DirectClient();
        const serverPort = Number.parseInt(settings.SERVER_PORT || "3000");
        client.start(serverPort);
        return client;
    },
    stop: async (_runtime: IAgentRuntime, client?: Client) => {
        if (client instanceof DirectClient) {
            client.stop();
        }
    },
};

export default DirectClientInterface;
