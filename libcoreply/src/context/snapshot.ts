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

// Android snapshot node structure
export interface AndroidSnapshotNode {
  id: string;
  className: string | null;
  viewIdResourceName: string | null;
  text: string | null;
  contentDescription: string | null;
  hintText: string | null;
  packageName: string | null;
  isEditable: boolean;
  isFocused: boolean;
  isVisibleToUser: boolean;
  isShowingHintText: boolean;
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
  isEditable: boolean;
  isContentEditable: boolean;
  isFocused: boolean;
  isVisible: boolean;
  children: WebSnapshotNode[];
}
