import './index.css';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { auth, checkAuth, mosaicAuth } from './lib/auth';

const app = createApp(App);

app.use(router);
app.provide('$auth', mosaicAuth);

router.beforeEach(async (to, from, next) => {
  if (auth.checking) {
    await checkAuth();
  }

  if (to.matched.some((record) => !record.meta.isLoginPage)) {
    if (!auth.isLoggedIn) {
      next({ name: 'Login', query: { route: to.fullPath } });
    } else {
      next();
    }
  } else if (auth.isLoggedIn) {
    const redirect = to.query?.route;
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      next(redirect);
    } else {
      next({ name: 'KOT' });
    }
  } else {
    next();
  }
});

app.mount('#app');
