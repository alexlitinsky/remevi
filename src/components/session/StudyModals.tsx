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

  // Analyze the graph structure
  const nodeConnectionCount = originalNodes.reduce((acc, node) => {
    acc[node.id] = connections.filter(c => c.source === node.id || c.target === node.id).length;
    return acc;
  }, {} as Record<string, number>);
  
  // Identify central/important nodes based on connection count
  const centralNodes = [...originalNodes].sort((a, b) => 
    (nodeConnectionCount[b.id] || 0) - (nodeConnectionCount[a.id] || 0)
  ).slice(0, 3).map(n => n.id);
  
  // Create a node type mapping that respects the original type but prioritizes centrality
  const nodeTypeMap = originalNodes.reduce((acc, node) => {
    if (centralNodes.includes(node.id)) {
      acc[node.id] = 'main';
    } else if (node.type === 'main' || node.type === 'subtopic') {
      acc[node.id] = 'subtopic';
    } else {
      acc[node.id] = 'detail';
    }
    return acc;
  }, {} as Record<string, string>);
  
  // Group nodes by their effective type
  const mainNodes = originalNodes.filter(node => nodeTypeMap[node.id] === 'main');
  const subtopicNodes = originalNodes.filter(node => nodeTypeMap[node.id] === 'subtopic');
  const detailNodes = originalNodes.filter(node => nodeTypeMap[node.id] === 'detail');
  
  // Build node connection map
  const nodeConnections = originalNodes.reduce((acc, node) => {
    acc[node.id] = connections.filter(c => c.source === node.id || c.target === node.id)
      .map(c => c.source === node.id ? c.target : c.source);
    return acc;
  }, {} as Record<string, string[]>);
  
  // Calculate positions in stages
  // 1. First process main nodes
  const mainNodesWithPositions = mainNodes.map((node, index) => {
    const angle = mainNodes.length > 1 ? (2 * Math.PI * index) / mainNodes.length : 0;
    const radius = mainNodes.length > 1 ? 150 : 0;
    return {
      ...node,
      x: 600 + radius * Math.cos(angle),
      y: 400 + radius * Math.sin(angle),
      type: nodeTypeMap[node.id]
    };
  });

  // 2. Process subtopic nodes
  const subtopicNodesWithPositions = subtopicNodes.map((node) => {
    // Find connected main node if any
    const connectedMainNodes = nodeConnections[node.id]?.filter(id => 
      nodeTypeMap[id] === 'main') || [];
    
    // If connected to a main node, position relative to it
    if (connectedMainNodes.length > 0) {
      const mainNodeId = connectedMainNodes[0];
      const mainNode = mainNodesWithPositions.find(n => n.id === mainNodeId);
      if (mainNode) {
        // Get all subtopics connected to this main node
        const connectedSubtopics = subtopicNodes.filter(n => 
          nodeConnections[mainNodeId]?.includes(n.id) && 
          nodeTypeMap[n.id] === 'subtopic');
        
        const subtopicIndex = connectedSubtopics.findIndex(n => n.id === node.id);
        const totalConnected = connectedSubtopics.length;
        
        const arcStart = -Math.PI/2;
        const arcLength = Math.PI;
        const angle = arcStart + (subtopicIndex / Math.max(1, totalConnected - 1)) * arcLength;
        
        return {
          ...node,
          x: mainNode.x + 300 * Math.cos(angle),
          y: mainNode.y + 300 * Math.sin(angle),
          type: nodeTypeMap[node.id]
        };
      }
    }
    
    // Fallback for unconnected subtopics
    const subtopicIndex = subtopicNodes.findIndex(n => n.id === node.id);
    const angle = (2 * Math.PI * subtopicIndex) / subtopicNodes.length;
    return {
      ...node,
      x: 600 + 400 * Math.cos(angle),
      y: 400 + 400 * Math.sin(angle),
      type: nodeTypeMap[node.id]
    };
  });

  // 3. Process detail nodes
  const detailNodesWithPositions = detailNodes.map((node) => {
    // All positioned nodes so far
    const positionedNodes = [...mainNodesWithPositions, ...subtopicNodesWithPositions];
    
    // Find connected nodes
    const connectedNodeIds = nodeConnections[node.id] || [];
    // Prefer subtopic connections, then main connections
    const subtopicConnections = connectedNodeIds.filter(id => nodeTypeMap[id] === 'subtopic');
    const mainConnections = connectedNodeIds.filter(id => nodeTypeMap[id] === 'main');
    
    if (subtopicConnections.length > 0 || mainConnections.length > 0) {
      const parentId = subtopicConnections[0] || mainConnections[0];
      const parentNode = positionedNodes.find(n => n.id === parentId);
      
      if (parentNode) {
        // Get all details connected to this parent
        const siblings = detailNodes.filter(n => 
          nodeConnections[parentId]?.includes(n.id));
        
        const detailIndex = siblings.findIndex(n => n.id === node.id);
        const count = siblings.length;
        
        const arcLength = Math.PI;
        const angle = -Math.PI/4 + (detailIndex / Math.max(1, count)) * arcLength;
        const radius = 180;
        
        return {
          ...node,
          x: parentNode.x + radius * Math.cos(angle),
          y: parentNode.y + radius * Math.sin(angle),
          type: nodeTypeMap[node.id]
        };
      }
    }
    
    // Fallback for isolated detail nodes
    const detailIndex = detailNodes.findIndex(n => n.id === node.id);
    const angle = (2 * Math.PI * detailIndex) / Math.max(1, detailNodes.length);
    return {
      ...node,
      x: 600 + 500 * Math.cos(angle),
      y: 400 + 500 * Math.sin(angle),
      type: nodeTypeMap[node.id]
    };
  });

  // Combine all nodes
  const nodes = [...mainNodesWithPositions, ...subtopicNodesWithPositions, ...detailNodesWithPositions];

  // Calculate canvas dimensions based on node positions
  const minX = Math.min(...nodes.map(n => n.x)) - 100;
  const minY = Math.min(...nodes.map(n => n.y)) - 100;
  const maxX = Math.max(...nodes.map(n => n.x)) + 100;
  const maxY = Math.max(...nodes.map(n => n.y)) + 100;
  
  const width = Math.max(1000, maxX - minX);
  const height = Math.max(800, maxY - minY);
  
  // Calculate offsets to center the graph
  const offsetX = -minX;
  const offsetY = -minY;
  
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
        
        <div className="flex-1 p-4 overflow-auto h-[calc(80vh-64px)] custom-scrollbar">
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
          
          <div className="relative w-full h-full overflow-auto border border-zinc-800 rounded-lg bg-zinc-950 min-h-[400px] custom-scrollbar">
            <div style={{ 
              width: `${width}px`, 
              height: `${height}px`, 
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'relative'
            }}>
              {/* Draw connections */}
              <svg className="absolute top-0 left-0" width={width} height={height}>
                {connections.map((conn, index) => {
                  const source = nodes.find(n => n.id === conn.source);
                  const target = nodes.find(n => n.id === conn.target);
                  
                  if (!source || !target) return null;
                  
                  const x1 = source.x + offsetX;
                  const y1 = source.y + offsetY;
                  const x2 = target.x + offsetX;
                  const y2 = target.y + offsetY;
                  
                  return (
                    <g key={`${conn.source}-${conn.target}-${conn.type}-${index}`}>
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
}: SettingsModalProps) {
  const [newCardsPerDay, setNewCardsPerDay] = useState(5);
  const [reviewsPerDay, setReviewsPerDay] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  
  if (!isVisible) return null;
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await fetch(`/api/users/me/preferences`, {
        method: "PATCH",
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