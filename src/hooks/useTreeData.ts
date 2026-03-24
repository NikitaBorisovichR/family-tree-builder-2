import { useState, useEffect, useRef, useCallback } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';
import { sendGoal, Goals } from '@/utils/analytics';
import func2url from '../../backend/func2url.json';

const INITIAL_NODES: FamilyNode[] = [
  {
    id: 'root',
    x: 360,
    y: 280,
    firstName: '',
    lastName: '',
    middleName: '',
    maidenName: '',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    deathDate: '',
    deathPlace: '',
    occupation: '',
    isAlive: true,
    relation: 'self',
    bio: '',
    historyContext: '',
    createdAt: Date.now()
  }
];

const API_URLS = {
  saveTree: func2url['save-tree'],
  loadTree: func2url['load-tree'],
  listTrees: func2url['list-trees']
};

export function useTreeData(currentView: string, overrideTreeId?: string | null) {
  const [nodes, setNodes] = useState<FamilyNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'canvas' | 'timeline'>('canvas');
  const [currentTreeId, setCurrentTreeId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTreeToDatabase = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(API_URLS.saveTree, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': userEmail
        },
        body: JSON.stringify({
          tree_id: currentTreeId,
          user_email: userEmail,
          title: 'Моё семейное древо',
          nodes,
          edges
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCurrentTreeId(data.tree_id);
        localStorage.setItem('familyTree_treeId', data.tree_id.toString());
        
        // Отправляем цель первого сохранения
        const isFirstSave = !currentTreeId;
        if (isFirstSave) {
          sendGoal(Goals.TREE_FIRST_SAVE);
        }
        
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        alert('Ошибка сохранения: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving tree:', error);
      alert('Ошибка при сохранении древа');
    } finally {
      setIsSaving(false);
    }
  }, [currentTreeId, userEmail, nodes, edges]);

  useEffect(() => {
    const init = async () => {
      const savedTreeId = overrideTreeId || localStorage.getItem('familyTree_treeId');
      const userData = localStorage.getItem('user_data');

      let email = '';
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed.email) {
            email = parsed.email;
            setUserEmail(parsed.email);
          }
        } catch (_) {
          // ignore
        }
      }

      // В режиме просмотра чужого дерева — грузим без проверки email
      if (overrideTreeId && API_URLS.loadTree) {
        try {
          const response = await fetch(
            `${API_URLS.loadTree}?tree_id=${overrideTreeId}`
          );
          if (response.ok) {
            const data = await response.json();
            setNodes(data.nodes && data.nodes.length > 0 ? data.nodes : INITIAL_NODES);
            setEdges(data.edges || []);
            setCurrentTreeId(data.tree_id);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error loading tree from server:', e);
        }
        setIsLoading(false);
        return;
      }

      // Загружаем с сервера если есть email и treeId
      if (email && savedTreeId && API_URLS.loadTree) {
        try {
          const response = await fetch(
            `${API_URLS.loadTree}?tree_id=${savedTreeId}&user_email=${encodeURIComponent(email)}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.nodes && data.nodes.length > 0) {
              setNodes(data.nodes);
              setEdges(data.edges || []);
              setCurrentTreeId(data.tree_id);
              localStorage.setItem('familyTree_nodes', JSON.stringify(data.nodes));
              localStorage.setItem('familyTree_edges', JSON.stringify(data.edges || []));
              localStorage.setItem('familyTree_treeId', String(data.tree_id));
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Error loading tree from server:', e);
        }
      }

      // Fallback: загружаем из localStorage
      const savedNodes = localStorage.getItem('familyTree_nodes');
      const savedEdges = localStorage.getItem('familyTree_edges');

      if (savedNodes) {
        try {
          setNodes(JSON.parse(savedNodes));
        } catch (e) {
          console.error('Error loading nodes', e);
        }
      }
      if (savedEdges) {
        try {
          setEdges(JSON.parse(savedEdges));
        } catch (e) {
          console.error('Error loading edges', e);
        }
      }
      if (savedTreeId) {
        setCurrentTreeId(parseInt(savedTreeId));
      }
      setIsLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('familyTree_nodes', JSON.stringify(nodes));
    localStorage.setItem('familyTree_edges', JSON.stringify(edges));
    
    const timer = setTimeout(() => {
      if (nodes.length > 1 && currentView === 'tree') {
        saveTreeToDatabase();
      }
    }, 900000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [nodes, edges, currentView, saveTreeToDatabase]);

  const addRelative = (sourceId: string, type: string, gender?: 'male' | 'female') => {
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) return;

    const existingParents = edges
      .filter((e) => e.target === sourceId && e.type !== 'spouse')
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean) as FamilyNode[];

    if (type === 'parent') {
      if (existingParents.length >= 2) {
        alert('У этого человека уже есть два родителя!');
        return;
      }

      if (existingParents.length === 1) {
        const existingParent = existingParents[0];
        if (existingParent.gender === gender) {
          alert('Нельзя добавить второго родителя того же пола!');
          return;
        }
      }
    }

    const newId = Date.now().toString();
    // x/y не используются для отображения (layout пересчитывает),
    // но нужны как поля FamilyNode — ставим 0
    const newX = 0;
    const newY = 0;
    const newLastName = sourceNode.lastName;

    let newGender: 'male' | 'female' = gender || sourceNode.gender;
    if (type === 'parent' && !gender) {
      if (existingParents.length === 1) {
        newGender = existingParents[0].gender === 'male' ? 'female' : 'male';
      } else {
        newGender = 'male';
      }
    } else if (type === 'spouse' && !gender) {
      newGender = sourceNode.gender === 'male' ? 'female' : 'male';
    }

    const newNode: FamilyNode = {
      id: newId,
      x: newX,
      y: newY,
      firstName: '',
      lastName: newLastName,
      middleName: '',
      maidenName: '',
      gender: newGender,
      birthDate: '',
      birthPlace: '',
      deathDate: '',
      deathPlace: '',
      occupation: '',
      relation: type,
      bio: '',
      historyContext: '',
      isAlive: true,
      createdAt: Date.now()
    };

    setNodes((prev) => [...prev, newNode]);

    const newEdgesList: Edge[] = [];

    if (type === 'sibling') {
      // Берём уникальных родителей source и связываем нового с ними
      const parentEdges = edges.filter((e) => e.target === sourceId && e.type !== 'spouse');
      const uniqueParentEdges = parentEdges.filter(
        (pe, idx, arr) => arr.findIndex((x) => x.source === pe.source) === idx
      );
      if (uniqueParentEdges.length > 0) {
        uniqueParentEdges.forEach((pe) =>
          newEdgesList.push({ id: `e-${Date.now()}-${pe.source}-${Math.random()}`, source: pe.source, target: newId })
        );
      } else {
        // Нет общих родителей — создаём прямую «родственную» связь через виртуальный sibling-edge
        newEdgesList.push({ id: `e-sib-${Date.now()}-${Math.random()}`, source: sourceId, target: newId, type: 'sibling' as never });
      }
    } else if (type === 'spouse') {
      newEdgesList.push({ id: `e-spouse-${Date.now()}-${Math.random()}`, source: sourceId, target: newId, type: 'spouse' });
    } else if (type === 'child') {
      newEdgesList.push({
        id: `e-${Date.now()}-${Math.random()}`,
        source: sourceId,
        target: newId
      });
      // Если у source есть супруг — связываем и его с ребёнком
      const spouseEdges = edges.filter((e) => e.type === 'spouse' && (e.source === sourceId || e.target === sourceId));
      if (spouseEdges.length > 0) {
        const spouseId = spouseEdges[0].source === sourceId ? spouseEdges[0].target : spouseEdges[0].source;
        // Проверяем что такой связи ещё нет
        const alreadyLinked = edges.some(e => e.source === spouseId && e.target === newId);
        if (!alreadyLinked) {
          newEdgesList.push({
            id: `e-${Date.now()}-${Math.random()}-sp`,
            source: spouseId,
            target: newId
          });
        }
      }
    } else if (type === 'parent') {
      newEdgesList.push({
        id: `e-${Date.now()}-${Math.random()}`,
        source: newId,
        target: sourceId
      });
      // Если уже есть первый родитель — создаём spouse-edge между ними
      if (existingParents.length > 0) {
        const partnerId = existingParents[0].id;
        // Проверяем что spouse-edge ещё нет
        const spouseAlreadyExists = edges.some(e =>
          e.type === 'spouse' &&
          ((e.source === partnerId && e.target === newId) || (e.source === newId && e.target === partnerId))
        );
        if (!spouseAlreadyExists) {
          newEdgesList.push({ id: `e-spouse-${Date.now()}-${Math.random()}`, source: partnerId, target: newId, type: 'spouse' });
        }
      }
    }

    setEdges((prev) => [...prev, ...newEdgesList]);
    setSelectedId(newId);
    
    // Отправляем цель добавления человека
    sendGoal(Goals.PERSON_ADDED, { relation: type });
  };

  const deleteNode = (id: string) => {
    if (id === 'root') {
      alert('Нельзя удалить корневую персону!');
      return;
    }
    
    const node = nodes.find(n => n.id === id);
    const nodeName = node ? `${node.firstName} ${node.lastName}`.trim() || 'этого человека' : 'этого человека';
    
    if (!window.confirm(`Вы уверены, что хотите удалить ${nodeName} из древа?`)) {
      return;
    }
    
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  const updateSelectedNode = (field: keyof FamilyNode, value: FamilyNode[keyof FamilyNode]) =>
    setNodes(nodes.map((n) => (n.id === selectedId ? { ...n, [field]: value, updatedAt: Date.now() } : n)));

  const handleExport = () => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'familytree.json';
    a.click();
    
    // Отправляем цель экспорта
    sendGoal(Goals.TREE_EXPORTED);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.nodes && Array.isArray(data.nodes)) setNodes(data.nodes);
        if (data.edges && Array.isArray(data.edges)) setEdges(data.edges);
        
        // Отправляем цель импорта
        sendGoal(Goals.TREE_IMPORTED);
      } catch (error) {
        alert('Ошибка при чтении файла: Неверный формат JSON');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);
  const parentIds = selectedNode
    ? edges.filter((e) => e.target === selectedNode.id && e.type !== 'spouse').map((e) => e.source)
    : [];
  const parents = nodes.filter((n) => parentIds.includes(n.id));

  return {
    nodes,
    edges,
    selectedId,
    mode,
    isSaving,
    isLoading,
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
  };
}