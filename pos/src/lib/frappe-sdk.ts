import { FrappeApp } from 'frappe-js-sdk';
import { withFrappeApiErrorHandling } from './frappe-error';

const frappe = new FrappeApp(import.meta.env.VITE_FRAPPE_BASE_URL);

const rawCall = frappe.call();
const rawDb = frappe.db();

export const call = {
  get: (path: string, params?: Record<string, unknown>) =>
    withFrappeApiErrorHandling(rawCall.get(path, params)),
  post: (path: string, params?: Record<string, unknown>) =>
    withFrappeApiErrorHandling(rawCall.post(path, params)),
  put: (path: string, params?: Record<string, unknown>) =>
    withFrappeApiErrorHandling(rawCall.put(path, params)),
  delete: (path: string, params?: Record<string, unknown>) =>
    withFrappeApiErrorHandling(rawCall.delete(path, params)),
};

export const db = {
  getDoc: (doctype: string, docname = '') =>
    withFrappeApiErrorHandling(rawDb.getDoc(doctype, docname)),
  getDocList: (doctype: string, args?: Parameters<typeof rawDb.getDocList>[1]) =>
    withFrappeApiErrorHandling(rawDb.getDocList(doctype, args)),
  createDoc: (doctype: string, data: Record<string, unknown>) =>
    withFrappeApiErrorHandling(rawDb.createDoc(doctype, data)),
  updateDoc: (doctype: string, docname: string, data: Record<string, unknown>) =>
    withFrappeApiErrorHandling(rawDb.updateDoc(doctype, docname, data)),
  deleteDoc: (doctype: string, docname: string) =>
    withFrappeApiErrorHandling(rawDb.deleteDoc(doctype, docname)),
};

export const auth = {
  getLoggedInUser: () => withFrappeApiErrorHandling(frappe.auth().getLoggedInUser()),
  loginWithUsernamePassword: (credentials: Parameters<
    ReturnType<typeof frappe.auth>['loginWithUsernamePassword']
  >[0]) =>
    withFrappeApiErrorHandling(frappe.auth().loginWithUsernamePassword(credentials)),
  logout: () => withFrappeApiErrorHandling(frappe.auth().logout()),
};
