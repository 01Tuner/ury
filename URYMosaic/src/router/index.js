import { createRouter, createWebHistory } from "vue-router";
import authRoutes from './auth';
import KOT from '../components/kot.vue';

const routes = [
  {
    path: '/:production?',
    name: 'KOT',
    component: KOT,
  },
  ...authRoutes,
];

const router = createRouter({
  history: createWebHistory('/URYMosaic/'),
  routes,
});

export default router;
