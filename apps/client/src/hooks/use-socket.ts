import { useSocketContext } from '../context/socket-context';

export function useSocket() {
  const { socket, isConnected } = useSocketContext();
  return { socket, isConnected };
}
