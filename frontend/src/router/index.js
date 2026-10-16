import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/blog', name: 'blog', component: () => import('@/views/BlogList.vue') },
  { path: '/blog/:slug', name: 'blog-detail', component: () => import('@/views/BlogDetail.vue'), props: true },
  { path: '/contact', name: 'contact', component: () => import('@/views/ContactPage.vue') },
  { path: '/login', name: 'login', component: () => import('@/views/LoginPage.vue') },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Paging/filtering the list keeps the user near the results.
    if (to.name === from.name && to.name === 'blog') return { el: '#results', top: 80 }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const user = await useAuth().ensureChecked()
  return user ? true : { name: 'login', query: { redirect: to.fullPath } }
})

export default router
