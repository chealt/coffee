import { memoryUsage } from 'node:process';

const convertToMegabytes = (usage) =>
  Object.entries(usage).reduce((previousValue, [key, value]) => {
    previousValue[key] = Math.floor(value / 1024 / 1024); // megabytes

    return previousValue;
  }, {});

const changeLogger = ({ shouldLog = false, previousMemoryUsage = memoryUsage() }) => {
  if (shouldLog) {
    // eslint-disable-next-line no-console
    console.info(`Memory usage: ${JSON.stringify(convertToMegabytes(previousMemoryUsage))}`);
  }
  let memoryUsageClone = Object.assign(previousMemoryUsage, {});

  return (prefix) => {
    const currentMemoryUsage = memoryUsage();
    const difference = Object.entries(currentMemoryUsage).reduce((previousValue, [key, value]) => {
      previousValue[key] = Math.floor((value - memoryUsageClone[key]) / 1024 / 1024); // megabytes

      return previousValue;
    }, {});

    if (shouldLog) {
      // eslint-disable-next-line no-console
      console.info(`Memory usage ${prefix || ''}: ${JSON.stringify(difference)}`);
    }

    memoryUsageClone = Object.assign(currentMemoryUsage, {});

    return difference;
  };
};

export { changeLogger };
