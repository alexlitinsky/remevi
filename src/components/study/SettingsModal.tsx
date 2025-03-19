import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudySettings } from '@/components/study-settings';
import { Button } from '@/components/ui/button';

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onRefreshCards: () => void;
}

export function SettingsModal({
  isVisible,
  onClose,
  onRefreshCards
}: SettingsModalProps) {
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
            className="w-full max-w-md"
          >
            <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8">
              <h2 className="text-xl font-bold text-white mb-4">Study Settings</h2>
              <div className="space-y-4">
                <div>
                  <Button 
                    onClick={onRefreshCards}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Refresh Cards
                  </Button>
                </div>
                <div>
                  <StudySettings />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
