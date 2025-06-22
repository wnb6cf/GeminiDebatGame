import React from 'react';
import { useDebateManager } from '../../hooks/useDebateManager';
import { useAppStore } from '../../store/useAppStore';

const StopButton: React.FC = () => {
  const { stopDebate } = useDebateManager();
  const isLoading = useAppStore((state) => state.isLoading);
  const isStreaming = useAppStore((state) => state.isStreaming);

  const handleStop = () => {
    stopDebate();
  };

  if (!isLoading && !isStreaming) {
    return null;
  }

  return (
    <button
      onClick={handleStop}
      className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:opacity-50"
      disabled={!isLoading && !isStreaming}
    >
      停止生成
    </button>
  );
};

export default StopButton;