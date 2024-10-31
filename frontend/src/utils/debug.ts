// src/utils/debug.ts
export const debug = {
  log: (...args: any[]) => {
    console.log(new Date().toISOString(), ...args);
  },
  error: (...args: any[]) => {
    console.error(new Date().toISOString(), ...args);
  }
};

