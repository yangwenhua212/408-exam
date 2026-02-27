// src/stores/examStore.js
import { defineStore } from 'pinia'

export const useExamStore = defineStore('exam', {
    state: () => ({
        questions: [],
        currentIndex: 0,
        userAnswers: [],
        score: 0,
    }),
    actions: {
        setQuestions(list) {
            this.questions = list
        },
        setUserAnswer(index, value) {
            this.userAnswers[index] = value
        },
        next() {
            if (this.currentIndex < this.questions.length - 1) {
                this.currentIndex++
            }
        },
        prev() {
            if (this.currentIndex > 0) {
                this.currentIndex--
            }
        },
        calculateScore() {
            let count = 0
            this.questions.forEach((q, i) => {
                if (this.userAnswers[i] === q.answer) {
                    count++
                }
            })
            this.score = count
            return this.score
        },
        reset() {
            this.currentIndex = 0
            this.userAnswers = []
            this.score = 0
        },
    },
})
