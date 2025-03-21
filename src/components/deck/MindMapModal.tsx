import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MindMap } from '@/components/ui/mind-map';

interface MindMapModalProps {
  isVisible: boolean;
  onClose: () => void;
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
  }>;
  connections: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
}

export function MindMapModal({
  isVisible,
  onClose,
  nodes,
  connections
}: MindMapModalProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full max-w-6xl"
          >
            <div className="w-full h-[calc(100vh-8rem)] rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8">
              <MindMap
                nodes={nodes}
                connections={connections}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
