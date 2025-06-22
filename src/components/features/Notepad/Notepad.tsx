import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '../../../store/useAppStore';

const Notepad: React.FC = () => {
  const notepadContent = useAppStore((state) => state.notepadContent);

  return (
    <div className="notepad p-4 border rounded-lg shadow-lg bg-gray-50 h-full">
      <h2 className="text-xl font-bold mb-4">记事本</h2>
      <div className="prose prose-sm max-w-none h-full overflow-y-auto">
        <ReactMarkdown>{notepadContent}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Notepad;