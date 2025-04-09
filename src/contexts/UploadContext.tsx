'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface FileMetadata {
  originalName: string;
  type: string;
  size: number;
  pageCount?: number;
}

interface UploadContextProps {
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  metadata: FileMetadata | null;
  setMetadata: Dispatch<SetStateAction<FileMetadata | null>>;
  clearUploadData: () => void;
}

const UploadContext = createContext<UploadContextProps | undefined>(undefined);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);

  const clearUploadData = () => {
    setFile(null);
    setMetadata(null);
  }

  return (
    <UploadContext.Provider value={{ file, setFile, metadata, setMetadata, clearUploadData }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUploadContext = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUploadContext must be used within an UploadProvider');
  }
  return context;
};

export type { FileMetadata }; 