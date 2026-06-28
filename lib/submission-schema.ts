import { z } from "zod";

export const submissionTypes = [
  "submit-company",
  "update-company",
  "question-source",
] as const;

export const visibilityModes = ["public", "private"] as const;

export const leaderboardSubmissionSchema = z.object({
  submissionType: z.enum(submissionTypes),
  visibility: z.enum(visibilityModes).optional().default("public"),
  title: z
    .string()
    .trim()
    .min(2, "Write at least 2 characters for the company name.")
    .max(120, "Keep the company name under 120 characters."),
  outcome: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters for the update.")
    .max(1200, "Keep the update under 1200 characters."),
  context: z.string().trim().max(1600).optional().default(""),
  handle: z.string().trim().max(120).optional().default(""),
  website: z.string().trim().max(0).optional().default(""),
});

export type LeaderboardSubmission = z.infer<typeof leaderboardSubmissionSchema>;
