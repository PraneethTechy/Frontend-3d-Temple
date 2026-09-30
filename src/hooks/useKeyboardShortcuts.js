import { useEffect } from 'react';
import { useQueueStore } from '../store/useQueueStore.js';

export function useKeyboardShortcuts() {
  const selectedComponentId = useQueueStore((state) => state.selectedComponentId);
  const setSelectedComponentId = useQueueStore((state) => state.setSelectedComponentId);
  const deleteComponent = useQueueStore((state) => state.deleteComponent);
  const duplicateComponent = useQueueStore((state) => state.duplicateComponent);
  const undo = useQueueStore((state) => state.undo);
  const redo = useQueueStore((state) => state.redo);
  const setTransformMode = useQueueStore((state) => state.setTransformMode);
  const isImmersive = useQueueStore((state) => state.isImmersive);
  const toggleImmersive = useQueueStore((state) => state.toggleImmersive);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not intercept if user is typing inside any form input or textarea
      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (isInput) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Toggle Immersive 3D Review Mode: 'F' or 'Ctrl/Cmd + Shift + F'
      if ((e.key.toLowerCase() === 'f' && !isCtrlOrCmd) || (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        toggleImmersive();
        return;
      }

      // Undo: Ctrl/Cmd + Z (without shift)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z OR Ctrl + Y
      if ((isCtrlOrCmd && e.key.toLowerCase() === 'z' && e.shiftKey) || (isCtrlOrCmd && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        if (selectedComponentId) {
          e.preventDefault();
          duplicateComponent(selectedComponentId);
        }
        return;
      }

      // Clear Selection or Exit Immersive: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedComponentId) {
          setSelectedComponentId(null);
        } else if (isImmersive) {
          toggleImmersive();
        }
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId) {
          e.preventDefault();
          deleteComponent(selectedComponentId);
        }
        return;
      }

      // Quick Gizmo mode switches: 'G' for Translate/Move, 'R' for Rotate
      if (e.key.toLowerCase() === 'g' || e.key.toLowerCase() === 'w') {
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'r') {
        setTransformMode('rotate');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, deleteComponent, duplicateComponent, undo, redo, setSelectedComponentId, setTransformMode]);
}
