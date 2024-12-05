[@ai16z/eliza v0.1.4-alpha.3](../index.md) / ITranscriptionService

# Interface: ITranscriptionService

## Extends

- [`Service`](../classes/Service.md)

## Accessors

### serviceType

#### Get Signature

> **get** **serviceType**(): [`ServiceType`](../enumerations/ServiceType.md)

##### Returns

[`ServiceType`](../enumerations/ServiceType.md)

#### Inherited from

[`Service`](../classes/Service.md).[`serviceType`](../classes/Service.md#serviceType-1)

#### Defined in

[packages/core/src/types.ts:973](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L973)

## Methods

### initialize()

> `abstract` **initialize**(`runtime`): `Promise`\<`void`\>

Add abstract initialize method that must be implemented by derived classes

#### Parameters

• **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Service`](../classes/Service.md).[`initialize`](../classes/Service.md#initialize)

#### Defined in

[packages/core/src/types.ts:978](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L978)

***

### transcribeAttachment()

> **transcribeAttachment**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1071](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1071)

***

### transcribeAttachmentLocally()

> **transcribeAttachmentLocally**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1072](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1072)

***

### transcribe()

> **transcribe**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1075](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1075)

***

### transcribeLocally()

> **transcribeLocally**(`audioBuffer`): `Promise`\<`string`\>

#### Parameters

• **audioBuffer**: `ArrayBuffer`

#### Returns

`Promise`\<`string`\>

#### Defined in

[packages/core/src/types.ts:1076](https://github.com/AIFlowML/eliza_aiflow/blob/main/packages/core/src/types.ts#L1076)
