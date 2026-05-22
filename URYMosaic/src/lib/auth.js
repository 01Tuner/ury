import { reactive } from 'vue';
import { FrappeApp } from 'frappe-js-sdk';

function getSiteUrl() {
  const host = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  return port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`;
}

const frappe = new FrappeApp(getSiteUrl());
const frappeAuth = frappe.auth();

export const auth = reactive({
  isLoggedIn: false,
  user: null,
  checking: true,
});

export async function checkAuth() {
  auth.checking = true;
  try {
    const user = await frappeAuth.getLoggedInUser();
    auth.user = user;
    auth.isLoggedIn = Boolean(user && user !== 'Guest');
  } catch {
    auth.user = null;
    auth.isLoggedIn = false;
  } finally {
    auth.checking = false;
  }
}

export const mosaicAuth = {
  async login(email, password) {
    try {
      await frappeAuth.loginWithUsernamePassword({
        username: email,
        password,
      });
      await checkAuth();
      return auth.isLoggedIn;
    } catch (error) {
      console.error(error);
      return false;
    }
  },
  logout() {
    return frappeAuth.logout();
  },
};
