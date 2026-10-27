import { z } from "zod";

export interface AndroidSnapshot {
  platform: "android";
  snapshot: AndroidSnapshotNode;
}

export interface WebSnapshot {
  platform: "web";
  url: string;
  snapshot: WebSnapshotNode;
}

export type Snapshot = AndroidSnapshot | WebSnapshot;

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Android snapshot node structure
export interface AndroidSnapshotNode {
  id?: string;
  className?: string;
  viewIdResourceName?: string;
  text?: string;
  contentDescription?: string;
  hintText?: string;
  packageName?: string;
  isEditable: boolean;
  isFocused: boolean;
  isVisibleToUser: boolean;
  isShowingHintText: boolean;
  bounds: Bounds;
  children: AndroidSnapshotNode[];
}

// Web snapshot node structure
export interface WebSnapshotNode {
  id: string;
  tagName: string;
  text: string | null;
  ariaLabel: string | null;
  placeholder: string | null;
  name: string | null;
  className: string | null;
  attributes: Record<string, string>;
  isEditable: boolean;
  isContentEditable: boolean;
  isFocused: boolean;
  isVisible: boolean;
  children: WebSnapshotNode[];
}

const boundsSchema = z.object({ left: z.number(), top: z.number(), right: z.number(), bottom: z.number() });

export const androidSnapshotNodeSchema: z.ZodType<AndroidSnapshotNode> = z.lazy(() => z.object({
  id: z.string().optional(),
  className: z.string().optional(),
  viewIdResourceName: z.string().optional(),
  text: z.string().optional(),
  contentDescription: z.string().optional(),
  hintText: z.string().optional(),
  packageName: z.string().optional(),
  isEditable: z.boolean(),
  isFocused: z.boolean(),
  isVisibleToUser: z.boolean(),
  isShowingHintText: z.boolean(),
  bounds: boundsSchema,
  children: z.array(androidSnapshotNodeSchema),
}));

export const webSnapshotNodeSchema: z.ZodType<WebSnapshotNode> = z.lazy(() => z.object({
  id: z.string(),
  tagName: z.string(),
  text: z.string().nullable(),
  ariaLabel: z.string().nullable(),
  placeholder: z.string().nullable(),
  name: z.string().nullable(),
  className: z.string().nullable(),
  attributes: z.record(z.string(), z.string()),
  isEditable: z.boolean(),
  isContentEditable: z.boolean(),
  isFocused: z.boolean(),
  isVisible: z.boolean(),
  children: z.array(webSnapshotNodeSchema),
}));

export const snapshotSchema = z.discriminatedUnion("platform", [
  z.object({ platform: z.literal("android"), snapshot: androidSnapshotNodeSchema }),
  z.object({ platform: z.literal("web"), url: z.url(), snapshot: webSnapshotNodeSchema }),
]);
