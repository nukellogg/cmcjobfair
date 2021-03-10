import Vue from 'vue'
import VueRouter from 'vue-router'
import Optimizer from '../views/Optimizer.vue'
import Qualtrics from '../views/Qualtrics.vue'

Vue.use(VueRouter)

const routes = [{
  path: '/',
  name: 'Optimizer',
  component: Optimizer
},
  {
    path: '/qualtrics',
    name: 'Qualtrics',
    component: Qualtrics
}]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router