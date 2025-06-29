import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { getStatuses } from '../utils/statusApi';
import { getProjects, updateProjectStatus, type ProjectApiResponse } from '../utils/api';

// Интерфейсы
interface Status {
  _id: string;
  name: string;
  color: string;
  order: number;
  companyId: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Project {
  _id: string;
  name: string;
  customer?: string;
  status?: string;
  statusId?: {
    _id: string;
    name: string;
    color: string;
    order: number;
  };
  price?: number;
  priceHistory?: { price: number; date: string }[];
  statusHistory?: { status: string; statusId?: string; date: string }[];
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

interface KanbanBoardProps {
  companyId: string;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
  searchTerm?: string;
  dateFilter?: 'all' | 'today' | 'week' | 'month' | 'custom';
  customDateFrom?: string;
  customDateTo?: string;
}

// Конфигурационные лейблы как в ProjectHistory
const configLabels: Record<string, string> = {
  glass: 'Стационарное стекло',
  straight: 'Прямая раздвижная',
  'straight-opening': 'Прямая раздвижная',
  'straight-glass': 'Прямая раздвижная',
  corner: 'Угловая раздвижная',
  unique: 'Уникальная конфигурация',
  partition: 'Перегородка',
};

// Функция для получения лейбла конфигурации
const getConfigLabel = (config: string): string => {
  return configLabels[config] || config;
};

// Компонент для сортируемого элемента проекта
interface SortableProjectProps {
  project: Project;
  isOverlay?: boolean;
  onEdit?: (project: Project) => void;
  onProjectMove?: (projectId: string, targetStatusId: string, statusName: string, insertPosition?: number) => Promise<void>;
  isDragActive?: boolean;
  onSetDragActive?: (active: boolean) => void;
  statuses?: Status[];
  projectIndex?: number;
  statusId?: string;
  insertionPosition?: {statusId: string; position: number} | null;
  projectsByStatus?: Record<string, Project[]>;
  onInsertionPositionChange?: (position: {statusId: string; position: number} | null) => void;
}

const SortableProject: React.FC<SortableProjectProps> = ({ 
  project, 
  isOverlay = false, 
  onEdit, 
  onProjectMove, 
  isDragActive = false, 
  onSetDragActive, 
  statuses = [], // eslint-disable-line @typescript-eslint/no-unused-vars
  projectIndex = 0, 
  statusId, 
  insertionPosition,
  projectsByStatus = {},
  onInsertionPositionChange
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const projectRef = React.useRef<HTMLDivElement>(null);
  const lastInsertionPositionRef = React.useRef<{statusId: string; position: number} | null>(null);
  
  // Touch handling states
  const [isTouchStarted, setIsTouchStarted] = React.useState(false);
  const [longPressTimer, setLongPressTimer] = React.useState<number | null>(null);
  const [isDragMode, setIsDragMode] = React.useState(false);
  const [touchStartPos, setTouchStartPos] = React.useState<{x: number, y: number} | null>(null);
  
  // Определяем нужно ли добавить spacing сверху или снизу
  const shouldAddSpaceAbove = insertionPosition?.statusId === statusId && insertionPosition?.position === projectIndex;
  const shouldAddSpaceBelow = insertionPosition?.statusId === statusId && insertionPosition?.position === projectIndex + 1;
  
  // Сохраняем последнее значение insertionPosition в ref для использования в handleMouseUp
  React.useEffect(() => {
    lastInsertionPositionRef.current = insertionPosition || null;
  }, [insertionPosition]);
  
  const sortableResult = useSortable({
    id: project._id,
  });

  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortableResult;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // Делаем почти невидимым во время драга
    zIndex: isDragging ? -1 : 1, // Убираем на задний план
  };

  // Альтернативная реализация drag and drop
  const [isDraggingManual, setIsDraggingManual] = React.useState(false);
  
  // Отключаем hover эффекты во время драга других проектов
  const shouldShowHover = isHovered && (!isDragActive || isDragging || isDraggingManual);

  // Touch события для мобильного
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsTouchStarted(true);
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsDragMode(false);
    
    // НЕ предотвращаем событие по умолчанию - позволяем браузеру обрабатывать скролл
    
    // Запускаем таймер для долгого нажатия (3 секунды)
    const timer = setTimeout(() => {
      console.log('🔥 LONG PRESS DETECTED - Starting drag mode for:', project.name);
      setIsDragMode(true);
      setIsTouchStarted(false);
      
      // Добавляем вибрацию если поддерживается
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Запускаем drag операцию
      handleTouchDragStart();
    }, 3000);
    
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchStarted && !isDragMode) return;
    
    const touch = e.touches[0];
    const startPos = touchStartPos;
    
    if (startPos && isTouchStarted) {
      const deltaX = Math.abs(touch.clientX - startPos.x);
      const deltaY = Math.abs(touch.clientY - startPos.y);
      
      // Улучшенное определение направления движения
      const isVerticalSwipe = deltaY > deltaX && deltaY > 15;
      const isHorizontalSwipe = deltaX > deltaY && deltaX > 15;
      const isAnySwipe = deltaX > 15 || deltaY > 15;
      
      // Если это свайп и мы не в drag mode - разрешаем скролл
      if (isAnySwipe && !isDragMode) {
        console.log('📱 SWIPE DETECTED:', {
          deltaX,
          deltaY,
          isVerticalSwipe,
          isHorizontalSwipe,
          direction: isVerticalSwipe ? 'vertical' : isHorizontalSwipe ? 'horizontal' : 'diagonal'
        });
        
        // Отменяем таймер долгого нажатия
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
        
        setIsTouchStarted(false);
        setTouchStartPos(null);
        
        // НЕ предотвращаем событие - позволяем браузеру обработать скролл
        return;
      }
    }
    
    // Если мы в drag mode - обрабатываем drag
    if (isDragMode) {
      e.preventDefault(); // Предотвращаем скролл только во время драга
      e.stopPropagation();
      handleTouchDragMove(touch);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Отменяем таймер если он еще активен
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    const touch = e.changedTouches[0];
    
    // Если мы в drag mode - завершаем drag
    if (isDragMode) {
      console.log('🏁 TOUCH DRAG END');
      handleTouchDragEnd(touch);
      setIsDragMode(false);
    } else if (isTouchStarted) {
      // Если это был быстрый тап - открываем детали
      console.log('👆 TAP DETECTED - Opening project details:', project.name);
      if (onEdit) onEdit(project);
    }
    
    setIsTouchStarted(false);
    setTouchStartPos(null);
  };

  const handleTouchDragStart = () => {
    setIsDraggingManual(true);
    onSetDragActive?.(true);
    
    // Устанавливаем стили для drag mode
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.classList.add('dragging-active');
    
    console.log('🔥 TOUCH DRAG STARTED:', project.name);
  };

  const handleTouchDragMove = (touch: React.Touch) => {
    // Логика аналогична handleMouseMove, но для touch
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Убираем все предыдущие подсветки
    document.querySelectorAll('.kanban-column').forEach(col => {
      const element = col as HTMLElement;
      element.classList.remove('drag-highlight');
    });
    
    // Ищем колонку под touch point
    let dropZone = elementUnderTouch;
    let attempts = 0;
    
    while (dropZone && attempts < 10) {
      if (dropZone.classList?.contains('kanban-column')) {
        const columnElement = dropZone as HTMLElement;
        columnElement.classList.add('drag-highlight');
        
        const statusId = columnElement.getAttribute('data-status-id');
        if (statusId) {
          const statusProjects = projectsByStatus[statusId] || [];
          
          // Динамическое позиционирование на основе координат touch
          const columnRect = columnElement.getBoundingClientRect();
          const touchY = touch.clientY;
          const relativeY = touchY - columnRect.top;
          
          const projectCards = columnElement.querySelectorAll('[data-project-id]');
          let insertPosition = 0;
          
          for (let i = 0; i < projectCards.length; i++) {
            const cardElement = projectCards[i] as HTMLElement;
            const cardRect = cardElement.getBoundingClientRect();
            const cardMiddle = cardRect.top - columnRect.top + cardRect.height / 2;
            
            if (relativeY < cardMiddle) {
              insertPosition = i;
              break;
            } else {
              insertPosition = i + 1;
            }
          }
          
          insertPosition = Math.max(0, Math.min(insertPosition, statusProjects.length));
          
          const currentPosition = insertionPosition;
          const isPositionChanged = !currentPosition || 
            currentPosition.statusId !== statusId || 
            currentPosition.position !== insertPosition;
          
          if (isPositionChanged) {
            console.log('🎯 TOUCH DRAG - INSERTION POSITION CHANGED:', { 
              from: currentPosition,
              to: { statusId, position: insertPosition },
              totalProjects: statusProjects.length 
            });
            onInsertionPositionChange?.({ statusId, position: insertPosition });
          }
        }
        break;
      }
      dropZone = dropZone.parentElement;
      attempts++;
    }
    
    if (attempts >= 10) {
      onInsertionPositionChange?.(null);
    }
  };

  const handleTouchDragEnd = async (touch: React.Touch) => {
    // Убираем все подсветки колонок
    document.querySelectorAll('.kanban-column').forEach(col => {
      const element = col as HTMLElement;
      element.classList.remove('drag-highlight');
    });
    
    const savedInsertionPosition = lastInsertionPositionRef.current;
    
    setIsDraggingManual(false);
    onSetDragActive?.(false);
    onInsertionPositionChange?.(null);
    
    // Сбрасываем стили
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.classList.remove('dragging-active');
    
    // Определяем элемент для drop
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    let dropZone = elementUnderTouch;
    let attempts = 0;
    
    while (dropZone && attempts < 10) {
      const statusId = dropZone.getAttribute('data-status-id');
      const statusName = dropZone.getAttribute('data-status-name');
      
      if (statusId && statusName) {
        const insertPositionToUse = savedInsertionPosition?.statusId === statusId 
          ? savedInsertionPosition.position 
          : undefined;
          
        console.log('📍 TOUCH DROP on column:', statusName, 'with insertion position:', insertPositionToUse);
        
        const isSameStatus = project.statusId?._id === statusId;
        const isDifferentPosition = insertPositionToUse !== undefined;
        
        if (!isSameStatus || isDifferentPosition) {
          const positionText = insertPositionToUse !== undefined 
            ? ` на позицию ${insertPositionToUse + 1}` 
            : '';
          const loadingMessage = `Перемещаем проект "${project.name}"${positionText}...`;
          
          // Показываем уведомление
          const notification = document.createElement('div');
          notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>${loadingMessage}</span>
              <button style="
                background: none;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                padding: 0 0 0 12px;
                margin: 0;
                line-height: 1;
              " onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
          `;
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196f3;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
          `;
          document.body.appendChild(notification);
          
          // Перемещаем проект
          if (onProjectMove) {
            try {
              await onProjectMove(project._id, statusId, statusName, insertPositionToUse);
              
              const successText = insertPositionToUse !== undefined 
                ? ` на позицию ${insertPositionToUse + 1}` 
                : '';
              notification.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Проект перемещен в "${statusName}"${successText}</span>
                  <button style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0 0 0 12px;
                    margin: 0;
                    line-height: 1;
                  " onclick="this.parentElement.parentElement.remove()">✕</button>
                </div>
              `;
              notification.style.background = '#4caf50';
              
              setTimeout(() => {
                if (notification.parentNode) {
                  document.body.removeChild(notification);
                }
              }, 3000);
              
            } catch (err) {
              notification.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Ошибка: ${err instanceof Error ? err.message : 'Не удалось переместить проект'}</span>
                  <button style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0 0 0 12px;
                    margin: 0;
                    line-height: 1;
                  " onclick="this.parentElement.parentElement.remove()">✕</button>
                </div>
              `;
              notification.style.background = '#f44336';
              
              setTimeout(() => {
                if (notification.parentNode) {
                  document.body.removeChild(notification);
                }
              }, 5000);
            }
          }
        }
        return;
      }
      
      dropZone = dropZone.parentElement;
      attempts++;
    }
    
    console.log('❌ Invalid touch drop zone');
  };
  
  const handleManualMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Предотвращаем выделение текста
    e.stopPropagation(); // Предотвращаем всплытие события
    
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let dragElement: HTMLElement | null = null;
    
    // Размеры летающей карточки (примерные, основаны на стилях)
    const flyingCardWidth = 280; // Примерная ширина летающей карточки
    const flyingCardHeight = 120; // Примерная высота летающей карточки
    
    // Вычисляем offset для позиционирования курсора в центре по ширине и в верхней трети по высоте летающей карточки
    const offsetX = -flyingCardWidth / 2;  // Курсор в центре по ширине
    const offsetY = -flyingCardHeight / 3; // Курсор в верхней трети по высоте
    
    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = Math.abs(event.clientX - startX);
      const deltaY = Math.abs(event.clientY - startY);
      
      if (!moved && (deltaX > 5 || deltaY > 5)) {
        moved = true;
        setIsDraggingManual(true);
        onSetDragActive?.(true); // Устанавливаем глобальный флаг драга
        
        // Устанавливаем курсор grabbing на весь документ
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        document.body.classList.add('dragging-active');
        
        console.log('🔥 MANUAL DRAG STARTED:', project.name);
        
        // Создаем летающий элемент
        dragElement = document.createElement('div');
        dragElement.innerHTML = `
          <div style="
            background: #f0f8ff;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 8px 24px rgba(33, 150, 243, 0.4);
            opacity: 0.9;
            pointer-events: none;
            z-index: 9999;
            position: fixed;
            transform: rotate(3deg);
            width: ${flyingCardWidth}px;
            box-sizing: border-box;
          ">
            <div style="font-weight: 600; font-size: 16px; color: #000; margin-bottom: 4px;">
              ${project.name}
            </div>
            <div style="color: #666; font-size: 12px;">
              Перетаскивание...
            </div>
          </div>
        `;
        dragElement.style.position = 'fixed';
        // Позиционируем так, чтобы курсор был в центре по ширине и в верхней трети по высоте
        dragElement.style.left = event.clientX + offsetX + 'px';
        dragElement.style.top = event.clientY + offsetY + 'px';
        dragElement.style.zIndex = '9999';
        dragElement.style.pointerEvents = 'none';
        document.body.appendChild(dragElement);
      }
      
      if (moved && dragElement) {
        // Обновляем позицию летающего элемента с учетом offset
        dragElement.style.left = event.clientX + offsetX + 'px';
        dragElement.style.top = event.clientY + offsetY + 'px';
        
        // Определяем колонку под курсором для подсветки
        const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
        
        // Убираем все предыдущие подсветки - только то что мы добавляли
        document.querySelectorAll('.kanban-column').forEach(col => {
          const element = col as HTMLElement;
          element.classList.remove('drag-highlight');
        });
        
        // Ищем колонку под курсором и обновляем позицию вставки
        let dropZone = elementUnderMouse;
        let attempts = 0;
        
        while (dropZone && attempts < 10) {
          if (dropZone.classList?.contains('kanban-column')) {
            // Подсвечиваем найденную колонку через CSS класс
            const columnElement = dropZone as HTMLElement;
            columnElement.classList.add('drag-highlight');
            
            // Получаем ID статуса колонки для позиционирования
            const statusId = columnElement.getAttribute('data-status-id');
            if (statusId) {
              const statusProjects = projectsByStatus[statusId] || [];
              
              // Динамическое позиционирование на основе координат мыши
              const columnRect = columnElement.getBoundingClientRect();
              const mouseY = event.clientY;
              const relativeY = mouseY - columnRect.top;
              
              // Находим карточки в колонке
              const projectCards = columnElement.querySelectorAll('[data-project-id]');
              let insertPosition = 0;
              
              // Определяем позицию вставки на основе позиции мыши относительно карточек
              for (let i = 0; i < projectCards.length; i++) {
                const cardElement = projectCards[i] as HTMLElement;
                const cardRect = cardElement.getBoundingClientRect();
                const cardMiddle = cardRect.top - columnRect.top + cardRect.height / 2;
                
                if (relativeY < cardMiddle) {
                  insertPosition = i;
                  break;
                } else {
                  insertPosition = i + 1;
                }
              }
              
              // Ограничиваем позицию разумными пределами
              insertPosition = Math.max(0, Math.min(insertPosition, statusProjects.length));
              
              // Проверяем, изменилась ли позиция
              const currentPosition = insertionPosition;
              const isPositionChanged = !currentPosition || 
                currentPosition.statusId !== statusId || 
                currentPosition.position !== insertPosition;
              
              if (isPositionChanged) {
                                 console.log('🎯 MANUAL DRAG - INSERTION POSITION CHANGED:', { 
                   from: currentPosition,
                   to: { statusId, position: insertPosition },
                   totalProjects: statusProjects.length 
                 });
                 onInsertionPositionChange?.({ statusId, position: insertPosition });
              }
            }
            break;
          }
          dropZone = dropZone.parentElement;
          attempts++;
        }
        
        // Если не нашли колонку, очищаем позицию вставки
        if (attempts >= 10) {
          onInsertionPositionChange?.(null);
        }
      }
    };
    
    const handleMouseUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Убираем все подсветки колонок
      document.querySelectorAll('.kanban-column').forEach(col => {
        const element = col as HTMLElement;
        element.classList.remove('drag-highlight');
      });
      
      if (dragElement) {
        document.body.removeChild(dragElement);
      }
      
      // ВАЖНО: Сохраняем позицию вставки из ref для использования в drop
      const savedInsertionPosition = lastInsertionPositionRef.current;
      
      setIsDraggingManual(false);
      onSetDragActive?.(false); // Сбрасываем глобальный флаг драга
      onInsertionPositionChange?.(null); // Очищаем позицию вставки
      
      // Сбрасываем курсор на документе
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('dragging-active');
      
              if (moved) {
          console.log('🏁 MANUAL DRAG ENDED:', project.name);
          
          // Определяем элемент для drop (insertion point или колонка)
          const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
          let dropZone = elementUnderMouse;
          let attempts = 0;
          
          while (dropZone && attempts < 10) {
            // Проверяем колонку и используем СОХРАНЕННОЕ состояние insertionPosition
            const statusId = dropZone.getAttribute('data-status-id');
            const statusName = dropZone.getAttribute('data-status-name');
            
            if (statusId && statusName) {
              // Используем СОХРАНЕННОЕ состояние insertionPosition если есть
              const insertPositionToUse = savedInsertionPosition?.statusId === statusId 
                ? savedInsertionPosition.position 
                : undefined;
                
              console.log('📍 DROP on column:', statusName, 'with insertion position:', insertPositionToUse);
              
              // Проверяем нужно ли что-то перемещать
              const isSameStatus = project.statusId?._id === statusId;
              const isDifferentPosition = insertPositionToUse !== undefined;
              
              console.log('🔍 DROP DEBUG:', {
                projectName: project.name,
                fromStatus: project.statusId?.name,
                toStatus: statusName,
                savedInsertionPosition,
                insertPosition: insertPositionToUse,
                isSameStatus,
                isDifferentPosition
              });
              
              if (!isSameStatus || isDifferentPosition) {
                // Показываем уведомление о начале перемещения
                const positionText = insertPositionToUse !== undefined 
                  ? ` на позицию ${insertPositionToUse + 1}` 
                  : '';
                const loadingMessage = `Перемещаем проект "${project.name}"${positionText}...`;
                const notification = document.createElement('div');
                notification.innerHTML = `
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span>${loadingMessage}</span>
                    <button style="
                      background: none;
                      border: none;
                      color: white;
                      font-size: 16px;
                      cursor: pointer;
                      padding: 0 0 0 12px;
                      margin: 0;
                      line-height: 1;
                    " onclick="this.parentElement.parentElement.remove()">✕</button>
                  </div>
                `;
                notification.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #2196f3;
                  color: white;
                  padding: 12px 20px;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  z-index: 10000;
                  font-weight: 600;
                `;
                document.body.appendChild(notification);
                
                // Реальное перемещение проекта с позицией если есть
                if (onProjectMove) {
                  try {
                    await onProjectMove(project._id, statusId, statusName, insertPositionToUse);
                    
                    // Успешное перемещение
                    const successText = insertPositionToUse !== undefined 
                      ? ` на позицию ${insertPositionToUse + 1}` 
                      : '';
                    notification.innerHTML = `
                      <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Проект перемещен в "${statusName}"${successText}</span>
                        <button style="
                          background: none;
                          border: none;
                          color: white;
                          font-size: 16px;
                          cursor: pointer;
                          padding: 0 0 0 12px;
                          margin: 0;
                          line-height: 1;
                        " onclick="this.parentElement.parentElement.remove()">✕</button>
                      </div>
                    `;
                    notification.style.background = '#4caf50';
                    
                    setTimeout(() => {
                      if (notification.parentNode) {
                        document.body.removeChild(notification);
                      }
                    }, 3000);
                    
                  } catch (err) {
                    // Ошибка перемещения
                    notification.innerHTML = `
                      <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Ошибка: ${err instanceof Error ? err.message : 'Не удалось переместить проект'}</span>
                        <button style="
                          background: none;
                          border: none;
                          color: white;
                          font-size: 16px;
                          cursor: pointer;
                          padding: 0 0 0 12px;
                          margin: 0;
                          line-height: 1;
                        " onclick="this.parentElement.parentElement.remove()">✕</button>
                      </div>
                    `;
                    notification.style.background = '#f44336';
                    
                    setTimeout(() => {
                      if (notification.parentNode) {
                        document.body.removeChild(notification);
                      }
                    }, 5000);
                  }
                }
                
              } else {
                console.log('⚠️ Same position in same column - no move needed');
              }
              return;
            }
            
            dropZone = dropZone.parentElement;
            attempts++;
          }
          
          console.log('❌ Invalid drop zone');
        } else {
          // Обычный клик - открываем редактирование
          if (onEdit) onEdit(project);
        }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Принудительно используем нашу реализацию вместо @dnd-kit
  const testHandlers = {
    onMouseDown: handleManualMouseDown,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (projectRef.current !== node) {
          projectRef.current = node;
        }
      }}
      {...testHandlers}
      data-project-id={project._id}
      data-drag-mode={isDragMode ? 'true' : 'false'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...style,
        cursor: isDraggingManual ? 'grabbing' : isHovered ? 'grab' : 'pointer',
        // Убираем transition для margin во время dragActive
        transition: isDragActive ? 'margin 0.2s ease' : (isDragging || isDraggingManual) ? 'none' : 'all 0.2s ease',
        touchAction: isDragMode ? 'none' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderRadius: '8px',
        pointerEvents: 'auto',
        opacity: isDraggingManual ? 0.7 : 1,
        minHeight: '60px',
        // Динамический spacing для показа позиции вставки
        marginTop: shouldAddSpaceAbove ? '80px' : '8px',
        marginBottom: shouldAddSpaceBelow ? '80px' : '8px',
      }}
    >
      <ProjectCard 
        project={project} 
        isOverlay={isOverlay} 
        isHovered={shouldShowHover}
        isDragging={isDragging}
        isDraggingManual={isDraggingManual}
      />
    </div>
  );
};

// Компонент карточки проекта
interface ProjectCardProps {
  project: Project;
  isOverlay?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isDraggingManual?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  isOverlay = false, 
  isHovered = false, 
  isDragging = false,
  isDraggingManual = false
}) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <div
      style={{
        marginBottom: 8,
        background: isOverlay || isDraggingManual
          ? '#e3f2fd' 
          : isHovered 
            ? '#f0f8ff' 
            : '#ffffff',
        borderRadius: 8,
        padding: isMobile ? 12 : 16,
        // Улучшенная синяя рамка при hover и dragging
        border: (isOverlay || isHovered || isDraggingManual)
          ? '2px solid #2196f3' 
          : '1px solid #f0f0f0',
        boxShadow: isOverlay || isDraggingManual
          ? '0 8px 24px rgba(33, 150, 243, 0.4)' 
          : 'none',
        userSelect: 'none',
        transition: isOverlay || isDragging || isDraggingManual ? 'none' : 'all 0.2s ease',
        // Убеждаемся что рамка точно выровнена по карточке
        boxSizing: 'border-box',
      }}
    >
      {/* Название проекта */}
      <div style={{ 
        fontWeight: 600, 
        fontSize: 18, 
        marginBottom: 8, 
        wordBreak: 'break-word', 
        color: '#000'
      }}>
        {project.name || 'Без названия'}
        {project.data && 
         typeof project.data === 'object' && 
         'config' in project.data && 
         typeof project.data.config === 'string' && (
          <span style={{ 
            color: '#666', 
            fontWeight: 400, 
            fontSize: 16 
          }}>
            {' '}({getConfigLabel(project.data.config)})
          </span>
        )}
      </div>
      
      {/* Заказчик */}
      {project.customer && (
        <div style={{ 
          color: '#666', 
          fontSize: 14, 
          marginBottom: 8, 
          fontStyle: 'italic'
        }}>
          <strong>Заказчик:</strong> {project.customer}
        </div>
      )}
      
      {/* Сумма */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 4
      }}>
        <span style={{ 
          color: '#222', 
          fontWeight: 700, 
          fontSize: 16 
        }}>
          Сумма:
        </span>
        <span style={{ 
          color: '#222', 
          fontWeight: 700, 
          fontSize: 16 
        }}>
          {typeof project.price === 'number' 
            ? project.price.toLocaleString('ru-RU') 
            : 0} ₾
        </span>
      </div>
      
      {/* Дата */}
      <div style={{ 
        color: '#888', 
        fontSize: 13
      }}>
        {new Date(project.createdAt).toLocaleString('ru-RU')}
      </div>
    </div>
  );
};

// Компонент дропзоны для статуса
interface DroppableStatusProps {
  status: Status;
  projects: Project[];
  onProjectEdit?: (project: Project) => void;
  onProjectMove?: (projectId: string, targetStatusId: string, statusName: string, insertPosition?: number) => Promise<void>;
  isDesktop?: boolean;
  isDragActive?: boolean;
  onSetDragActive?: (active: boolean) => void;
  statuses: Status[];
  insertionPosition?: {statusId: string; position: number} | null;
  projectsByStatus?: Record<string, Project[]>;
  onInsertionPositionChange?: (position: {statusId: string; position: number} | null) => void;
}

const DroppableStatus: React.FC<DroppableStatusProps> = ({ 
  status, 
  projects, 
  onProjectEdit,
  onProjectMove,
  isDesktop = true,
  isDragActive = false,
  onSetDragActive,
  statuses,
  insertionPosition,
  projectsByStatus = {},
  onInsertionPositionChange
}) => {
  const projectIds = projects.map(p => p._id);
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Используем useDroppable для создания дропзоны
  const { isOver, setNodeRef } = useDroppable({
    id: status._id,
  });

  const containerStyle = isDesktop ? {
    // Фиксированная ширина для горизонтального скролла
    flex: `0 0 ${window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px'}`,
    width: window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px',
    minWidth: window.innerWidth >= 1400 ? '320px' : window.innerWidth >= 1200 ? '280px' : '250px',
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    height: '100%',
    minHeight: '200px',
    maxHeight: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    border: '2px solid #e0e0e0'
  } : {
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    boxSizing: 'border-box' as const,
    minHeight: 'calc(100vh - 320px)',
    maxHeight: 'calc(100vh - 320px)',
    overflowY: 'auto' as const,
    border: '2px solid #e0e0e0'
  };

  // console.log('🏗️ Creating DroppableStatus for:', status.name, 'with ID:', status._id);
  
  return (
    <div 
      ref={setNodeRef}
      className="kanban-column"
      data-status-id={status._id}
      data-status-name={status.name}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...containerStyle,
        background: isOver 
          ? 'linear-gradient(135deg, #bbdefb 0%, #90caf9 100%)' 
          : isHovered 
            ? '#f8f9fa' 
            : containerStyle.background,
        border: isOver ? '4px dashed #2196f3' : undefined, // Оставляем базовую границу
        transform: isOver ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isOver 
          ? '0 8px 24px rgba(33, 150, 243, 0.3)' 
          : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Заголовок колонки - только для десктопа */}
      {isDesktop && (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: 16,
        paddingBottom: 12,
        flexShrink: 0
      }}>
        <div 
          style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            background: status.color,
            marginRight: 8 
          }} 
        />
        <h3 style={{ 
          fontSize: 16, 
          fontWeight: 600, 
          margin: 0,
          color: '#000'
        }}>
          {status.name}
        </h3>
        <span style={{ 
          marginLeft: 'auto',
          background: '#e0e0e0',
          borderRadius: 12,
          padding: '4px 8px',
          fontSize: 12,
          color: '#666'
        }}>
          {projects.length}
        </span>
      </div>
      )}

            {/* Список проектов с динамическим spacing */}
      <div style={{
        flex: 1,
        overflowY: isDesktop ? 'auto' : 'visible',
        minHeight: 0,
        padding: isDesktop ? 4 : '12px 0 0 0',
      }}>
        <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
          {projects.map((project, index) => (
            <SortableProject
              key={project._id}
              project={project}
              onEdit={onProjectEdit}
              onProjectMove={onProjectMove}
              isDragActive={isDragActive}
              onSetDragActive={onSetDragActive}
              statuses={statuses}
              projectIndex={index}
              statusId={status._id}
              insertionPosition={insertionPosition}
              projectsByStatus={projectsByStatus}
              onInsertionPositionChange={onInsertionPositionChange}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  companyId, 
  onProjectEdit,
  onProjectDelete: _onProjectDelete, // eslint-disable-line @typescript-eslint/no-unused-vars
  searchTerm = '',
  dateFilter = 'all',
  customDateFrom = '',
  customDateTo = ''
}) => {
  // ПРОСТАЯ ОТЛАДКА ДЛЯ ПРОВЕРКИ (отключена для уменьшения шума)
  // console.log('🔥 KanbanBoard RENDERING at:', new Date().toISOString());
  
  // Отладка монтирования компонента (отключена)
  // React.useEffect(() => {
  //   console.log('🏗️ KanbanBoard mounted/remounted at:', new Date().toISOString());
  //   return () => {
  //     console.log('💥 KanbanBoard unmounting at:', new Date().toISOString());
  //   };
  // }, []);
  
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  // Состояние для drag overlay
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Состояние для отслеживания позиции вставки
  const [insertionPosition, setInsertionPosition] = useState<{statusId: string; position: number} | null>(null);
  
  // Отладка изменений insertionPosition (убрана для уменьшения шума в консоли)
  // React.useEffect(() => {
  //   console.log('🔄 insertionPosition changed:', insertionPosition);
  // }, [insertionPosition]);
  
  // Функция для управления состоянием драга
  const handleSetDragActive = (active: boolean) => {
    setIsDragActive(active);
  };

  // Функция фильтрации проектов
  const filterProjects = (projects: Project[]): Project[] => {
    let filtered = projects;

    // Фильтр по поисковому запросу
    if (searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(project => {
        const nameMatch = project.name && project.name.toLowerCase().includes(search);
        const customerMatch = project.customer && project.customer.toLowerCase().includes(search);
        return nameMatch || customerMatch;
      });
    }

    // Фильтр по дате
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(project => {
        const projectDate = new Date(project.createdAt);
        
        switch (dateFilter) {
          case 'today':
            return projectDate >= today;
          case 'week': {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return projectDate >= weekAgo;
          }
          case 'month': {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return projectDate >= monthAgo;
          }
          case 'custom': {
            if (customDateFrom && customDateTo) {
              const fromDate = new Date(customDateFrom);
              const toDate = new Date(customDateTo);
              toDate.setHours(23, 59, 59, 999); // включаем весь день
              return projectDate >= fromDate && projectDate <= toDate;
            }
            return true;
          }
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  // Упрощенная настройка сенсоров
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Отслеживание изменения размера экрана
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Закрытие меню статусов при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusMenu && !(event.target as Element).closest('.status-menu')) {
        setShowStatusMenu(false);
      }
    };

    if (showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusMenu]);

  // Загрузка данных с сервера
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Загружаем статусы и проекты параллельно
        const [statusesData, projectsData] = await Promise.all([
          getStatuses(companyId),
          getProjects({ companyId })
        ]);
        
        setStatuses(statusesData);
        
        // Преобразуем ProjectApiResponse в Project
        const mappedProjects: Project[] = projectsData.map((project: ProjectApiResponse) => ({
          _id: project._id,
          name: project.name,
          customer: project.customer,
          status: project.statusId?.name || project.status,
          statusId: project.statusId,
          price: project.price,
          priceHistory: project.priceHistory,
          statusHistory: project.statusHistory,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          data: project.data
        }));
        
        setProjects(mappedProjects);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };
    
    if (companyId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  // Упрощенная группировка проектов по ID статусов с применением фильтров
  const projectsByStatus = React.useMemo(() => {
    const byStatus: Record<string, Project[]> = {};
    // Применяем фильтрацию к проектам
    const filteredProjects = filterProjects(projects);
    
    statuses.forEach(status => {
      const statusProjects = filteredProjects.filter(project => 
        // Сравниваем по statusId._id если есть, иначе по названию статуса
        project.statusId?._id === status._id || 
        (project.status === status.name && !project.statusId)
      );
      byStatus[status._id] = statusProjects;
    });
    return byStatus;
  }, [projects, statuses, searchTerm, dateFilter, customDateFrom, customDateTo]);

  // Функция для реального перемещения проекта
  const handleProjectMove = async (projectId: string, targetStatusId: string, statusName: string, insertPosition?: number) => {
    try {
      // Находим целевой статус для получения полной информации
      const targetStatus = statuses.find(s => s._id === targetStatusId);
      if (!targetStatus) {
        throw new Error('Статус не найден');
      }

      // Находим проект для откатывания в случае ошибки
      const originalProject = projects.find(p => p._id === projectId);
      if (!originalProject) {
        throw new Error('Проект не найден');
      }

      // Обновляем локальное состояние с учетом позиции
      setProjects(prev => {
        console.log('🔧 UPDATING PROJECTS STATE:', {
          projectId,
          targetStatusId,
          insertPosition,
          originalStatus: originalProject.statusId?._id
        });
        
        // Обновляем информацию о статусе проекта
        const updatedProject = {
          ...originalProject,
          status: targetStatus.name,
          statusId: {
            _id: targetStatus._id,
            name: targetStatus.name,
            color: targetStatus.color,
            order: targetStatus.order
          }
        };

        // Если позиция не указана, добавляем в конец для этого статуса
        if (insertPosition === undefined) {
          const withoutProject = prev.filter(p => p._id !== projectId);
          return [...withoutProject, updatedProject];
        }

        // Определяем, перемещаем ли в том же статусе
        const isSameStatus = originalProject.statusId?._id === targetStatusId;
        
        if (isSameStatus) {
          // Внутри того же статуса - просто меняем порядок
          const result = [...prev];
          const currentIndex = result.findIndex(p => p._id === projectId);
          
          if (currentIndex !== -1) {
            // Удаляем из текущей позиции
            result.splice(currentIndex, 1);
            
            // Корректируем позицию вставки если удаляли элемент перед ней
            let adjustedPosition = insertPosition;
            if (currentIndex < insertPosition) {
              adjustedPosition = insertPosition - 1;
            }
            
            // Получаем проекты целевого статуса (без перетаскиваемого проекта)
            const statusProjects = result.filter(p => 
              p.statusId?._id === targetStatusId || 
              (p.status === targetStatus.name && !p.statusId)
            );
            
            // Ограничиваем позицию
            adjustedPosition = Math.max(0, Math.min(adjustedPosition, statusProjects.length));
            
            console.log('📍 SAME STATUS MOVE:', {
              currentIndex,
              originalPosition: insertPosition,
              adjustedPosition,
              statusProjectsCount: statusProjects.length
            });
            
            // Находим глобальную позицию для вставки
            const otherProjects = result.filter(p => 
              p.statusId?._id !== targetStatusId && 
              !(p.status === targetStatus.name && !p.statusId)
            );
            
            // Вставляем обновленный проект
            const targetProjects = [...statusProjects];
            targetProjects.splice(adjustedPosition, 0, updatedProject);
            
            return [...otherProjects, ...targetProjects];
          }
          
          return prev;
        } else {
          // Перемещение в другой статус
          const withoutProject = prev.filter(p => p._id !== projectId);
          
          // Получаем проекты для целевого статуса
          const targetStatusProjects = withoutProject.filter(p => 
            p.statusId?._id === targetStatusId || 
            (p.status === targetStatus.name && !p.statusId)
          );
          
          // Получаем проекты других статусов
          const otherStatusProjects = withoutProject.filter(p => 
            p.statusId?._id !== targetStatusId && 
            !(p.status === targetStatus.name && !p.statusId)
          );

          // Ограничиваем позицию
          const safePosition = Math.max(0, Math.min(insertPosition, targetStatusProjects.length));
          
          console.log('📍 DIFFERENT STATUS MOVE:', {
            originalPosition: insertPosition,
            safePosition,
            targetProjectsCount: targetStatusProjects.length
          });

          // Вставляем проект в указанную позицию
          const newTargetProjects = [...targetStatusProjects];
          newTargetProjects.splice(safePosition, 0, updatedProject);

          return [...otherStatusProjects, ...newTargetProjects];
        }
      });

      // Отправляем обновление на сервер
      await updateProjectStatus(projectId, targetStatusId);
      console.log(`✅ Проект успешно перемещен в статус ${statusName}${insertPosition !== undefined ? ` на позицию ${insertPosition}` : ''}`);
      
      // Логируем финальное состояние для отладки (отключено для уменьшения шума)
      // console.log('🎯 FINAL PROJECTS STATE:', {
      //   allProjects: projects.map(p => ({ id: p._id, name: p.name, status: p.statusId?.name || p.status })),
      //   targetStatusProjects: projects
      //     .filter(p => p.statusId?._id === targetStatusId || (p.status === statusName && !p.statusId))
      //     .map(p => ({ id: p._id, name: p.name }))
      // });
      
    } catch (err) {
      console.error('❌ Ошибка обновления статуса:', err);
      
      // Находим оригинальный проект для отката
      const originalProject = projects.find(p => p._id === projectId);
      
      // Откатываем изменения в случае ошибки
      if (originalProject) {
        setProjects(prev =>
          prev.map(p =>
            p._id === projectId 
              ? originalProject
              : p
          )
        );
      }
      
      throw err; // Пробрасываем ошибку дальше для обработки в UI
    }
  };

  // Простая проверка что DndContext вообще работает
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎉 SUCCESS! DRAG STARTED!', event);
    const { active } = event;
    const project = projects.find(p => p._id === active.id);
    setActiveProject(project || null);
    setIsDragActive(true); // Устанавливаем флаг активного драга
    
    // Устанавливаем курсор grabbing на весь документ
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.classList.add('dragging-active');
    
    console.log('Project found:', project?.name);
  };

      const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    
    // Простая логика для тестирования
    if (over && over.id && typeof over.id === 'string') {
      const statusId = over.id;
      const statusProjects = projectsByStatus[statusId] || [];
      
      // Фиксированная позиция для тестирования - середина
      const insertPosition = Math.floor(statusProjects.length / 2);
      
      // Проверяем, изменилась ли позиция
      const currentPosition = insertionPosition;
      const isPositionChanged = !currentPosition || 
        currentPosition.statusId !== statusId || 
        currentPosition.position !== insertPosition;
      
      if (isPositionChanged) {
        console.log('🎯 INSERTION POSITION CHANGED:', { 
          from: currentPosition,
          to: { statusId, position: insertPosition },
          totalProjects: statusProjects.length 
        });
        setInsertionPosition({ statusId, position: insertPosition });
      }
    } else {
      if (insertionPosition) {
        console.log('🚫 CLEARING INSERTION POSITION');
        setInsertionPosition(null);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🏁 Drag end:', {
      activeId: active.id,
      overId: over?.id,
      hasTarget: !!over
    });
    
    setActiveProject(null);
    setIsDragActive(false); // Сбрасываем флаг активного драга
    setInsertionPosition(null); // Сбрасываем позицию вставки
    
    // Сбрасываем курсор на документе
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.classList.remove('dragging-active');
    
    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const projectId = active.id as string;
    const dropTargetId = over.id as string;
    
    // Используем insertPosition из состояния если есть, иначе drop на статус целиком
    const targetStatusId = dropTargetId;
    const insertPosition = insertionPosition?.statusId === targetStatusId ? insertionPosition.position : undefined;
    
    console.log('📍 Drop details:', { 
      targetStatusId, 
      insertPosition, 
      hasInsertionState: !!insertionPosition 
    });
    
    // Найти целевой статус
    const targetStatus = statuses.find(status => String(status._id) === targetStatusId);
    if (!targetStatus) {
      console.error('❌ Target status not found:', targetStatusId);
      return;
    }

    // Найти проект
    const project = projects.find(p => p._id === projectId);
    if (!project) {
      console.error('❌ Project not found:', projectId);
      return;
    }

    // Проверить, нужно ли что-то менять
    const isSameStatus = project.statusId?._id === targetStatusId;
    const currentStatusProjects = projectsByStatus[targetStatusId] || [];
    const currentPosition = currentStatusProjects.findIndex(p => p._id === projectId);
    
    if (isSameStatus && insertPosition === undefined) {
      console.log('❌ Same status, no position specified, no change needed');
      return;
    }
    
    if (isSameStatus && insertPosition === currentPosition) {
      console.log('❌ Same position in same status, no change needed');
      return;
    }

    console.log('🔄 Moving project:', project.name, 'to status:', targetStatus.name, 'at position:', insertPosition);
    
    try {
      await handleProjectMove(projectId, targetStatusId, targetStatus.name, insertPosition);
    } catch (err) {
      console.error('❌ Ошибка перемещения проекта:', err);
      setError('Не удалось переместить проект');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#666' }}>Загрузка проектов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#d32f2f' }}>Ошибка: {error}</div>
      </div>
    );
  }

  // Рендеринг мобильной версии
  const renderMobileView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ 
        padding: '8px', 
        height: '100%', 
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'visible'
      }}>
        {/* Уведомление об ошибке */}
        {error && (
          <div style={{
            background: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#d32f2f',
            fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Выпадающее меню статусов для мобайла */}
        <div className="status-menu" style={{ marginBottom: 16, position: 'relative' }}>
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', color: '#000' }}>
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: 6, 
                  background: statuses[selectedStatusIndex]?.color || '#ccc',
                  marginRight: 8 
                }} 
              />
              <span style={{ color: '#000' }}>
                {statuses[selectedStatusIndex]?.name || 'Выберите статус'}
              </span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                background: '#e0e0e0',
                borderRadius: 12,
                padding: '2px 6px',
                fontSize: 11,
                color: '#000'
              }}>
                {projectsByStatus[statuses[selectedStatusIndex]?._id]?.length || 0}
            </span>
            <span style={{ fontSize: 12 }}>{showStatusMenu ? '▲' : '▼'}</span>
            </div>
          </button>

          {showStatusMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: Math.min(
                statuses.length * 48 + 16,
                Math.max(window.innerHeight - 280, 200)
              ),
              overflowY: statuses.length * 48 + 16 > window.innerHeight - 280 ? 'auto' : 'visible'
            }}>
              {statuses.map((status, index) => (
                <div
                  key={status._id}
                  onClick={() => {
                    setSelectedStatusIndex(index);
                    setShowStatusMenu(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: index === selectedStatusIndex ? '#f0f8ff' : 'transparent',
                    borderBottom: index < statuses.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', color: '#000' }}>
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: 6, 
                        background: status.color,
                        marginRight: 8 
                      }} 
                    />
                    <span style={{ color: '#000' }}>
                      {status.name}
                    </span>
                  </span>
                  <span style={{ 
                    background: '#e0e0e0',
                    borderRadius: 12,
                    padding: '2px 6px',
                    fontSize: 11,
                    color: '#000'
                  }}>
                    {projectsByStatus[status._id]?.length || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Одна колонка для выбранного статуса */}
        {statuses[selectedStatusIndex] && (
          <DroppableStatus 
            status={statuses[selectedStatusIndex]}
            projects={projectsByStatus[statuses[selectedStatusIndex]._id] || []}
            onProjectEdit={onProjectEdit}
            onProjectMove={handleProjectMove}
            isDesktop={false}
            isDragActive={isDragActive}
            onSetDragActive={handleSetDragActive}
            statuses={statuses}
            insertionPosition={insertionPosition}
            projectsByStatus={projectsByStatus}
            onInsertionPositionChange={setInsertionPosition}
          />
        )}
      </div>
      
      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );

  // Рендеринг десктопной версии
  const renderDesktopView = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-container" style={{ 
        padding: '0px 8px 16px 8px',
        height: '100%', 
        position: 'relative',
        minHeight: '100%',
        width: '100%',
        boxSizing: 'border-box'

      }}>
        {/* Уведомление об ошибке */}
        {error && (
          <div style={{
            background: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#d32f2f',
            fontSize: 14
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <div 
          className="kanban-board kanban-grid"
          style={{ 
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: 8,
            paddingBottom: 16,
            minHeight: '200px',
            height: '100%',
            width: '100%',
            scrollbarWidth: 'thin',
            scrollbarColor: '#c1c1c1 #f1f1f1',

          }}
        >
          {statuses.map(status => (
            <DroppableStatus 
              key={status._id}
              status={status}
              projects={projectsByStatus[status._id] || []}
              onProjectEdit={onProjectEdit}
              onProjectMove={handleProjectMove}
              isDesktop={true}
              isDragActive={isDragActive}
              onSetDragActive={handleSetDragActive}
              statuses={statuses}
              insertionPosition={insertionPosition}
              projectsByStatus={projectsByStatus}
              onInsertionPositionChange={setInsertionPosition}
            />
          ))}
        </div>
      </div>
      
      <DragOverlay>
        {activeProject ? <ProjectCard project={activeProject} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );

  // Возвращаем соответствующую версию в зависимости от размера экрана
  return (
    <>
      {isMobile ? renderMobileView() : renderDesktopView()}
      {/* CSS стили для улучшения скроллбара */}
      <style>{`
        /* Минимальные стили скроллбара */
        .kanban-board::-webkit-scrollbar {
          height: 8px;
        }
        .kanban-board::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-board::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .kanban-board::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        /* Принудительный курсор во время драга */
        body.dragging-active,
        body.dragging-active *,
        body.dragging-active *:hover {
          cursor: grabbing !important;
          user-select: none !important;
        }
        
        /* Подсветка колонки при драге */
        .kanban-column.drag-highlight {
          background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%) !important;
          transition: background 0.2s ease !important;
        }

        /* Родительский контейнер для kanban-колонок */
        .kanban-container {
          overflow: visible !important;
          padding-top: 0px !important;
          margin-top: 0px !important;
        }
        
        /* Контейнер для grid */
        .kanban-grid {
          overflow: visible !important;
        }
        
        /* Мобильные стили для видимости текста статусов */
        @media (max-width: 768px) {
          .status-menu span,
          .status-menu div,
          .kanban-column h3,
          .kanban-column span {
            color: #000 !important;
          }
          
          .status-menu button {
            color: #000 !important;
          }
          
          .status-menu div[style*="background"] {
            color: #000 !important;
          }
          
          /* Мобильные стили для полного заполнения экрана */
          body {
            overflow-x: hidden !important;
          }
          
          .kanban-column {
            width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            /* Улучшенный скролл для мобильных */
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          /* Оптимизация touch взаимодействия */
          .kanban-column > div:last-child {
            /* Область со списком карточек */
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
          }
          
          /* Карточки проектов на мобильных */
          [data-project-id] {
            /* Позволяем скролл по умолчанию, блокируем только в drag mode */
            touch-action: auto !important;
          }
          
          [data-project-id][data-drag-mode="true"] {
            /* В drag mode блокируем все touch события */
            touch-action: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default KanbanBoard; 