import React from 'react';
import { SectionKey } from '@/types/todo';
import { SectionTodoScreen } from '@/components/section-todo-screen';

export const TodoScreen: React.FC<{ sectionKey: SectionKey }> = ({ sectionKey }) => {
  return <SectionTodoScreen sectionKey={sectionKey} />;
};
