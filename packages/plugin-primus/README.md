# @elizaos/plugin-primus

This adapter integrates Primus Protocol into ElizaOS, enabling verifiable inference results from various AI model providers. It implements the `IVerifiableInferenceAdapter` interface, making it compatible with other verifiable inference solutions.

## Installation

```bash
pnpm add @elizaos/plugin-primus
```

## Configuration

Add the following environment variables to your `.env` file:

```env
PRIMUS_APP_ID=your_app_id
PRIMUS_APP_SECRET=your_app_secret

VERIFIABLE_INFERENCE_ENABLED=true # Set to true to enable verifiable inference
VERIFIABLE_INFERENCE_PROVIDER=primus # Options: primus, reclaim, opacity
```

## Usage

```typescript
import { PrimusAdapter } from "@elizaos/plugin-primus";
import { VerifiableInferenceOptions } from "@elizaos/core";

// Initialize the adapter
const primusAdapter = new PrimusAdapter(runtime, {
    appId: process.env.PRIMUS_APP_ID,
    appSecret: process.env.PRIMUS_APP_SECRET,
});

// Generate text with verifiable results
const options: VerifiableInferenceOptions = {
    // Optional: Override the default endpoint
    endpoint: "https://custom-api.example.com",
    // Optional: Add custom headers
    headers: {
        "X-Custom-Header": "value",
    },
    // Optional: Provider-specific options
    providerOptions: {
        temperature: 0.7,
    },
};

const result = await primusAdapter.generateText(
    "What is Node.js?",
    "gpt-4",
    options
);

console.log("Response:", result.text);
console.log("Proof:", result.proof);

// Verify the proof
const isValid = await primusAdapter.verifyProof(result);
console.log("Proof is valid:", isValid);
```

## Features

- Implements `IVerifiableInferenceAdapter` interface for standardized verifiable inference
- Zero-knowledge proofs for AI model responses
- Support for multiple AI model providers:
    - OpenAI
    - Anthropic
    - Google
    - More coming soon
- Customizable options for each request
- Built-in proof verification

## Response Format

The adapter returns a `VerifiableInferenceResult` object containing:

```typescript
{
    text: string;           // The generated text response
    proof: unknown;         // The proof data
    provider: string;       // The provider name (e.g., "primus")
    timestamp: number;      // Generation timestamp
    metadata?: {           // Optional metadata
        modelProvider: string;
        modelClass: string;
        endpoint: string;
    }
}
```

## How it Works

The Primus adapter wraps AI model API calls with zkTLS proofs using the `@primuslabs/zktls-core-sdk` library. This allows you to:

1. Make verifiable API calls to AI model providers
2. Generate proofs of the responses
3. Verify the authenticity of the responses
4. Ensure the responses haven't been tampered with

## License

MIT