import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../lib/api';

export default function useFiles(authFetch) {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const customFetch = authFetch || fetch;

  // Helper for options formatting when using customFetch vs fetch
  const getHeaders = (optionsHeaders = {}) => {
    // If authFetch is present, it will append Authorization token itself.
    // If we are using vanilla fetch, we just pass optionsHeaders.
    return {
      'Content-Type': 'application/json',
      ...optionsHeaders
    };
  };

  // Fetch all room files and active file from database
  const fetchRoomData = useCallback(async (roomId) => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await customFetch(`${API_BASE_URL}/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to load room workspace');
      }
      const data = await response.json();
      setFiles(data.files || []);
      setActiveFileId(data.room?.activeFileId || (data.files && data.files[0]?.fileId) || null);
      return data;
    } catch (err) {
      console.error('Error fetching room data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customFetch]);

  // Create a new file in the DB
  const createFile = useCallback(async (roomId, fileName, language = 'javascript') => {
    try {
      const response = await customFetch(`${API_BASE_URL}/files`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ roomId, fileName, language })
      });
      if (!response.ok) {
        throw new Error('Failed to create file');
      }
      const newFile = await response.json();
      setFiles((prev) => [...prev, newFile]);
      return newFile;
    } catch (err) {
      console.error('Error creating file:', err);
      setError(err.message);
      throw err;
    }
  }, [customFetch]);

  // Update file name / language in the DB
  const renameFile = useCallback(async (fileId, newName, language) => {
    try {
      const response = await customFetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ fileName: newName, language })
      });
      if (!response.ok) {
        throw new Error('Failed to rename file');
      }
      const data = await response.json();
      const updatedFile = data.file;

      setFiles((prev) =>
        prev.map((f) => (f.fileId === fileId ? { ...f, ...updatedFile } : f))
      );
      return updatedFile;
    } catch (err) {
      console.error('Error renaming file:', err);
      setError(err.message);
      throw err;
    }
  }, [customFetch]);

  // Select active file in the room
  const selectFile = useCallback(async (roomId, fileId) => {
    try {
      setActiveFileId(fileId);
      const response = await customFetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ roomId, isActive: true })
      });
      if (!response.ok) {
        throw new Error('Failed to update active file');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error selecting file:', err);
      setError(err.message);
    }
  }, [customFetch]);

  // Delete file in the DB
  const deleteFile = useCallback(async (fileId) => {
    try {
      const response = await customFetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      const data = await response.json(); // returns { roomId, fileId, newActiveFileId }
      
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      if (activeFileId === fileId) {
        setActiveFileId(data.newActiveFileId || null);
      }
      return data;
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(err.message);
      throw err;
    }
  }, [activeFileId, customFetch]);

  return {
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
  };
}
