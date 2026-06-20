export interface LibCoreplyListener {
  onInit: () => void;
  onSuggestionUpdated: (suggestion: string) => void;
  onError: (error: Error) => void;
}
