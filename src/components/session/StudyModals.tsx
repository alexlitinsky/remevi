import { XCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { useState } from "react"
import { useStudySettings } from "@/hooks/deck/useStudySettings"

interface MindMapModalProps {
  isVisible: boolean
  onClose: () => void
  nodes: { id: string; label: string; x: number; y: number }[]
  connections: { source: string; target: string }[]
}

export function MindMapModal({ isVisible, onClose, nodes, connections }: MindMapModalProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card/90 rounded-lg border border-primary/10 shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Mind Map</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 h-[60vh] overflow-auto">
          <div className="relative w-full h-full bg-muted/30 rounded-lg">
            {/* Render connections */}
            <svg className="absolute inset-0 w-full h-full">
              {connections.map((connection, index) => {
                const source = nodes.find((node) => node.id === connection.source)
                const target = nodes.find((node) => node.id === connection.target)

                if (!source || !target) return null

                return (
                  <line
                    key={index}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>

            {/* Render nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute bg-card border border-primary/10 rounded-lg px-3 py-1.5 shadow-md transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: node.x, top: node.y }}
              >
                {node.label}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t">
          <p className="text-sm text-muted-foreground">
            This mind map shows the relationships between concepts in your study deck.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

interface SettingsModalProps {
  isVisible: boolean
  onClose: () => void
  onRefreshCards: () => void
  deckId: string
}

export function SettingsModal({ isVisible, onClose, onRefreshCards, deckId }: SettingsModalProps) {
  const { settings, updateSettings } = useStudySettings(deckId);

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card/90 rounded-lg border border-primary/10 shadow-xl max-w-md w-full"
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Study Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Show Card Hints</h3>
              <p className="text-sm text-muted-foreground">Display hints for difficult cards</p>
            </div>
            <Switch 
              checked={settings.showHints} 
              onCheckedChange={(checked) => updateSettings({ showHints: checked })} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Audio Pronunciation</h3>
              <p className="text-sm text-muted-foreground">Read card content aloud</p>
            </div>
            <Switch 
              checked={settings.audioEnabled} 
              onCheckedChange={(checked) => updateSettings({ audioEnabled: checked })} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Shuffle Cards</h3>
              <p className="text-sm text-muted-foreground">Randomize card order</p>
            </div>
            <Switch 
              checked={settings.shuffleCards} 
              onCheckedChange={(checked) => updateSettings({ shuffleCards: checked })} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Focus Mode</h3>
              <p className="text-sm text-muted-foreground">Hide distractions while studying</p>
            </div>
            <Switch 
              checked={settings.focusMode} 
              onCheckedChange={(checked) => updateSettings({ focusMode: checked })} 
            />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onRefreshCards} className="gap-2">
            <Zap className="h-4 w-4" />
            Refresh Cards
          </Button>
        </div>
      </motion.div>
    </div>
  )
} 