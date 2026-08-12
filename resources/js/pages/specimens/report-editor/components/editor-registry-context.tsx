import React from 'react';

export const EditorRegistryContext = React.createContext<{
    registerEditor: (field: string, editor: any) => void;
} | null>(null);
