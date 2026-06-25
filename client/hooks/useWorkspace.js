import { useEffect, useCallback } from 'react';
import socket from '../lib/socket';
import useFiles from './useFiles';

export default function useWorkspace(roomId, username, authFetch) {
  const {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    loading,
    error,
    fetchRoomData,
    createFile,
    renameFile,
    selectFile,
    deleteFile
  } = useFiles(authFetch);

  // Find the active file object
  const activeFile = files.find((f) => f.fileId === activeFileId) || null;

  // Fetch initial room data on mount/roomId change
  useEffect(() => {
    if (roomId) {
      fetchRoomData(roomId);
    }
  }, [roomId, fetchRoomData]);

  // Handle socket connection and workspace syncing events
  useEffect(() => {
    if (!roomId || !username) return;

    // Join room
    socket.emit('join_room', { roomId, username });

    // 1. File Created Listener
    const handleFileCreated = ({ file }) => {
      setFiles((prev) => {
        if (prev.some((f) => f.fileId === file.fileId)) return prev;
        return [...prev, file];
      });
    };

    // 2. File Deleted Listener
    const handleFileDeleted = ({ fileId, newActiveFileId }) => {
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      if (activeFileId === fileId || !activeFileId) {
        setActiveFileId(newActiveFileId || null);
      }
    };

    // 3. File Renamed Listener
    const handleFileRenamed = ({ fileId, fileName, language }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.fileId === fileId ? { ...f, fileName, language } : f
        )
      );
    };

    // 4. File Selected Listener
    const handleFileSelected = ({ fileId }) => {
      setActiveFileId(fileId);
    };

    // 5. Code Update Listener
    const handleCodeUpdate = ({ fileId, code }) => {
      setFiles((prev) =>
        prev.map((f) => (f.fileId === fileId ? { ...f, fileContent: code } : f))
      );
    };

    // 6. Language Update Listener
    const handleLanguageUpdate = ({ fileId, language }) => {
      setFiles((prev) =>
        prev.map((f) => (f.fileId === fileId ? { ...f, language } : f))
      );
    };

    socket.on('file_created', handleFileCreated);
    socket.on('file_deleted', handleFileDeleted);
    socket.on('file_renamed', handleFileRenamed);
    socket.on('file_selected', handleFileSelected);
    socket.on('code_update', handleCodeUpdate);
    socket.on('language_update', handleLanguageUpdate);

    return () => {
      socket.emit('leave_room', { roomId, username });
      socket.off('file_created', handleFileCreated);
      socket.off('file_deleted', handleFileDeleted);
      socket.off('file_renamed', handleFileRenamed);
      socket.off('file_selected', handleFileSelected);
      socket.off('code_update', handleCodeUpdate);
      socket.off('language_update', handleLanguageUpdate);
    };
  }, [roomId, username, activeFileId, setFiles, setActiveFileId]);

  // Create file wrapper
  const handleCreateFile = async (fileName, language = 'javascript') => {
    if (!roomId) return;
    try {
      const newFile = await createFile(roomId, fileName, language);
      socket.emit('file_create', { roomId, file: newFile });
      
      // Auto select newly created file
      await handleSelectFile(newFile.fileId);
    } catch (err) {
      console.error(err);
    }
  };

  // Rename file wrapper
  const handleRenameFile = async (fileId, newName, language) => {
    try {
      const updated = await renameFile(fileId, newName, language);
      socket.emit('file_rename', {
        roomId,
        fileId,
        fileName: updated.fileName,
        language: updated.language
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete file wrapper
  const handleDeleteFile = async (fileId) => {
    try {
      const data = await deleteFile(fileId);
      socket.emit('file_delete', {
        roomId,
        fileId,
        newActiveFileId: data.newActiveFileId
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Select file wrapper
  const handleSelectFile = async (fileId) => {
    if (!roomId) return;
    try {
      await selectFile(roomId, fileId);
      socket.emit('file_select', { roomId, fileId });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle local code changes
  const handleCodeChange = (newCode) => {
    if (!activeFileId) return;

    // 1. Update local files state
    setFiles((prev) =>
      prev.map((f) =>
        f.fileId === activeFileId ? { ...f, fileContent: newCode } : f
      )
    );

    // 2. Broadcast code changes over socket
    socket.emit('code_change', {
      roomId,
      fileId: activeFileId,
      code: newCode
    });
  };

  // Handle local language selection changes
  const handleLanguageChange = (newLanguage) => {
    if (!activeFileId) return;

    // 1. Update local files state
    setFiles((prev) =>
      prev.map((f) =>
        f.fileId === activeFileId ? { ...f, language: newLanguage } : f
      )
    );

    // 2. Broadcast language changes over socket
    socket.emit('language_change', {
      roomId,
      fileId: activeFileId,
      language: newLanguage
    });
  };

  return {
    files,
    activeFile,
    loading,
    error,
    createFile: handleCreateFile,
    renameFile: handleRenameFile,
    deleteFile: handleDeleteFile,
    selectFile: handleSelectFile,
    handleCodeChange,
    handleLanguageChange
  };
}
