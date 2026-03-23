import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import HelpTooltip from '@/components/HelpTooltip';
import EmptyTreeState from '@/components/EmptyTreeState';
import TreeCanvas from '@/components/TreeCanvas';
import PersonInspector from '@/components/PersonInspector';
import { useTreeData } from '@/hooks/useTreeData';
import { useCanvasInteraction } from '@/hooks/useCanvasInteraction';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { isAdmin } from '@/config/admins';

export default function TreePage() {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAdminButton, setShowAdminButton] = useState(false);

  React.useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (isAdmin(user.email)) {
          setShowAdminButton(true);
        }
      } catch (_) {
        // ignore parse errors
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_data');
    navigate('/');
  };

  const {
    nodes,
    edges,
    selectedId,
    mode,
    isSaving,
    showSuccessToast,
    selectedNode,
    parents,
    fileInputRef,
    setNodes,
    setEdges,
    setSelectedId,
    setMode,
    addRelative,
    deleteNode,
    updateSelectedNode,
    saveTreeToDatabase,
    handleExport,
    handleImport
  } = useTreeData('tree');

  const {
    transform,
    lastMousePos,
    setTransform,
    handleWheel,
    handleMouseDown,
    handleNodeDragStart,
    handleMouseMove,
    handleMouseUp
  } = useCanvasInteraction();

  useKeyboardShortcuts(selectedId, setSelectedId, saveTreeToDatabase, () => navigate('/dashboard'), deleteNode);

  return (
    <div className="h-screen w-full bg-background flex flex-col relative">
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <Icon name="Check" size={20} />
          <span className="font-medium">Древо сохранено</span>
        </div>
      )}

      <div className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="На главную"
          >
            <Icon name="Home" size={20} />
          </button>
          <div className="font-bold text-primary flex items-center gap-2">
            <Icon name="Share2" /> Семейные корни
          </div>
        </div>
        <div className="flex gap-2 md:gap-4 items-center">
          <button
            onClick={saveTreeToDatabase}
            disabled={isSaving}
            className="px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-xs md:text-sm font-medium flex items-center gap-2"
            title="Сохранить в базу данных"
          >
            <Icon name={isSaving ? "Loader2" : "Save"} size={16} className={isSaving ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
          </button>
          
          {!isSaving && nodes.length > 1 && (
            <span className="text-xs text-muted-foreground hidden lg:inline">
              Автосохранение
            </span>
          )}

          <div className="w-px h-6 bg-border mx-1 md:mx-2"></div>

          <button
            onClick={handleExport}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Экспорт в JSON"
          >
            <Icon name="Download" size={20} />
          </button>

          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Импорт из JSON"
          >
            <Icon name="Upload" size={20} />
          </button>

          <div className="w-px h-6 bg-border mx-1 md:mx-2"></div>

          <button 
            onClick={() => navigate('/tutorial')}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Обучение"
          >
            <Icon name="GraduationCap" size={20} />
          </button>

          <button 
            onClick={() => navigate('/archive')}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Архивы"
          >
            <Icon name="Archive" size={20} />
          </button>

          <button 
            onClick={() => navigate('/support')}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Поддержка"
          >
            <Icon name="HelpCircle" size={20} />
          </button>

          <div className="w-px h-6 bg-border mx-1 md:mx-2"></div>

          {showAdminButton && (
            <button 
              onClick={() => navigate('/admin')}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Панель администратора"
            >
              <Icon name="Shield" size={20} />
            </button>
          )}

          <HelpTooltip />
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs cursor-pointer hover:bg-primary/20 transition-colors"
            title="Открыть профиль"
          >
            {nodes[0]?.firstName?.[0] || 'U'}
            {nodes[0]?.lastName?.[0] || ''}
          </button>

          <button 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-red-600 transition-colors"
            title="Выйти"
          >
            <Icon name="LogOut" size={20} />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden relative bg-muted/30 select-none">
        {nodes.length === 1 && !selectedId && showWelcome && <EmptyTreeState onClose={() => setShowWelcome(false)} />}
        
        <TreeCanvas
          nodes={nodes}
          edges={edges}
          selectedId={selectedId}
          transform={transform}
          mode={mode}
          onSetMode={setMode}
          onSetTransform={setTransform}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => handleMouseMove(e, nodes, setNodes)}
          onMouseUp={handleMouseUp}
          onNodeDragStart={handleNodeDragStart}
          onSelectNode={setSelectedId}
          onAddRelative={addRelative}
          lastMousePos={lastMousePos}
        />

        {mode === 'canvas' && (
          <>
            {selectedId && (
              <div 
                className="fixed inset-0 bg-black/20 z-30 md:hidden"
                onClick={() => setSelectedId(null)}
              />
            )}
            <div
              className={`fixed md:relative inset-y-0 right-0 w-80 md:w-96 bg-white shadow-2xl md:shadow-xl border-l border-border flex flex-col transition-transform duration-300 z-40 transform ${
                selectedId ? 'translate-x-0' : 'translate-x-full md:mr-[-24rem]'
              }`}
            >
              <PersonInspector
                selectedNode={selectedNode || null}
                parents={parents}
                onClose={() => setSelectedId(null)}
                onUpdateNode={updateSelectedNode}
                onSelectNode={setSelectedId}
                onDeleteNode={deleteNode}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}