import { apiRequest } from './api';
export interface Deck { id: string; title: string; source_text: string }
export interface Flashcard { id: string; front: string; back: string; last_reviewed_at: string | null; next_review_at: string | null }
export interface DeckList { decks: Deck[]; catalogue: { id: string; title: string; description: string; cardCount: number }[] }
export const loadDecks = async () => await apiRequest('/api/abikurssi/flashcards') as DeckList;
export const loadCards = async (deckId: string) => await apiRequest(`/api/abikurssi/flashcards?deckId=${encodeURIComponent(deckId)}`) as { deck: Deck; cards: Flashcard[] };
export const updateFlashcards = (body: unknown) => apiRequest('/api/abikurssi/flashcards', { method: 'POST', body });
