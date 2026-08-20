export interface LibCoreplyListener {
  onCollectionModeUpdated: (
    collectionMode: "minimal" | "frequent" | "active",
  ) => void;
  onInit: () => void;
  onSuggestionUpdated: (fullSuggestion: string) => void;
  onSuggestionCleared: () => void;
  onError: (error: Error) => void;
}
