const useSharedState = (key: string, initialValue: any) => {
  return [initialValue, () => {}];
};

const sendMessage = (_message: Record<string, unknown>) => {};

export { sendMessage, useSharedState };
