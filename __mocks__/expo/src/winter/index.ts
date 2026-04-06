// Mock for expo winter modules
export const FormData = global.FormData || class FormData {
  append() {}
  delete() {}
  get() {}
  getAll() {}
  has() {}
  set() {}
  entries() {}
  keys() {}
  values() {}
};

export default {};