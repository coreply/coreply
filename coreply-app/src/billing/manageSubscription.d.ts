export declare function manageSubscription(userId: string): Promise<void>;
export declare function getMoreUsage(userId: string): Promise<"paid" | "unavailable" | null>;
