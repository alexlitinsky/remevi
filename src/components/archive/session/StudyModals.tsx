import { XCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
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
  const { settings, updateSettings, isLoading } = useStudySettings(deckId);

  if (!isVisible) return null;

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

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-6">
              <div>
                <h3 className="font-medium mb-4">Daily Study Limits</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">New Cards Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.newCardsPerDay}
                      onChange={(e) => updateSettings({ newCardsPerDay: parseInt(e.target.value) })}
                      className="w-full mt-1.5 bg-background rounded-md border border-input px-3 py-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Maximum number of new cards to study each day</p>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Reviews Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={settings.reviewsPerDay}
                      onChange={(e) => updateSettings({ reviewsPerDay: parseInt(e.target.value) })}
                      className="w-full mt-1.5 bg-background rounded-md border border-input px-3 py-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Maximum number of card reviews per day</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" onClick={onRefreshCards} className="gap-2">
                <Zap className="h-4 w-4" />
                Refresh Cards
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
} 