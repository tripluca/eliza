import { parseBooleanFromText, IAgentRuntime } from "@elizaos/core";
import { z, ZodError } from "zod";

export const DEFAULT_MAX_TWEET_LENGTH = 280;

const twitterUsernameSchema = z.string()
    .min(1)
    .max(15)
    .regex(
        /^[A-Za-z][A-Za-z0-9_]*[A-Za-z0-9]$|^[A-Za-z]$/,
        "Invalid Twitter username format"
    );

/**
 * This schema defines all required/optional environment settings,
 * including new fields like TWITTER_SPACES_ENABLE.
 */
export const twitterEnvSchema = z.object({
    TWITTER_DRY_RUN: z.boolean(),
    TWITTER_USERNAME: z.string().min(1, "Twitter username is required"),
    TWITTER_PASSWORD: z.string().min(1, "Twitter password is required"),
    TWITTER_EMAIL: z.string().email("Valid Twitter email is required"),
    MAX_TWEET_LENGTH: z.number().int().default(DEFAULT_MAX_TWEET_LENGTH),
    TWITTER_SEARCH_ENABLE: z.boolean().default(false),
    TWITTER_2FA_SECRET: z.string(),
    TWITTER_RETRY_LIMIT: z.number().int(),
    TWITTER_POLL_INTERVAL: z.number().int(),
    TWITTER_TARGET_USERS: z.array(twitterUsernameSchema).default([]),
    // I guess it's possible to do the transformation with zod
    // not sure it's preferable, maybe a readability issue
    // since more people will know js/ts than zod
    /*
        z
        .string()
        .transform((val) => val.trim())
        .pipe(
            z.string()
                .transform((val) =>
                    val ? val.split(',').map((u) => u.trim()).filter(Boolean) : []
                )
                .pipe(
                    z.array(
                        z.string()
                            .min(1)
                            .max(15)
                            .regex(
                                /^[A-Za-z][A-Za-z0-9_]*[A-Za-z0-9]$|^[A-Za-z]$/,
                                'Invalid Twitter username format'
                            )
                    )
                )
                .transform((users) => users.join(','))
        )
        .optional()
        .default(''),
    */
    POST_INTERVAL_MIN: z.number().int(),
    POST_INTERVAL_MAX: z.number().int(),
    ENABLE_ACTION_PROCESSING: z.boolean(),
    ACTION_INTERVAL: z.number().int(),
    POST_IMMEDIATELY: z.boolean(),
    TWITTER_SPACES_ENABLE: z.boolean().default(false),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

/**
 * Helper to parse a comma-separated list of Twitter usernames
 * (already present in your code).
 */
function parseTargetUsers(targetUsersStr?: string | null): string[] {
    if (!targetUsersStr?.trim()) {
        return [];
    }
    return targetUsersStr
        .split(",")
        .map((user) => user.trim())
        .filter(Boolean);
}

function safeParseInt(value: string | undefined | null, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : Math.max(1, parsed);
}

/**
 * Validates or constructs a TwitterConfig object using zod,
 * taking values from the IAgentRuntime or process.env as needed.
 */
export async function validateTwitterConfig(runtime: IAgentRuntime): Promise<TwitterConfig> {
    try {
        const twitterConfig = {
            TWITTER_DRY_RUN:
                parseBooleanFromText(
                    runtime.getSetting("TWITTER_DRY_RUN") ||
                    process.env.TWITTER_DRY_RUN
                ) ?? false, // parseBooleanFromText return null if "", map "" to false

            TWITTER_USERNAME:
                runtime.getSetting("TWITTER_USERNAME") ||
                process.env.TWITTER_USERNAME,

            TWITTER_PASSWORD:
                runtime.getSetting("TWITTER_PASSWORD") ||
                process.env.TWITTER_PASSWORD,

            TWITTER_EMAIL:
                runtime.getSetting("TWITTER_EMAIL") ||
                process.env.TWITTER_EMAIL,

            MAX_TWEET_LENGTH:
                safeParseInt(
                    runtime.getSetting("MAX_TWEET_LENGTH") ||
                    process.env.MAX_TWEET_LENGTH,
                    DEFAULT_MAX_TWEET_LENGTH
                ),

            TWITTER_SEARCH_ENABLE:
                parseBooleanFromText(
                    runtime.getSetting("TWITTER_SEARCH_ENABLE") ||
                    process.env.TWITTER_SEARCH_ENABLE
                ) ?? false,

            TWITTER_2FA_SECRET:
                runtime.getSetting("TWITTER_2FA_SECRET") ||
                process.env.TWITTER_2FA_SECRET || "",

            TWITTER_RETRY_LIMIT:
                safeParseInt(
                    runtime.getSetting("TWITTER_RETRY_LIMIT") ||
                    process.env.TWITTER_RETRY_LIMIT,
                    5
                ),

            TWITTER_POLL_INTERVAL:
                safeParseInt(
                    runtime.getSetting("TWITTER_POLL_INTERVAL") ||
                    process.env.TWITTER_POLL_INTERVAL,
                    120
                ),

            TWITTER_TARGET_USERS:
                parseTargetUsers(
                    runtime.getSetting("TWITTER_TARGET_USERS") ||
                    process.env.TWITTER_TARGET_USERS
                ),

            POST_INTERVAL_MIN:
                safeParseInt(
                    runtime.getSetting("POST_INTERVAL_MIN") ||
                    process.env.POST_INTERVAL_MIN,
                    90
                ),

            POST_INTERVAL_MAX:
                safeParseInt(
                    runtime.getSetting("POST_INTERVAL_MAX") ||
                    process.env.POST_INTERVAL_MAX,
                    180
                ),

            ENABLE_ACTION_PROCESSING:
                parseBooleanFromText(
                    runtime.getSetting("ENABLE_ACTION_PROCESSING") ||
                    process.env.ENABLE_ACTION_PROCESSING
                ) ?? false,

            ACTION_INTERVAL:
                safeParseInt(
                    runtime.getSetting("ACTION_INTERVAL") ||
                    process.env.ACTION_INTERVAL,
                    5
                ),

            POST_IMMEDIATELY:
                parseBooleanFromText(
                    runtime.getSetting("POST_IMMEDIATELY") ||
                    process.env.POST_IMMEDIATELY
                ) ?? false,

            TWITTER_SPACES_ENABLE:
                parseBooleanFromText(
                    runtime.getSetting("TWITTER_SPACES_ENABLE") ||
                    process.env.TWITTER_SPACES_ENABLE
                ) ?? false,
        };

        return twitterEnvSchema.parse(twitterConfig);
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(`Twitter configuration validation failed:\n${errorMessages}`);
        }
        throw error;
    }
}
