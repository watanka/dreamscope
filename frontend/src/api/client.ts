import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE || '/api'
export const api = axios.create({ baseURL, withCredentials: true })


export interface DreamItem {
  id: string
  user_id: string
  content: string
  summary: string
  tags?: string[]
  analysis?: string
  created_at: string
  author_name?: string
  author_avatar_url?: string
}

export interface CommentItem {
  id: string
  dream_id: string
  content: string
  created_at: string
  parent_id?: string | null
  user_name?: string
  user_avatar_url?: string
}
 
// Auth helpers
export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
 
// Structured interpretation returned by POST /dreams
export interface DreamInterpretation {
  summary: string
  tags: string[]
  analysis: string
}
