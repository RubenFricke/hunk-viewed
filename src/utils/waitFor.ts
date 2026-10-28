interface WaitForOptions {
  readonly tries?: number;
  readonly delayMs?: number;
}

const waitFor = async (
  check: () => boolean,
  { tries = 20, delayMs = 16 }: WaitForOptions = {},
): Promise<boolean> => {
  for (let attempt = 1; attempt < tries; attempt += 1) {
    if (check()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return check();
};

export default waitFor;
