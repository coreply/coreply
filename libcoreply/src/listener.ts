export interface LibCoreplyListener {
  onInit: () => void;
  onSuggestionUpdated: (fullSuggestion: string) => void;
  onSuggestionCleared: () => void;
  onError: (error: Error) => void;
}
