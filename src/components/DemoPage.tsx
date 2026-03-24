import React from 'react';
import TreeCanvas from '@/components/TreeCanvas';
import PersonInspector from '@/components/PersonInspector';
import DemoPageHeader from '@/components/DemoPageHeader';
import { useDemoTreeInteraction } from '@/hooks/useDemoTreeInteraction';
import { useTreeLayout } from '@/hooks/useTreeLayout';
import { DEMO_NODES, DEMO_EDGES } from '@/data/romanovDynastyData';

interface DemoPageProps {
  onClose: () => void;
}

export default function DemoPage({ onClose }: DemoPageProps) {
  const {
    selectedId,
    setSelectedId,
    mode,
    setMode,
    transform,
    setTransform,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    selectedNode,
    parents
  } = useDemoTreeInteraction(DEMO_NODES, DEMO_EDGES);

  const layoutNodes = useTreeLayout(DEMO_NODES, DEMO_EDGES);

  return (
    <div className="h-screen w-full bg-background flex flex-col relative">
      <DemoPageHeader onClose={onClose} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <TreeCanvas
            nodes={DEMO_NODES}
            layoutNodes={layoutNodes}
            edges={DEMO_EDGES}
            selectedId={selectedId}
            transform={transform}
            mode={mode}
            onSetMode={setMode}
            onSetTransform={setTransform}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onSelectNode={setSelectedId}
            onAddRelative={() => { /* demo mode */ }}
          />
        </div>

        {selectedId && selectedNode && (
          <div className="fixed md:relative inset-y-0 right-0 w-80 md:w-96 bg-white shadow-2xl md:shadow-xl border-l border-border flex flex-col z-40">
            <PersonInspector
              selectedNode={selectedNode}
              parents={parents}
              onClose={() => setSelectedId(null)}
              onUpdateNode={() => { /* demo mode */ }}
              onSelectNode={setSelectedId}
              onDeleteNode={() => { /* demo mode */ }}
            />
          </div>
        )}
      </div>
    </div>
  );
}