/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchSnapshot(): R;
      toThrowErrorMatchingSnapshot(): R;
    }
  }
}