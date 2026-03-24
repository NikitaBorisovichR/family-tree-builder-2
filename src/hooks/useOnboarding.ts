// useOnboarding hook
import { useState } from 'react';
import { FamilyNode, Edge } from '@/components/TreeCanvas';

const INITIAL_NODES: FamilyNode[] = [
  {
    id: 'root',
    x: 400,
    y: 300,
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
    historyContext: ''
  }
];

export function useOnboarding(
  nodes: FamilyNode[],
  setNodes: (nodes: FamilyNode[]) => void,
  setEdges: (edges: Edge[]) => void,
  setCurrentView: (view: string) => void
) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'male',
    fatherName: '',
    motherName: ''
  });

  const handleOnboardingBack = () => {
    if (onboardingStep > 1) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const handleOnboardingSkip = () => {
    setOnboardingStep(3);
  };

  const handleOnboardingNext = () => {
    if (onboardingStep === 3) {
      const rootNode = nodes[0] ?? INITIAL_NODES[0];
      const updatedRoot: FamilyNode = {
        ...rootNode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender as 'male' | 'female',
        createdAt: rootNode.createdAt ?? Date.now()
      };

      const newNodes = [updatedRoot];
      const newEdges: Edge[] = [];

      if (formData.fatherName) {
        const fatherId = 'father';
        newNodes.push({
          id: fatherId,
          x: 250,
          y: 150,
          firstName: formData.fatherName,
          lastName: formData.lastName,
          middleName: '',
          maidenName: '',
          gender: 'male',
          birthDate: '',
          birthPlace: '',
          deathDate: '',
          deathPlace: '',
          occupation: '',
          isAlive: true,
          relation: 'parent',
          bio: '',
          historyContext: '',
          createdAt: Date.now()
        });
        newEdges.push({ id: 'e1', source: fatherId, target: 'root' });
      }

      if (formData.motherName) {
        const motherId = 'mother';
        newNodes.push({
          id: motherId,
          x: 550,
          y: 150,
          firstName: formData.motherName,
          lastName: '',
          middleName: '',
          maidenName: '',
          gender: 'female',
          birthDate: '',
          birthPlace: '',
          deathDate: '',
          deathPlace: '',
          occupation: '',
          isAlive: true,
          relation: 'parent',
          bio: '',
          historyContext: '',
          createdAt: Date.now()
        });
        newEdges.push({ id: 'e2', source: motherId, target: 'root' });
      }

      if (formData.fatherName && formData.motherName) {
        newEdges.push({ id: 'e3', source: 'father', target: 'mother', type: 'spouse' });
      }

      setNodes(newNodes);
      setEdges(newEdges);
      setCurrentView('tree');
    } else {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  return {
    onboardingStep,
    formData,
    setFormData,
    handleOnboardingBack,
    handleOnboardingSkip,
    handleOnboardingNext
  };
}