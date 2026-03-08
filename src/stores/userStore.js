import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null
  }),
  actions: {
    setUser(userInfo) {
      this.user = userInfo
      localStorage.setItem('currentUser', JSON.stringify(userInfo))
    },
    logout() {
      this.user = null
      localStorage.removeItem('currentUser')
    },
    loadUser() {
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        this.user = JSON.parse(stored)
      }
    }
  }
})
