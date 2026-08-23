export type PlaybackSeekRequest = {
  time: number;
  request: number;
};

export function createPlaybackRestart(current: PlaybackSeekRequest) {
  return {
    paused: false,
    playbackTime: 0,
    seekRequest: { time: 0, request: current.request + 1 },
  };
}

export function togglePlaybackToolbar(collapsed: boolean) {
  return !collapsed;
}
