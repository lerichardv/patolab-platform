import React from 'react';
import { getInitials } from '../utils';

export interface Collaborator {
    name: string;
    color: string;
}

interface CollaboratorsListProps {
    users: Collaborator[];
}

export function CollaboratorsList({ users }: CollaboratorsListProps) {
    if (users.length === 0) {
        return null;
    }

    const uniqueUsersMap = new Map<string, Collaborator>();
    users.forEach((u) => {
        if (u.name) {
            uniqueUsersMap.set(u.name, u);
        }
    });
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    return (
        <div className="mr-2 flex items-center -space-x-2">
            {uniqueUsers.map((user, idx) => {
                const initials = getInitials(user.name);

                return (
                    <div key={`${user.name}-${idx}`} className="group relative">
                        <div
                            className="relative flex h-8 w-8 cursor-default items-center justify-center rounded-full border-2 border-background text-[11px] font-bold text-white shadow-xs transition-all duration-200 select-none hover:z-10 hover:scale-110"
                            style={{ backgroundColor: user.color || '#3b82f6' }}
                        >
                            {initials}
                        </div>
                        {/* Custom Traditional Tooltip - Bottom Left, No Arrow */}
                        <div className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 hidden rounded-md border border-slate-800/80 bg-slate-900 px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-md select-none group-hover:block">
                            {user.name}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default CollaboratorsList;
