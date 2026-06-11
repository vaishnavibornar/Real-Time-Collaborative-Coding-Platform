import React, { useState, useRef, useEffect } from 'react';

// Helper to map file extensions to editor languages
const getLanguageFromExtension = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'cpp':
    case 'h':
    case 'hpp':
    case 'cc':
      return 'cpp';
    default:
      return 'javascript';
  }
};

export default function FileExplorer({
  files,
  activeFile,
  createFile,
  renameFile,
  deleteFile,
  selectFile
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingFileId, setEditingFileId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const newFileInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Focus the new file input when opened
  useEffect(() => {
    if (isCreating) {
      newFileInputRef.current?.focus();
    }
  }, [isCreating]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingFileId) {
      editInputRef.current?.focus();
    }
  }, [editingFileId]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      setIsCreating(false);
      return;
    }
    const filename = newFileName.trim();
    const language = getLanguageFromExtension(filename);
    createFile(filename, language);
    setNewFileName('');
    setIsCreating(false);
  };

  const handleRenameSubmit = (e, fileId) => {
    e.preventDefault();
    if (!editValue.trim()) {
      setEditingFileId(null);
      return;
    }
    const newName = editValue.trim();
    const language = getLanguageFromExtension(newName);
    renameFile(fileId, newName, language);
    setEditingFileId(null);
  };

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-800 text-gray-300 flex flex-col h-full shrink-0 select-none font-sans">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Workspace Files
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors duration-200"
          title="New File"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Files List Scrollable Area */}
      <div className="flex-grow overflow-y-auto py-2">
        {/* Inline file creation row */}
        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            onBlur={() => {
              // Delay execution to allow form submission if clicking submit
              setTimeout(() => {
                if (!newFileName.trim()) setIsCreating(false);
              }, 200);
            }}
            className="px-4 py-1.5 flex items-center gap-2 bg-gray-900 border-l-2 border-blue-500"
          >
            <span className="text-gray-400 text-sm">📄</span>
            <input
              ref={newFileInputRef}
              type="text"
              className="bg-transparent border-none outline-none text-white text-sm w-full focus:ring-0 placeholder-gray-600"
              placeholder="filename.js"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </form>
        )}

        {files.length === 0 && !isCreating ? (
          <div className="px-4 py-3 text-center text-xs text-gray-500 italic">
            No files in workspace. Click '+' to add one.
          </div>
        ) : (
          files.map((file) => {
            const isActive = activeFile?.fileId === file.fileId;
            const isEditing = editingFileId === file.fileId;

            return (
              <div
                key={file.fileId}
                className={`group flex justify-between items-center px-4 py-1.5 cursor-pointer border-l-2 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-950/20 text-blue-400 border-blue-500'
                    : 'border-transparent hover:bg-gray-900/60 hover:text-white'
                }`}
                onClick={() => {
                  if (!isActive && !isEditing) {
                    selectFile(file.fileId);
                  }
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-grow mr-2">
                  <span className="text-gray-400">📄</span>
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleRenameSubmit(e, file.fileId)}
                      onBlur={(e) => handleRenameSubmit(e, file.fileId)}
                      className="w-full flex"
                    >
                      <input
                        ref={editInputRef}
                        type="text"
                        className="bg-gray-800 border border-blue-500 outline-none text-white text-sm px-1 rounded w-full focus:ring-0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent clicking parent div selecting file
                      />
                    </form>
                  ) : (
                    <span className="truncate font-mono" title={file.fileName}>
                      {file.fileName}
                    </span>
                  )}
                </div>

                {/* Hover Action Buttons */}
                {!isEditing && (
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFileId(file.fileId);
                        setEditValue(file.fileName);
                      }}
                      className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"
                      title="Rename File"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete ${file.fileName}?`)) {
                          deleteFile(file.fileId);
                        }
                      }}
                      className="p-1 hover:bg-gray-800 text-red-400 hover:text-red-500 rounded"
                      title="Delete File"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Sidebar Info */}
      <div className="p-3 border-t border-gray-800 bg-gray-950 shrink-0 text-center text-xs text-gray-600">
        Active: <span className="font-mono text-gray-400">{activeFile?.language || 'none'}</span>
      </div>

    </div>
  );
}
