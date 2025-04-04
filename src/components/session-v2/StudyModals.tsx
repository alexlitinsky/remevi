import { XCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useState } from "react"
import { Slider } from "@/components/ui/slider"

interface MindMapModalProps {
  isVisible: boolean;
  onClose: () => void;
  nodes: { id: string; label: string; type: 'main' | 'subtopic' | 'detail' }[];
  connections: { source: string; target: string; label?: string; type: string }[];
}

interface SettingsModalProps {
  isVisible: boolean
  onClose: () => void
  onRefreshCards: () => void
  deckId: string
}

export function MindMapModal({
  isVisible,
  onClose,
  nodes: originalNodes,
  connections
}: MindMapModalProps) {
  const [scale, setScale] = useState(1);
  
  if (!isVisible) return null;

  // Separate nodes by type for better layout
  const mainNodes = originalNodes.filter(node => node.type === 'main');
  const subtopicNodes = originalNodes.filter(node => node.type === 'subtopic');
  const detailNodes = originalNodes.filter(node => node.type === 'detail');
  
  // Calculate better positions with more spacing
  const nodes = originalNodes.map((node, index) => {
    // Main concepts in center
    if (node.type === 'main') {
      return {
        ...node,
        x: 500, // Center point
        y: 400
      };
    }
    
    // For subtopics, create circular layout with larger radius
    if (node.type === 'subtopic') {
      const subtopicIndex = subtopicNodes.findIndex(n => n.id === node.id);
      const angle = (2 * Math.PI * subtopicIndex) / subtopicNodes.length;
      return {
        ...node,
        x: 500 + 250 * Math.cos(angle), // Larger radius for subtopics
        y: 400 + 250 * Math.sin(angle)
      };
    }
    
    // For details, position them in outer ring with offset based on connections
    const detailIndex = detailNodes.findIndex(n => n.id === node.id);
    // Find connected node to determine position
    const connection = connections.find(c => c.target === node.id || c.source === node.id);
    const connectedToId = connection ? (connection.source === node.id ? connection.target : connection.source) : null;
    const connectedNode = connectedToId ? originalNodes.find(n => n.id === connectedToId) : null;
    const connectedType = connectedNode?.type || 'subtopic';
    
    // If connected to a subtopic, position relative to it
    if (connectedType === 'subtopic') {
      const connectedIndex = subtopicNodes.findIndex(n => n.id === connectedToId);
      const angleBase = (2 * Math.PI * connectedIndex) / subtopicNodes.length;
      const angleOffset = (detailIndex % 3) * 0.4 - 0.4; // Spread details around their parent
      const angle = angleBase + angleOffset;
      const radius = 400; // Even larger radius for details
      
      return {
        ...node,
        x: 500 + radius * Math.cos(angle),
        y: 400 + radius * Math.sin(angle)
      };
    }
    
    // Fallback layout for unconnected details
    const angle = (2 * Math.PI * detailIndex) / (detailNodes.length || 1);
    return {
      ...node,
      x: 500 + 400 * Math.cos(angle),
      y: 400 + 400 * Math.sin(angle)
    };
  });

  // Position calculation
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x));
  const maxY = Math.max(...nodes.map(n => n.y));
  
  const width = maxX - minX + 200;
  const height = maxY - minY + 200;
  
  // Center offset
  const offsetX = -minX + 100;
  const offsetY = -minY + 100;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-5xl h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Mind Map</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto h-[calc(80vh-64px)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Zoom: {Math.round(scale * 100)}%</span>
            <div className="w-48">
              <Slider
                value={[scale]}
                min={0.5}
                max={2}
                step={0.1}
                onValueChange={(value) => setScale(value[0])}
              />
            </div>
          </div>
          
          <div className="relative w-full h-full overflow-auto border border-zinc-800 rounded-lg bg-zinc-950 min-h-[400px]">
            <div style={{ 
              width: `${width}px`, 
              height: `${height}px`, 
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'relative'
            }}>
              {/* Draw connections */}
              <svg className="absolute top-0 left-0" width={width} height={height}>
                {connections.map(conn => {
                  const source = nodes.find(n => n.id === conn.source);
                  const target = nodes.find(n => n.id === conn.target);
                  
                  if (!source || !target) return null;
                  
                  const x1 = source.x + offsetX;
                  const y1 = source.y + offsetY;
                  const x2 = target.x + offsetX;
                  const y2 = target.y + offsetY;
                  
                  return (
                    <g key={`${conn.source}-${conn.target}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(59, 130, 246, 0.5)"
                        strokeWidth={2}
                      />
                      {conn.label && (
                        <text
                          x={(x1 + x2) / 2}
                          y={(y1 + y2) / 2}
                          textAnchor="middle"
                          fontSize="12"
                          fill="white"
                          className="bg-zinc-900 px-1"
                        >
                          {conn.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              
              {/* Draw nodes */}
              {nodes.map(node => (
                <div
                  key={node.id}
                  className={`absolute bg-blue-600 text-white text-sm rounded-lg px-2 py-1 shadow-lg cursor-help transform -translate-x-1/2 -translate-y-1/2 ${
                    node.type === 'main' ? 'bg-blue-700 font-bold' : 
                    node.type === 'subtopic' ? 'bg-blue-600' : 'bg-blue-500'
                  }`}
                  style={{
                    left: `${node.x + offsetX}px`,
                    top: `${node.y + offsetY}px`,
                    maxWidth: '200px',
                  }}
                  title={node.label}
                >
                  {node.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SettingsModal({
  isVisible,
  onClose,
  onRefreshCards,
  deckId
}: SettingsModalProps) {
  const [newCardsPerDay, setNewCardsPerDay] = useState(5);
  const [reviewsPerDay, setReviewsPerDay] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  
  if (!isVisible) return null;
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await fetch(`/api/decks/${deckId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCardsPerDay,
          reviewsPerDay
        })
      });
      
      onClose();
      onRefreshCards();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Study Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-zinc-400">New cards per day</label>
              <span className="text-sm font-medium text-white">{newCardsPerDay}</span>
            </div>
            <Slider
              value={[newCardsPerDay]}
              min={0}
              max={50}
              step={1}
              onValueChange={(value) => setNewCardsPerDay(value[0])}
              className="my-4"
            />
            <p className="text-xs text-zinc-500">
              Limit how many new cards to introduce each day
            </p>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-zinc-400">Reviews per day</label>
              <span className="text-sm font-medium text-white">{reviewsPerDay}</span>
            </div>
            <Slider
              value={[reviewsPerDay]}
              min={0}
              max={200}
              step={5}
              onValueChange={(value) => setReviewsPerDay(value[0])}
              className="my-4"
            />
            <p className="text-xs text-zinc-500">
              Maximum number of review cards to show each day
            </p>
          </div>
          
          <div className="flex justify-between gap-4">
            <Button
              onClick={onRefreshCards}
              variant="outline"
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              Refresh Cards
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 