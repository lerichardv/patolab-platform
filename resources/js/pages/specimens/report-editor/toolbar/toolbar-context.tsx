import React from 'react';

export const ToolbarContext = React.createContext<{ isDictating: boolean }>({
    isDictating: false,
});
