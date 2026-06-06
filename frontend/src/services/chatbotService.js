/**
 * chatbotService.js — Phase 5
 * AI HR Chatbot API calls.
 */

import api from './api'

/** Send a message and get AI response */
export const sendChatMessage = (message, history = []) =>
  api.post('/api/v1/chatbot/message', { message, history }).then(r => r.data)

/** Get last 20 messages for current user */
export const getChatHistory = () =>
  api.get('/api/v1/chatbot/history').then(r => r.data)
