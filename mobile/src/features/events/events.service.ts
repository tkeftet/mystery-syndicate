import { apiClient } from "../../services/api";

export interface EventAccusation {
  suspectId: string;
  motive: string;
  weapon: string;
  timelineEventId: string;
}

export async function listEventsApi() {
  const { data } = await apiClient.get("/events");
  return data.data;
}

export async function getEventApi(eventId: string) {
  const { data } = await apiClient.get(`/events/${eventId}`);
  return data.data;
}

export async function participateEventApi(eventId: string) {
  const { data } = await apiClient.post(`/events/${eventId}/participate`);
  return data.data; // { participation, case }
}

export async function submitEventApi(
  eventId: string,
  accusation: EventAccusation,
) {
  const { data } = await apiClient.post(`/events/${eventId}/submit`, accusation);
  return data.data; // { score, scoreBreakdown, accuracy, completionTimeSec, isCorrect, solution }
}

export async function getEventLeaderboardApi(eventId: string) {
  const { data } = await apiClient.get(`/events/${eventId}/leaderboard`);
  return data.data;
}

export async function getMyParticipationApi(eventId: string) {
  const { data } = await apiClient.get(`/events/${eventId}/me`);
  return data.data; // { participation, rank } | null
}

export async function getGlobalEventLeaderboardApi() {
  const { data } = await apiClient.get("/events/global-leaderboard");
  return data.data;
}
