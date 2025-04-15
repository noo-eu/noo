export function waitForCondition(
  callback: () => boolean,
  { timeout = 5000, interval = 10 } = {},
) {
  const endTime = Number(new Date()) + timeout;

  return new Promise((resolve, reject) => {
    const checkCondition = () => {
      // If the condition is met, resolve the promise
      if (callback()) {
        return resolve(true);
      }

      // If the timeout is reached, reject the promise
      if (Number(new Date()) > endTime) {
        return reject(new Error("Timeout"));
      }

      // Otherwise, keep checking
      setTimeout(checkCondition, interval);
    };

    checkCondition();
  });
}
