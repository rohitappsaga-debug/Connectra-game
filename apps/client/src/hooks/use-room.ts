import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Room, RoomPlayer } from '@connectra/shared';

export function useCreateRoom() {
  return useMutation({
    mutationFn: () => api.post<Room>('/api/rooms', { maxPlayers: 2 }),
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: (code: string) => api.post<Room>(`/api/rooms/${code}/join`),
  });
}

export function useLeaveRoom(roomId: string) {
  return useMutation({
    mutationFn: () => api.post(`/api/rooms/${roomId}/leave`),
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.get<Room>(`/api/rooms/${roomId}`),
    enabled: !!roomId,
  });
}

export function useListRooms(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['rooms', page, pageSize],
    queryFn: () => api.get<{ rooms: Room[]; total: number }>(`/api/rooms?page=${page}&pageSize=${pageSize}`),
  });
}

export function useSetReady(roomId: string) {
  return useMutation({
    mutationFn: (isReady: boolean) => api.post<RoomPlayer[]>(`/api/rooms/${roomId}/ready`, { isReady }),
  });
}
