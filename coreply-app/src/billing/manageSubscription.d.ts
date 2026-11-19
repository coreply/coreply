export declare function manageSubscription(userId: string): Promise<void>;
export declare function preloadPaywall(userId: string): Promise<void>;
export declare function getMoreUsage(userId: string, onPurchaseOrRestore: () => void): Promise<"paid" | "unavailable" | null>;
